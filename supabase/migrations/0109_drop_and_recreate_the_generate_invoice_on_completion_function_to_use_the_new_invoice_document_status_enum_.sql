-- Drop the existing trigger first to allow function recreation
DROP TRIGGER IF EXISTS on_scheduling_request_completed_generate_invoice ON public.scheduling_requests;

-- Drop the existing function
DROP FUNCTION IF EXISTS public.generate_invoice_on_completion();

-- Recreate the function with the correct enum type
CREATE OR REPLACE FUNCTION public.generate_invoice_on_completion()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
            0,     -- Jumlah total awal adalah 0, akan diperbarui saat item ditambahkan
            'pending', -- Payment status is pending by default
            'DRAFT'::public.invoice_document_status, -- Set invoice_status to DRAFT using the new enum
            'sales',
            NEW.do_number
        )
        ON CONFLICT (do_number) DO NOTHING -- Prevent duplicate invoices for the same DO
        RETURNING id INTO new_invoice_uuid; -- Ambil UUID dari invoice yang baru dibuat

        -- Only update scheduling_requests if a new invoice was actually created
        IF new_invoice_uuid IS NOT NULL THEN
            -- 2. Update scheduling_requests dengan invoice_id (UUID) dan invoice_status yang baru
            NEW.invoice_id := new_invoice_uuid;
            NEW.invoice_status := 'DRAFT'::public.invoice_document_status; -- Update scheduling_requests.invoice_status to DRAFT
        END IF;
    END IF;
    RETURN NEW;
END;
$function$;

-- Recreate the trigger
CREATE TRIGGER on_scheduling_request_completed_generate_invoice
AFTER UPDATE OF status ON public.scheduling_requests
FOR EACH ROW
WHEN (NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' AND NEW.invoice_id IS NULL)
EXECUTE FUNCTION public.generate_invoice_on_completion();