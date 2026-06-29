CREATE OR REPLACE FUNCTION public.update_sr_on_do_completion()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Hanya lanjutkan jika status delivery_order berubah menjadi 'completed'
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
    -- Perbarui status scheduling_request yang terkait menjadi 'completed'
    UPDATE public.scheduling_requests
    SET status = 'completed'
    WHERE id = NEW.request_id
    AND status IS DISTINCT FROM 'completed'; -- Hanya update jika belum 'completed'
  END IF;
  RETURN NEW;
END;
$$;