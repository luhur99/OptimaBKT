DROP TRIGGER IF EXISTS on_sr_approved_create_schedule ON public.scheduling_requests;
CREATE TRIGGER on_sr_approved_create_schedule
AFTER UPDATE ON public.scheduling_requests
FOR EACH ROW EXECUTE FUNCTION public.create_schedule_on_sr_approval();