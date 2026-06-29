-- Add the invoice_number column to public.invoice_items
ALTER TABLE public.invoice_items
ADD COLUMN invoice_number TEXT;

-- Create a function to set the invoice_number on an invoice_item
CREATE OR REPLACE FUNCTION public.set_invoice_number_on_item()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.invoice_id IS NOT NULL THEN
    SELECT invoice_number INTO NEW.invoice_number
    FROM public.invoices
    WHERE id = NEW.invoice_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Create a trigger to call the function before insert or update on invoice_items
CREATE TRIGGER set_invoice_number_before_insert_update_item
BEFORE INSERT OR UPDATE OF invoice_id ON public.invoice_items
FOR EACH ROW EXECUTE FUNCTION public.set_invoice_number_on_item();