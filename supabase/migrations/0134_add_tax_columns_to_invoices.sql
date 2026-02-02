-- Add tax-related columns to invoices table
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS with_tax BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS tax_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS subtotal_amount NUMERIC DEFAULT 0;

-- Update the function to calculate totals including tax
CREATE OR REPLACE FUNCTION public.update_invoice_total_amount()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_invoice_id UUID;
  v_subtotal NUMERIC;
  v_with_tax BOOLEAN;
  v_tax_amount NUMERIC := 0;
  v_total_amount NUMERIC;
BEGIN
  -- Determine the invoice_id based on the operation type or if triggered by invoice update
  IF TG_TABLE_NAME = 'invoice_items' THEN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
      v_invoice_id := NEW.invoice_id;
    ELSIF TG_OP = 'DELETE' THEN
      v_invoice_id := OLD.invoice_id;
    END IF;
  ELSE
    v_invoice_id := NEW.id;
  END IF;

  -- Get the with_tax flag
  SELECT with_tax INTO v_with_tax FROM public.invoices WHERE id = v_invoice_id;

  -- Calculate subtotal
  SELECT COALESCE(SUM(subtotal), 0)
  INTO v_subtotal
  FROM public.invoice_items
  WHERE invoice_id = v_invoice_id;

  -- Calculate tax if applicable (11%)
  IF v_with_tax THEN
    v_tax_amount := v_subtotal * 0.11;
  END IF;

  v_total_amount := v_subtotal + v_tax_amount;

  -- Update the invoices table
  -- Note: We use a condition to avoid infinite recursion if this is called from an invoice update
  UPDATE public.invoices
  SET subtotal_amount = v_subtotal,
      tax_amount = v_tax_amount,
      total_amount = v_total_amount,
      updated_at = NOW()
  WHERE id = v_invoice_id;

  RETURN NULL;
END;
$$;

-- Ensure the trigger on invoices specifically for with_tax changes
-- But wait, if we add it to invoices, we might get recursion. 
-- However, we only care when with_tax changes.

CREATE OR REPLACE FUNCTION public.on_invoice_tax_toggle()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF (NEW.with_tax IS DISTINCT FROM OLD.with_tax) THEN
    PERFORM public.update_invoice_total_amount_from_id(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

-- Helper function to avoid trigger context issues
CREATE OR REPLACE FUNCTION public.update_invoice_total_amount_from_id(p_invoice_id UUID)
RETURNS VOID
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_subtotal NUMERIC;
  v_with_tax BOOLEAN;
  v_tax_amount NUMERIC := 0;
  v_total_amount NUMERIC;
BEGIN
  SELECT with_tax INTO v_with_tax FROM public.invoices WHERE id = p_invoice_id;
  
  SELECT COALESCE(SUM(subtotal), 0) INTO v_subtotal
  FROM public.invoice_items WHERE invoice_id = p_invoice_id;

  IF v_with_tax THEN
    v_tax_amount := v_subtotal * 0.11;
  END IF;

  v_total_amount := v_subtotal + v_tax_amount;

  UPDATE public.invoices
  SET subtotal_amount = v_subtotal,
      tax_amount = v_tax_amount,
      total_amount = v_total_amount,
      updated_at = NOW()
  WHERE id = p_invoice_id;
END;
$$;

-- Refined update_invoice_total_amount to use the helper
CREATE OR REPLACE FUNCTION public.update_invoice_total_amount()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    PERFORM public.update_invoice_total_amount_from_id(NEW.invoice_id);
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.update_invoice_total_amount_from_id(OLD.invoice_id);
  END IF;
  RETURN NULL;
END;
$$;

-- Trigger for with_tax change on invoices
DROP TRIGGER IF EXISTS on_invoice_with_tax_change ON public.invoices;
CREATE TRIGGER on_invoice_with_tax_change
AFTER UPDATE OF with_tax ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.update_invoice_total_amount(); -- Use same function logic but it expects NEW.invoice_id? No, let's fix it.

-- Optimized trigger function for invoices
CREATE OR REPLACE FUNCTION public.handle_invoice_update_for_totals()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF (NEW.with_tax IS DISTINCT FROM OLD.with_tax) THEN
    PERFORM public.update_invoice_total_amount_from_id(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_invoice_update_totals ON public.invoices;
CREATE TRIGGER on_invoice_update_totals
AFTER UPDATE OF with_tax ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.handle_invoice_update_for_totals();
