CREATE OR REPLACE FUNCTION public.generate_do_number()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE
  v_do_number TEXT;
BEGIN
  -- If do_number is already provided, do nothing
  IF NEW.do_number IS NOT NULL AND TRIM(NEW.do_number) != '' THEN
    RETURN NEW;
  END IF;

  -- If linked to a scheduling_request, try to get DO number from there
  IF NEW.scheduling_request_id IS NOT NULL THEN
    SELECT do_number INTO v_do_number
    FROM public.scheduling_requests
    WHERE id = NEW.scheduling_request_id;

    IF v_do_number IS NOT NULL THEN
      NEW.do_number := v_do_number;
      RETURN NEW;
    END IF;
  END IF;

  -- If not linked or linked request has no DO number, generate a new one using the sequence
  NEW.do_number := 'DO/' || to_char(NOW(), 'YYYY/MM/') || LPAD(nextval('do_number_seq')::text, 4, '0');

  RETURN NEW;
END;
$$;