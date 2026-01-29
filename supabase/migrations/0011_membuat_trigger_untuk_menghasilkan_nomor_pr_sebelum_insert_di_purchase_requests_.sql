CREATE TRIGGER set_pr_number_before_insert
BEFORE INSERT ON public.purchase_requests
FOR EACH ROW EXECUTE FUNCTION public.generate_pr_number();