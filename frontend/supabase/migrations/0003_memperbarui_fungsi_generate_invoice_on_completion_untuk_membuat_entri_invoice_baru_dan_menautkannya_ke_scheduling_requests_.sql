CREATE OR REPLACE FUNCTION public.generate_invoice_on_completion()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    new_invoice_uuid UUID;
BEGIN
    -- Jika status berubah menjadi 'completed' dan invoice_id masih kosong
    IF NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.invoice_id IS NULL THEN
        -- 1. Buat entri baru di tabel invoices
        INSERT INTO public.invoices (
            user_id,
            invoice_date,
            customer_name,
            total_amount,
            payment_status,
            invoice_status,
            type,
            do_number
        ) VALUES (
            NEW.user_id,
            NOW(), -- Tanggal invoice adalah tanggal saat ini
            NEW.customer_name,
            0,     -- Jumlah total awal adalah 0, akan diperbarui saat item ditambahkan
            'pending',
            'DRAFT', -- Atur status invoice ke DRAFT
            'sales',
            NEW.do_number
        )
        RETURNING id INTO new_invoice_uuid; -- Ambil UUID dari invoice yang baru dibuat

        -- 2. Update scheduling_requests dengan invoice_id (UUID) dan invoice_status yang baru
        NEW.invoice_id := new_invoice_uuid;
        NEW.invoice_status := 'DRAFT'; -- Update scheduling_requests.invoice_status
    END IF;
    RETURN NEW;
END;
$$;