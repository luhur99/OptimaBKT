-- Tighten the UPDATE RLS policy on utility_requests.
-- Remove the owner (auth.uid() = user_id) clause so that regular users / STAFF
-- cannot self-approve or change the status of their own requests.
-- Only SUPER_ADMIN and OPERASIONAL_DIV are allowed to UPDATE any utility request.

DROP POLICY IF EXISTS "Utility requests: update" ON public.utility_requests;

CREATE POLICY "Utility requests: update" ON public.utility_requests
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('SUPER_ADMIN', 'OPERASIONAL_DIV')
    )
  );
