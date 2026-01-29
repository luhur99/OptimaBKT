CREATE OR REPLACE FUNCTION public.fn_po_create()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_po_id UUID;
  v_po_number TEXT;
  v_date_str TEXT;
  v_sequence INT;
  v_total_biaya NUMERIC := 0;
BEGIN
  -- Hanya lanjutkan jika status berubah dari non-approved menjadi approved
  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved' THEN
    -- Generate PO Number
    v_date_str := to_char(NOW(), 'YYYYMMDD');
    SELECT COALESCE(MAX(CAST(SUBSTRING(po_number FROM 12) AS INT)), 0) + 1
    INTO v_sequence
    FROM public.purchase_orders
    WHERE po_number LIKE 'PO-' || v_date_str || '-%';

    v_po_number := 'PO-' || v_date_str || '-' || LPAD(v_sequence::TEXT, 4, '0');

    -- Hitung total_biaya dari po_items yang terkait dengan PR ini
    SELECT COALESCE(SUM(pi.subtotal), 0)
    INTO v_total_biaya
    FROM public.po_items pi
    WHERE pi.pr_id = NEW.id;

    -- Buat Purchase Order baru
    INSERT INTO public.purchase_orders (
      po_number,
      requested_by,
      supplier_id,
      status,
      total_biaya,
      created_at
    ) VALUES (
      v_po_number,
      NEW.user_id, -- Mengasumsikan user_id dari purchase_requests adalah requested_by
      NEW.supplier_id,
      'WAITING_RECEIVED'::po_status,
      v_total_biaya,
      NOW()
    )
    RETURNING id INTO v_po_id;

    -- Perbarui po_items untuk menghubungkannya dengan Purchase Order baru
    UPDATE public.po_items
    SET po_id = v_po_id
    WHERE pr_id = NEW.id;

    -- Perbarui kolom po_number di purchase_requests untuk referensi
    NEW.po_number := v_po_number;
  END IF;
  RETURN NEW;
END;
$$;