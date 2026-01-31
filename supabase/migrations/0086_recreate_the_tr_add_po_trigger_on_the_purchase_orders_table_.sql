CREATE TRIGGER tr_add_po
AFTER UPDATE ON public.purchase_orders
FOR EACH ROW
EXECUTE FUNCTION public.fn_add_po_to_inventory();