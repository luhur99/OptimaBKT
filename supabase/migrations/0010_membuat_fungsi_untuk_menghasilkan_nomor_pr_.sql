CREATE OR REPLACE FUNCTION public.generate_pr_number()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
AS $$
DECLARE
  v_date_str TEXT;
  v_sequence INT;
  v_pr_number TEXT;
BEGIN
  IF NEW.pr_number IS NULL OR TRIM(NEW.pr_number) = '' THEN
    v_date_str := to_char(COALESCE(NEW.created_at, NOW()), 'YYYYMMDD');

    SELECT COALESCE(MAX(CAST(SUBSTRING(pr_number FROM 12) AS INT)), 0) + 1
    INTO v_sequence
    FROM public.purchase_requests
    WHERE pr_number LIKE 'PR-' || v_date_str || '-%';

    v_pr_number := 'PR-' || v_date_str || '-' || LPAD(v_sequence::TEXT, 4, '0');
    NEW.pr_number := v_pr_number;
  END IF;
  RETURN NEW;
END;
$$;