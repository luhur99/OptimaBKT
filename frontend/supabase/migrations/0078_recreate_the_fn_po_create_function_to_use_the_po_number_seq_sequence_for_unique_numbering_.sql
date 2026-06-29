CREATE OR REPLACE FUNCTION public.fn_po_create()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_po_id UUID;
  v_po_number TEXT;
  v_date_str TEXT;
  v_sequence INT;
  v_total_biaya NUMERIC := 0;
BEGIN
  -- Only proceed if status changes to 'approved'
  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved' THEN
    -- Generate PO Number using a sequence
    v_date_str := to_char(NOW(), 'YYYYMMDD');
    SELECT nextval('po_number_seq') INTO v_sequence; -- Use the sequence directly

    -- Construct the PO number with 4-digit padded sequence
    v_po_number := 'PO-' || v_date_str || '-' || LPAD(v_sequence::TEXT, 4, '0');

    -- Calculate total_biaya from po_items associated with this PR
    SELECT COALESCE(SUM(pi.subtotal), 0)
    INTO v_total_biaya
    FROM public.po_items pi
    WHERE pi.pr_id = NEW.id;

    -- Create new Purchase Order
    INSERT INTO public.purchase_orders (
      po_number,
      requested_by,
      supplier_id,
      status,
      total_biaya,
      created_at
    ) VALUES (
      v_po_number,
      NEW.user_id,
      NEW.supplier_id,
      'WAITING_RECEIVED'::po_status,
      v_total_biaya,
      NOW()
    )
    RETURNING id INTO v_po_id;

    -- Update po_items to link them with the new Purchase Order
    UPDATE public.po_items
    SET po_id = v_po_id
    WHERE pr_id = NEW.id;

    -- Update po_number column in purchase_requests for reference
    NEW.po_number := v_po_number;
  END IF;
  RETURN NEW;
END;
$function$;