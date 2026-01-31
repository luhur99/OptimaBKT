CREATE TRIGGER set_invoice_number_before_insert
BEFORE INSERT ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.generate_invoice_number();