CREATE OR REPLACE FUNCTION public.generate_invoice_on_completion()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_invoice_id UUID;
    v_existing_invoice_status public.invoice_document_status;
    v_scheduling_request_id UUID;
    v_scheduling_request_user_id UUID;
    v_scheduling_request_customer_name TEXT;
    v_scheduling_request_do_number TEXT;
BEGIN
    -- Hanya lanjutkan jika status delivery_order berubah menjadi 'completed'
    IF NEW.status = 'completed'::public.delivery_order_status AND OLD.status IS DISTINCT FROM 'completed'::public.delivery_order_status THEN
        -- Dapatkan detail scheduling_request yang terkait
        SELECT id, user_id, customer_name, do_number
        INTO v_scheduling_request_id, v_scheduling_request_user_id, v_scheduling_request_customer_name, v_scheduling_request_do_number
        FROM public.scheduling_requests
        WHERE id = NEW.request_id;

        IF v_scheduling_request_id IS NULL THEN
            RAISE WARNING 'Scheduling request with ID % not found for Delivery Order %', NEW.request_id, NEW.do_number;
            RETURN NEW;
        END IF;

        -- 1. Coba cari invoice yang sudah ada dengan do_number yang sama
        SELECT id, invoice_status INTO v_invoice_id, v_existing_invoice_status
        FROM public.invoices
        WHERE do_number = NEW.do_number;

        IF v_invoice_id IS NOT NULL THEN
            -- Jika invoice sudah ada, gunakan ID-nya dan pastikan statusnya DRAFT atau PENDING
            -- Update scheduling_requests dengan invoice_id (UUID) dan invoice_status yang sudah ada
            UPDATE public.scheduling_requests
            SET invoice_id = v_invoice_id,
                invoice_status = v_existing_invoice_status
            WHERE id = v_scheduling_request_id;
        ELSE
            -- Jika invoice belum ada, buat entri baru di tabel invoices
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
                v_scheduling_request_user_id, -- Use user_id from scheduling_request
                NOW(), -- Tanggal invoice adalah tanggal saat ini
                v_scheduling_request_customer_name, -- Use customer_name from scheduling_request
                0,     -- Jumlah total awal adalah 0, akan diperbarui saat item ditambahkan
                'pending', -- Payment status is pending by default
                'DRAFT'::public.invoice_document_status, -- Set invoice_status to DRAFT using the new enum
                'sales',
                v_scheduling_request_do_number -- Use do_number from scheduling_request
            )
            RETURNING id INTO v_invoice_id; -- Ambil UUID dari invoice yang baru dibuat

            -- Update scheduling_requests dengan invoice_id (UUID) dan invoice_status yang baru
            UPDATE public.scheduling_requests
            SET invoice_id = v_invoice_id,
                invoice_status = 'DRAFT'::public.invoice_document_status
            WHERE id = v_scheduling_request_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$function$;