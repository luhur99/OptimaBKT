CREATE TRIGGER tr_po_create
  AFTER UPDATE ON public.purchase_requests
  FOR EACH ROW EXECUTE FUNCTION public.fn_po_create();