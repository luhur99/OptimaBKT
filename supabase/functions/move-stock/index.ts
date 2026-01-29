import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      global: {
        headers: { Authorization: req.headers.get('Authorization')! },
      },
    }
  );

  const supabaseAdminClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: profile, error: profileError } = await supabaseAdminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || (profile?.role !== 'SUPER_ADMIN' && profile?.role !== 'OPERASIONAL_DIV')) {
      return new Response(JSON.stringify({ error: 'Forbidden: Only SUPER_ADMIN or OPERASIONAL_DIV can move stock.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { product_id, from_warehouse_category, to_warehouse_category, quantity } = await req.json();

    if (!product_id || !from_warehouse_category || !to_warehouse_category || !quantity || quantity <= 0) {
      return new Response(JSON.stringify({ error: 'Missing or invalid required fields: product_id, from_warehouse_category, to_warehouse_category, quantity (must be > 0)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (from_warehouse_category === to_warehouse_category) {
      return new Response(JSON.stringify({ error: 'Cannot move stock to the same warehouse category.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check available stock in the source warehouse
    const { data: sourceInventory, error: sourceError } = await supabaseAdminClient
      .from('warehouse_inventories')
      .select('quantity')
      .eq('product_id', product_id)
      .eq('warehouse_category', from_warehouse_category)
      .single();

    if (sourceError && sourceError.code !== 'PGRST116') { // PGRST116 means "no rows found"
      throw new Error(sourceError.message);
    }

    const availableQuantity = sourceInventory?.quantity || 0;

    if (availableQuantity < quantity) {
      return new Response(JSON.stringify({ error: `Insufficient stock in ${from_warehouse_category}. Available: ${availableQuantity}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Decrement stock from source warehouse
    const { error: decrementError } = await supabaseAdminClient
      .from('warehouse_inventories')
      .update({ quantity: availableQuantity - quantity, updated_at: new Date().toISOString() })
      .eq('product_id', product_id)
      .eq('warehouse_category', from_warehouse_category);

    if (decrementError) {
      throw new Error(decrementError.message);
    }

    // Increment stock in target warehouse (or insert if it doesn't exist)
    const { error: upsertError } = await supabaseAdminClient
      .from('warehouse_inventories')
      .upsert(
        {
          product_id: product_id,
          warehouse_category: to_warehouse_category,
          quantity: quantity,
          user_id: user.id, // Assign to the user performing the action
          created_at: new Date().toISOString(), // Ensure created_at is set on insert
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'product_id, warehouse_category',
          ignoreDuplicates: false,
        }
      );

    if (upsertError) {
      // If upsert fails, attempt to rollback the decrement
      await supabaseAdminClient
        .from('warehouse_inventories')
        .update({ quantity: availableQuantity, updated_at: new Date().toISOString() })
        .eq('product_id', product_id)
        .eq('warehouse_category', from_warehouse_category); 

      throw new Error(upsertError.message);
    }

    // Record stock movement in stock_ledger
    const { error: ledgerError } = await supabaseAdminClient
      .from('stock_ledger')
      .insert({
        user_id: user.id,
        product_id: product_id,
        event_type: 'STOCK_TRANSFER',
        quantity: quantity,
        from_warehouse_category: from_warehouse_category,
        to_warehouse_category: to_warehouse_category,
        notes: `Stock transfer from ${from_warehouse_category} to ${to_warehouse_category}`,
        event_date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
      });

    if (ledgerError) {
      // If ledger insert fails, attempt to rollback previous changes
      // This is a simplified rollback. In a real system, you'd want a more robust transaction.
      // For now, we'll just re-increment the source and decrement the target.
      await supabaseAdminClient
        .from('warehouse_inventories')
        .update({ quantity: availableQuantity, updated_at: new Date().toISOString() })
        .eq('product_id', product_id)
        .eq('warehouse_category', from_warehouse_category);

      const { data: targetInventoryAfterUpsert } = await supabaseAdminClient
        .from('warehouse_inventories')
        .select('quantity')
        .eq('product_id', product_id)
        .eq('warehouse_category', to_warehouse_category)
        .single();

      if (targetInventoryAfterUpsert) {
        await supabaseAdminClient
          .from('warehouse_inventories')
          .update({ quantity: targetInventoryAfterUpsert.quantity - quantity, updated_at: new Date().toISOString() })
          .eq('product_id', product_id)
          .eq('warehouse_category', to_warehouse_category);
      }

      throw new Error(ledgerError.message);
    }

    return new Response(JSON.stringify({ message: 'Stock moved successfully' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error moving stock:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});