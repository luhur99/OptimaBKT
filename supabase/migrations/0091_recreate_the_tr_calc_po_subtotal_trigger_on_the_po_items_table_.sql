CREATE TRIGGER tr_calc_po_subtotal
BEFORE INSERT OR UPDATE ON public.po_items
FOR EACH ROW
EXECUTE FUNCTION public.calc_po_item_subtotal();