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
      return new Response(JSON.stringify({ error: 'Forbidden: Only SUPER_ADMIN or OPERASIONAL_DIV can confirm PO arrival.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { po_id, items_received } = await req.json();

    if (!po_id || !Array.isArray(items_received) || items_received.length === 0) {
      return new Response(JSON.stringify({ error: 'Missing or invalid required fields: po_id, items_received (array of { po_item_id, qty_received })' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    for (const item of items_received) {
      const { po_item_id, qty_received } = item;

      if (qty_received < 0) {
        return new Response(JSON.stringify({ error: `Invalid quantity received for item ${po_item_id}. Must be non-negative.` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Fetch current po_item to check qty_request and existing qty_received
      const { data: existingPoItem, error: fetchItemError } = await supabaseAdminClient
        .from('po_items')
        .select('qty_request, qty_received')
        .eq('id', po_item_id)
        .eq('po_id', po_id)
        .single();

      if (fetchItemError || !existingPoItem) {
        throw new Error(`PO Item ${po_item_id} not found or does not belong to PO ${po_id}.`);
      }

      const newQtyReceived = existingPoItem.qty_received + qty_received;

      if (newQtyReceived > existingPoItem.qty_request) {
        return new Response(JSON.stringify({ error: `Received quantity for item ${po_item_id} exceeds requested quantity.` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Update po_item
      const { error: updateItemError } = await supabaseAdminClient
        .from('po_items')
        .update({ qty_received: newQtyReceived })
        .eq('id', po_item_id);

      if (updateItemError) {
        throw new Error(updateItemError.message);
      }
    }

    // After updating individual items, check the overall status of the PO
    const { data: allPoItems, error: fetchAllItemsError } = await supabaseAdminClient
      .from('po_items')
      .select('qty_request, qty_received')
      .eq('po_id', po_id);

    if (fetchAllItemsError) {
      throw new Error(fetchAllItemsError.message);
    }

    let allItemsFullyReceived = true;
    let anyItemsReceivedOverall = false;

    if (allPoItems && allPoItems.length > 0) {
      for (const item of allPoItems) {
        if (item.qty_received < item.qty_request) {
          allItemsFullyReceived = false;
        }
        if (item.qty_received > 0) {
          anyItemsReceivedOverall = true;
        }
      }
    } else {
      // If there are no items, the PO cannot be closed or received
      allItemsFullyReceived = false;
      anyItemsReceivedOverall = false;
    }

    // Determine new PO status based on overall item status
    let newPoStatus: 'WAITING_RECEIVED' | 'RECEIVED' | 'CLOSED' = 'WAITING_RECEIVED';
    if (allItemsFullyReceived && anyItemsReceivedOverall) {
      newPoStatus = 'CLOSED'; // All items received, PO is closed
    } else if (anyItemsReceivedOverall) {
      newPoStatus = 'RECEIVED'; // Some items received, but not all
    } else {
      newPoStatus = 'WAITING_RECEIVED'; // No items received yet
    }

    // Update purchase_order status
    const { error: updatePoError } = await supabaseAdminClient
      .from('purchase_orders')
      .update({ status: newPoStatus })
      .eq('id', po_id);

    if (updatePoError) {
      throw new Error(updatePoError.message);
    }

    return new Response(JSON.stringify({ message: `Purchase Order ${po_id} status updated to ${newPoStatus}.` }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error confirming PO arrival:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});