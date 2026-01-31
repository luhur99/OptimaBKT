CREATE TRIGGER tr_update_sr_on_do_completion
  AFTER UPDATE ON public.delivery_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_sr_on_do_completion();