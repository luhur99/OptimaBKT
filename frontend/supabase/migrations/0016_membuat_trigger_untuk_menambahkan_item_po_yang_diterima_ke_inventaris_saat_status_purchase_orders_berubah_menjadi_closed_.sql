CREATE TRIGGER tr_add_po
AFTER UPDATE OF status ON public.purchase_orders
FOR EACH ROW
WHEN (NEW.status = 'CLOSED' AND OLD.status IS DISTINCT FROM 'CLOSED')
EXECUTE FUNCTION public.fn_add_po_to_inventory();