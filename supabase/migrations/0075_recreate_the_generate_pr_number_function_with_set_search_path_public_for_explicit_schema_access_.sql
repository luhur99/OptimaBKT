CREATE OR REPLACE FUNCTION public.generate_pr_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_date_str TEXT;
  v_sequence INT;
  v_pr_number TEXT;
BEGIN
  -- Only generate if not provided or is empty
  IF NEW.pr_number IS NULL OR TRIM(NEW.pr_number) = '' THEN
    -- Format date as YYYYMMDD
    v_date_str := to_char(COALESCE(NEW.created_at, NOW()), 'YYYYMMDD');

    -- Get the next value from the sequence
    SELECT nextval('pr_number_seq') INTO v_sequence;

    -- Construct the PR number with 4-digit padded sequence
    v_pr_number := 'PR-' || v_date_str || '-' || LPAD(v_sequence::TEXT, 4, '0');
    NEW.pr_number := v_pr_number;
  END IF;
  RETURN NEW;
END;
$function$;