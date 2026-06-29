-- Pastikan trigger lama dengan nama yang sama tidak ada untuk menghindari duplikasi
DROP TRIGGER IF EXISTS on_delivery_order_completed_update_sr ON public.delivery_orders;

CREATE TRIGGER on_delivery_order_completed_update_sr
AFTER UPDATE ON public.delivery_orders
FOR EACH ROW
WHEN (NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed')
EXECUTE FUNCTION public.update_sr_on_do_completion();