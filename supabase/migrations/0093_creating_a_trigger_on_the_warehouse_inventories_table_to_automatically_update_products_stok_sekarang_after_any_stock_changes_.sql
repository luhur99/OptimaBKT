-- Drop existing trigger if it exists to avoid conflicts during recreation
DROP TRIGGER IF EXISTS tr_update_product_total_stock ON public.warehouse_inventories;

-- Create trigger
CREATE TRIGGER tr_update_product_total_stock
AFTER INSERT OR UPDATE OF quantity OR DELETE ON public.warehouse_inventories
FOR EACH ROW EXECUTE FUNCTION public.update_product_total_stock();