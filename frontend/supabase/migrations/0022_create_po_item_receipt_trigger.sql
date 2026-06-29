-- New function to handle stock addition and ledger entry for individual PO items upon receipt
CREATE OR REPLACE FUNCTION public.fn_handle_po_item_receipt()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  delta_qty INT;
  v_target_warehouse_category TEXT;
  v_user_id UUID;
  v_po_number TEXT;
BEGIN
  -- Calculate the difference in received quantity
  delta_qty := NEW.qty_received - OLD.qty_received;

  -- Only proceed if there's a positive increase in received quantity
  IF delta_qty > 0 THEN
    -- Get user_id from the associated purchase_order (requested_by)
    SELECT requested_by, po_number INTO v_user_id, v_po_number
    FROM public.purchase_orders
    WHERE id = NEW.po_id;

    -- Get target_warehouse_category from the associated purchase_request
    SELECT target_warehouse_category INTO v_target_warehouse_category
    FROM public.purchase_requests
    WHERE id = NEW.pr_id;

    -- Set default to 'siap_jual' if target_warehouse_category is NULL
    IF v_target_warehouse_category IS NULL THEN
        v_target_warehouse_category := 'siap_jual';
    END IF;

    -- Update warehouse_inventories: increment quantity for the product in the target warehouse
    INSERT INTO public.warehouse_inventories (product_id, warehouse_category, quantity, user_id)
    VALUES (NEW.product_id, v_target_warehouse_category, delta_qty, v_user_id)
    ON CONFLICT (product_id, warehouse_category) DO UPDATE
    SET quantity = public.warehouse_inventories.quantity + EXCLUDED.quantity,
        updated_at = NOW();

    -- Insert into stock_ledger: record the stock receipt event
    INSERT INTO public.stock_ledger (
      user_id,
      product_id,
      event_type,
      quantity,
      to_warehouse_category,
      notes,
      event_date
    ) VALUES (
      v_user_id,
      NEW.product_id,
      'PO_RECEIPT'::stock_event_type,
      delta_qty,
      v_target_warehouse_category,
      'Received ' || delta_qty || ' units for PO ' || v_po_number || ' (Item: ' || NEW.id || ')',
      NOW()
    );

    -- Update products.stok_sekarang: increment the current stock for the product
    UPDATE public.products
    SET stok_sekarang = COALESCE(stok_sekarang, 0) + delta_qty,
        updated_at = NOW()
    WHERE id = NEW.product_id;

  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for the new function: fires AFTER UPDATE of qty_received on po_items
DROP TRIGGER IF EXISTS tr_handle_po_item_receipt ON public.po_items;
CREATE TRIGGER tr_handle_po_item_receipt
AFTER UPDATE OF qty_received ON public.po_items
FOR EACH ROW
WHEN (NEW.qty_received IS DISTINCT FROM OLD.qty_received AND NEW.qty_received > OLD.qty_received)
EXECUTE FUNCTION public.fn_handle_po_item_receipt();