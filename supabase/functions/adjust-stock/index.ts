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

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      global: {
        headers: { Authorization: authHeader },
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
      return new Response(JSON.stringify({ error: 'Forbidden: Only SUPER_ADMIN or OPERASIONAL_DIV can adjust stock.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { product_id, warehouse_category, adjustment_type, quantity, notes } = await req.json();

    if (!product_id || !warehouse_category || !adjustment_type || !quantity || quantity <= 0 || !notes) {
      return new Response(JSON.stringify({ error: 'Missing or invalid required fields: product_id, warehouse_category, adjustment_type, quantity (must be > 0), notes' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch current stock in the specified warehouse
    const { data: currentInventory, error: inventoryError } = await supabaseAdminClient
      .from('warehouse_inventories')
      .select('quantity')
      .eq('product_id', product_id)
      .eq('warehouse_category', warehouse_category)
      .single();

    if (inventoryError && inventoryError.code !== 'PGRST116') { // PGRST116 means "no rows found"
      throw new Error(inventoryError.message);
    }

    const availableQuantity = currentInventory?.quantity || 0;
    let newQuantity = availableQuantity;

    if (adjustment_type === 'add') {
      newQuantity += quantity;
    } else if (adjustment_type === 'deduct') {
      if (availableQuantity < quantity) {
        return new Response(JSON.stringify({ error: `Insufficient stock in ${warehouse_category}. Available: ${availableQuantity}, Attempted to deduct: ${quantity}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      newQuantity -= quantity;
    } else {
      return new Response(JSON.stringify({ error: 'Invalid adjustment_type. Must be "add" or "deduct".' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update warehouse_inventories (upsert to handle cases where product-warehouse combo didn't exist for 'add')
    const { error: upsertError } = await supabaseAdminClient
      .from('warehouse_inventories')
      .upsert(
        {
          product_id: product_id,
          warehouse_category: warehouse_category,
          quantity: newQuantity,
          user_id: user.id,
          created_at: new Date().toISOString(), // Ensure created_at is set on insert
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'product_id, warehouse_category',
          ignoreDuplicates: false,
        }
      );

    if (upsertError) {
      throw new Error(upsertError.message);
    }

    // Record stock movement in stock_ledger
    const { error: ledgerError } = await supabaseAdminClient
      .from('stock_ledger')
      .insert({
        user_id: user.id,
        product_id: product_id,
        event_type: 'ADJUSTMENT',
        quantity: quantity,
        from_warehouse_category: adjustment_type === 'deduct' ? warehouse_category : null,
        to_warehouse_category: adjustment_type === 'add' ? warehouse_category : null,
        notes: notes,
        event_date: new Date().toISOString().split('T')[0],
      });

    if (ledgerError) {
      // Simplified rollback: if ledger fails, attempt to revert inventory change
      const rollbackQuantity = adjustment_type === 'add' ? availableQuantity : availableQuantity - quantity;
      await supabaseAdminClient
        .from('warehouse_inventories')
        .update({ quantity: rollbackQuantity, updated_at: new Date().toISOString() })
        .eq('product_id', product_id)
        .eq('warehouse_category', warehouse_category);
      throw new Error(ledgerError.message);
    }

    return new Response(JSON.stringify({ message: 'Stock adjusted successfully' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error adjusting stock:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});