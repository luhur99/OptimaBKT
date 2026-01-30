CREATE TRIGGER set_do_number_before_insert
BEFORE INSERT ON public.schedules
FOR EACH ROW EXECUTE FUNCTION public.generate_do_number();