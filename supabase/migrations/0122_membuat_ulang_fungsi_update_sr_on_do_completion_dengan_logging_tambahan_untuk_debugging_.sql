CREATE OR REPLACE FUNCTION public.update_sr_on_do_completion()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_request_uuid UUID;
  v_current_sr_status public.scheduling_request_status; -- To store current SR status
BEGIN
  RAISE NOTICE 'update_sr_on_do_completion triggered for DO ID: %', NEW.id;
  RAISE NOTICE 'DO status: OLD=% NEW=%', OLD.status, NEW.status;

  -- Hanya lanjutkan jika status delivery_order berubah menjadi 'completed'
  IF NEW.status = 'completed'::public.delivery_order_status AND OLD.status IS DISTINCT FROM 'completed'::public.delivery_order_status THEN
    RAISE NOTICE 'DO status changed to completed. Processing SR update.';

    -- Perbarui status scheduling_request yang terkait menjadi 'completed'
    -- Only attempt to update if request_id is not NULL
    IF NEW.request_id IS NOT NULL THEN
      BEGIN
        -- Attempt to cast request_id to UUID
        v_request_uuid := NEW.request_id::UUID;
        RAISE NOTICE 'Attempting to update SR with ID: %', v_request_uuid;

        -- Get current SR status before update
        SELECT status INTO v_current_sr_status FROM public.scheduling_requests WHERE id = v_request_uuid;
        RAISE NOTICE 'Current SR status for % is: %', v_request_uuid, v_current_sr_status;

        UPDATE public.scheduling_requests
        SET status = 'completed'::public.scheduling_request_status
        WHERE id = v_request_uuid
        AND status IS DISTINCT FROM 'completed'::public.scheduling_request_status; -- Hanya update jika belum 'completed'

        IF FOUND THEN
          RAISE NOTICE 'Scheduling request % status updated to COMPLETED.', v_request_uuid;
        ELSE
          RAISE NOTICE 'Scheduling request % was already COMPLETED or not found/matched.', v_request_uuid;
        END IF;

      EXCEPTION
        WHEN invalid_text_representation THEN
          RAISE WARNING 'Skipping update for scheduling_request due to invalid UUID format in delivery_orders.request_id: %', NEW.request_id;
          -- This warning will appear in your Supabase logs.
        WHEN NO_DATA_FOUND THEN
          RAISE WARNING 'Scheduling request with ID % not found when trying to update status.', v_request_uuid;
      END;
    ELSE
      RAISE NOTICE 'NEW.request_id is NULL. Skipping SR update.';
    END IF;
  ELSE
    RAISE NOTICE 'DO status did not change to completed. Skipping SR update.';
  END IF;
  RETURN NEW;
END;
$$;