CREATE OR REPLACE FUNCTION public.fn_add_po_to_inventory()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  po_item RECORD;
  v_target_warehouse_category TEXT;
  v_pr_id UUID;
BEGIN
  -- Hanya lanjutkan jika status berubah menjadi 'CLOSED'
  IF NEW.status = 'CLOSED' AND OLD.status IS DISTINCT FROM 'CLOSED' THEN
    -- Dapatkan pr_id dari salah satu po_items yang terkait dengan PO ini
    SELECT pr_id INTO v_pr_id FROM public.po_items WHERE po_id = NEW.id LIMIT 1;

    IF v_pr_id IS NOT NULL THEN
        -- Dapatkan target_warehouse_category dari purchase_request asli
        SELECT target_warehouse_category INTO v_target_warehouse_category
        FROM public.purchase_requests
        WHERE id = v_pr_id;
    END IF;

    -- Set default to 'siap_jual' if target_warehouse_category is NULL
    IF v_target_warehouse_category IS NULL THEN
        v_target_warehouse_category := 'siap_jual';
    END IF;

    FOR po_item IN
      SELECT
        pi.product_id,
        pi.qty_received,
        pr.user_id -- User yang memulai PR
      FROM public.po_items pi
      JOIN public.purchase_requests pr ON pi.pr_id = pr.id
      WHERE pi.po_id = NEW.id AND pi.qty_received > 0
    LOOP
      -- Perbarui warehouse_inventories
      INSERT INTO public.warehouse_inventories (product_id, warehouse_category, quantity, user_id)
      VALUES (po_item.product_id, v_target_warehouse_category, po_item.qty_received, po_item.user_id)
      ON CONFLICT (product_id, warehouse_category) DO UPDATE
      SET quantity = public.warehouse_inventories.quantity + EXCLUDED.quantity,
          updated_at = NOW();

      -- Masukkan ke stock_ledger
      INSERT INTO public.stock_ledger (
        user_id,
        product_id,
        event_type,
        quantity,
        to_warehouse_category,
        notes,
        event_date
      ) VALUES (
        po_item.user_id,
        po_item.product_id,
        'PO_RECEIPT'::stock_event_type,
        po_item.qty_received,
        v_target_warehouse_category,
        'Received from PO ' || NEW.po_number,
        NOW()
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$function$;