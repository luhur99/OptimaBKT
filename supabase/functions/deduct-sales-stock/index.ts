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

    if (profileError || (profile?.role !== 'SUPER_ADMIN' && profile?.role !== 'OPERASIONAL_DIV' && profile?.role !== 'ACCOUNTING')) {
      return new Response(JSON.stringify({ error: 'Forbidden: Only SUPER_ADMIN, OPERASIONAL_DIV, or ACCOUNTING can deduct stock for sales.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { invoice_id } = await req.json();

    if (!invoice_id) {
      return new Response(JSON.stringify({ error: 'Missing required field: invoice_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch invoice details and check stock_deducted flag
    const { data: invoice, error: invoiceError } = await supabaseAdminClient
      .from('invoices')
      .select('stock_deducted')
      .eq('id', invoice_id)
      .single();

    if (invoiceError) {
      throw new Error(invoiceError.message);
    }

    if (invoice?.stock_deducted) {
      return new Response(JSON.stringify({ message: 'Stock already deducted for this invoice.' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch invoice items
    const { data: invoiceItems, error: itemsError } = await supabaseAdminClient
      .from('invoice_items')
      .select(`
        product_id,
        quantity
      `)
      .eq('invoice_id', invoice_id);

    if (itemsError) {
      throw new Error(itemsError.message);
    }

    if (!invoiceItems || invoiceItems.length === 0) {
      return new Response(JSON.stringify({ error: 'No items found for this invoice.' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Process each item for stock deduction
    for (const item of invoiceItems) {
      const productId = item.product_id;
      const quantityToDeduct = item.quantity;
      // ALWAYS deduct from 'siap_jual' warehouse for sales
      const fromWarehouseCategory = 'siap_jual'; 

      // Check available stock
      const { data: inventory, error: inventoryError } = await supabaseAdminClient
        .from('warehouse_inventories')
        .select('quantity')
        .eq('product_id', productId)
        .eq('warehouse_category', fromWarehouseCategory)
        .single();

      if (inventoryError && inventoryError.code !== 'PGRST116') { // PGRST116 means "no rows found"
        throw new Error(inventoryError.message);
      }

      const availableQuantity = inventory?.quantity || 0;

      if (availableQuantity < quantityToDeduct) {
        throw new Response(JSON.stringify({ error: `Insufficient stock for product ${productId} in ${fromWarehouseCategory}. Available: ${availableQuantity}, Requested: ${quantityToDeduct}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Deduct stock
      const { error: deductError } = await supabaseAdminClient
        .from('warehouse_inventories')
        .update({ quantity: availableQuantity - quantityToDeduct, updated_at: new Date().toISOString() })
        .eq('product_id', productId)
        .eq('warehouse_category', fromWarehouseCategory);

      if (deductError) {
        throw new Error(deductError.message);
      }

      // Record in stock_ledger
      const { error: ledgerError } = await supabaseAdminClient
        .from('stock_ledger')
        .insert({
          user_id: user.id,
          product_id: productId,
          event_type: 'SALES_OUT',
          quantity: quantityToDeduct,
          from_warehouse_category: fromWarehouseCategory,
          notes: `Sales deduction for invoice ${invoice_id}`,
          event_date: new Date().toISOString().split('T')[0],
        });

      if (ledgerError) {
        // Simplified rollback: if ledger fails, try to re-add stock
        await supabaseAdminClient
          .from('warehouse_inventories')
          .update({ quantity: availableQuantity, updated_at: new Date().toISOString() })
          .eq('product_id', productId)
          .eq('warehouse_category', fromWarehouseCategory);
        throw new Error(ledgerError.message);
      }
    }

    // Mark invoice as stock_deducted
    const { error: updateInvoiceFlagError } = await supabaseAdminClient
      .from('invoices')
      .update({ stock_deducted: true, updated_at: new Date().toISOString() })
      .eq('id', invoice_id);

    if (updateInvoiceFlagError) {
      throw new Error(updateInvoiceFlagError.message);
    }

    return new Response(JSON.stringify({ message: 'Stock deducted successfully for invoice.' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error deducting sales stock:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});