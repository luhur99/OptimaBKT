CREATE TRIGGER on_delivery_order_completed_generate_invoice
AFTER UPDATE OF status ON public.delivery_orders
FOR EACH ROW
WHEN (NEW.status = 'completed'::public.delivery_order_status AND OLD.status IS DISTINCT FROM 'completed'::public.delivery_order_status)
EXECUTE FUNCTION public.generate_invoice_on_completion();