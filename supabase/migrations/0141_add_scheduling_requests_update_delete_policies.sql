-- SECURITY FIX: scheduling_requests was missing UPDATE and DELETE RLS policies.
-- Without UPDATE policy, status changes by OPERASIONAL_DIV were silently rejected.
-- Without DELETE policy, delete operations from the UI silently failed.
-- Using DO blocks for idempotency (safe to re-run).

DO $$
BEGIN
  -- Drop existing policies with these names if they somehow already exist (idempotency)
  DROP POLICY IF EXISTS "Scheduling requests: update" ON public.scheduling_requests;
  DROP POLICY IF EXISTS "Scheduling requests: delete" ON public.scheduling_requests;

  -- UPDATE: SUPER_ADMIN and OPERASIONAL_DIV can update any scheduling request.
  -- SALES_DIV can update their own requests (e.g. edit before submission).
  CREATE POLICY "Scheduling requests: update" ON public.scheduling_requests
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('SUPER_ADMIN', 'OPERASIONAL_DIV', 'SALES_DIV')
    )
  );

  -- DELETE: SUPER_ADMIN and OPERASIONAL_DIV can delete scheduling requests.
  -- SALES_DIV can delete their own requests.
  CREATE POLICY "Scheduling requests: delete" ON public.scheduling_requests
  FOR DELETE TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('SUPER_ADMIN', 'OPERASIONAL_DIV')
    )
  );
END $$;
