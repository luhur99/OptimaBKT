CREATE TRIGGER tr_generate_invoice_on_completion
AFTER UPDATE ON public.delivery_orders
FOR EACH ROW
EXECUTE FUNCTION public.generate_invoice_on_completion();