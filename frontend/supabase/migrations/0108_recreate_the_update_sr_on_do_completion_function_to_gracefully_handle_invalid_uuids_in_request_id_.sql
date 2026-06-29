CREATE OR REPLACE FUNCTION public.update_sr_on_do_completion()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_request_uuid UUID;
BEGIN
  -- Hanya lanjutkan jika status delivery_order berubah menjadi 'completed'
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
    -- Perbarui status scheduling_request yang terkait menjadi 'completed'
    -- Only attempt to update if request_id is not NULL
    IF NEW.request_id IS NOT NULL THEN
      BEGIN
        -- Attempt to cast request_id to UUID
        v_request_uuid := NEW.request_id::UUID;

        UPDATE public.scheduling_requests
        SET status = 'completed'
        WHERE id = v_request_uuid
        AND status IS DISTINCT FROM 'completed'; -- Hanya update jika belum 'completed'
      EXCEPTION
        WHEN invalid_text_representation THEN
          RAISE WARNING 'Skipping update for scheduling_request due to invalid UUID format in delivery_orders.request_id: %', NEW.request_id;
          -- This warning will appear in your Supabase logs.
      END;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;