-- Drop the existing trigger to allow recreation
DROP TRIGGER IF EXISTS set_invoice_number_before_insert ON public.invoices;

-- Drop the existing function to allow recreation
DROP FUNCTION IF EXISTS public.generate_invoice_number();

-- Recreate the generate_invoice_number function with a more robust null/empty string check
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_date_str TEXT;
  v_sequence INT;
  v_invoice_number TEXT;
BEGIN
  -- Only generate if not provided (i.e., is NULL or an empty string)
  IF NEW.invoice_number IS NULL OR TRIM(NEW.invoice_number) = '' THEN
    v_date_str := to_char(COALESCE(NEW.invoice_date, NOW()), 'YYYYMMDD');

    -- Get the next value from the sequence
    SELECT nextval('invoice_number_seq') INTO v_sequence;

    -- Construct the invoice number with 4-digit padded sequence
    v_invoice_number := 'INV-' || v_date_str || '-' || LPAD(v_sequence::TEXT, 4, '0');
    NEW.invoice_number := v_invoice_number;
  END IF;
  RETURN NEW;
END;
$function$;

-- Recreate the trigger to generate invoice numbers before insert on the invoices table
CREATE TRIGGER set_invoice_number_before_insert
  BEFORE INSERT ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_invoice_number();