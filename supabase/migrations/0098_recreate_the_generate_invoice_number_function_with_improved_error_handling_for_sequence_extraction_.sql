CREATE OR REPLACE FUNCTION public.generate_invoice_number()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_date_str TEXT;
  v_sequence INT;
  v_invoice_number TEXT;
BEGIN
  -- Only generate if not provided or is empty
  IF NEW.invoice_number IS NULL OR TRIM(NEW.invoice_number) = '' THEN
    v_date_str := to_char(COALESCE(NEW.invoice_date, NOW()), 'YYYYMMDD');
    
    -- Find max sequence for this date, ensuring the extracted part is numeric
    -- Use REGEXP_REPLACE to strip non-digits before casting, and filter with regex for expected pattern
    SELECT MAX(CAST(REGEXP_REPLACE(SUBSTRING(invoice_number FROM 12), '[^0-9]', '', 'g') AS INT))
    INTO v_sequence
    FROM public.invoices
    WHERE invoice_number LIKE 'INV-' || v_date_str || '-%'
      AND SUBSTRING(invoice_number FROM 12) ~ '^\d{4}$'; -- Ensure it matches the expected 4-digit sequence pattern

    -- If no valid sequence found for the date, start from 0, then add 1
    v_sequence := COALESCE(v_sequence, 0) + 1;

    v_invoice_number := 'INV-' || v_date_str || '-' || LPAD(v_sequence::TEXT, 4, '0');
    NEW.invoice_number := v_invoice_number;
  END IF;
  RETURN NEW;
END;
$function$;