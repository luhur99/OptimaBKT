-- Drop the existing trigger from scheduling_requests
DROP TRIGGER IF EXISTS on_scheduling_request_completed_generate_invoice ON public.scheduling_requests;

-- Drop the existing function
DROP FUNCTION IF EXISTS public.generate_invoice_on_completion();