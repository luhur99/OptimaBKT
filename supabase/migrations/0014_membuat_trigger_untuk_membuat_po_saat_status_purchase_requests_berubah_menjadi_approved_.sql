CREATE TRIGGER tr_po_create
AFTER UPDATE OF status ON public.purchase_requests
FOR EACH ROW
WHEN (NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved')
EXECUTE FUNCTION public.fn_po_create();