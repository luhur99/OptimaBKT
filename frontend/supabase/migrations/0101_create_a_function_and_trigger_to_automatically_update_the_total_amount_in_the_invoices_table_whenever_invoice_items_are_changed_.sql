-- Function to update total_amount in the invoices table based on its items
CREATE OR REPLACE FUNCTION public.update_invoice_total_amount()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_invoice_id UUID;
  v_total_amount NUMERIC;
BEGIN
  -- Determine the invoice_id based on the operation type
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    v_invoice_id := NEW.invoice_id;
  ELSIF TG_OP = 'DELETE' THEN
    v_invoice_id := OLD.invoice_id;
  END IF;

  -- Calculate the new total amount for the invoice
  SELECT COALESCE(SUM(subtotal), 0)
  INTO v_total_amount
  FROM public.invoice_items
  WHERE invoice_id = v_invoice_id;

  -- Update the invoices table with the new total amount and updated_at timestamp
  UPDATE public.invoices
  SET total_amount = v_total_amount,
      updated_at = NOW()
  WHERE id = v_invoice_id;

  RETURN NULL; -- For AFTER triggers, the return value is ignored
END;
$$;

-- Create a trigger that fires after any INSERT, UPDATE, or DELETE on invoice_items
-- This ensures that the total_amount in the invoices table is always synchronized.
CREATE TRIGGER on_invoice_item_change_update_invoice_total
AFTER INSERT OR UPDATE OR DELETE ON public.invoice_items
FOR EACH ROW EXECUTE FUNCTION public.update_invoice_total_amount();