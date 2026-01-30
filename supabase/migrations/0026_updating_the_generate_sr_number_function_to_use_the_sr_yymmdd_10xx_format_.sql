CREATE OR REPLACE FUNCTION public.generate_sr_number()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
AS $$
DECLARE
  v_date_str TEXT;
  v_sequence INT;
  v_sr_number TEXT;
BEGIN
  -- Only generate if not provided or is empty
  IF NEW.sr_number IS NULL OR TRIM(NEW.sr_number) = '' THEN
    -- Format date as YYMMDD
    v_date_str := to_char(COALESCE(NEW.created_at, NOW()), 'YYMMDD');

    -- Find max sequence for this date, starting from 1000 if no previous entries
    SELECT COALESCE(MAX(CAST(SUBSTRING(sr_number FROM 11) AS INT)), 1000) + 1
    INTO v_sequence
    FROM public.scheduling_requests
    WHERE sr_number LIKE 'SR-' || v_date_str || '-%';

    -- Construct the SR number with 4-digit padded sequence
    v_sr_number := 'SR-' || v_date_str || '-' || LPAD(v_sequence::TEXT, 4, '0');
    NEW.sr_number := v_sr_number;
  END IF;
  RETURN NEW;
END;
$$;