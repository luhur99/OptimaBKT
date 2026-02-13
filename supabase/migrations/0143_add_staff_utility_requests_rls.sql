-- Update utility_requests RLS policies to include STAFF role.
-- STAFF can: view their own requests, insert their own requests.
-- STAFF cannot: update (approve/reject) or delete any requests.

DO $$
BEGIN
  -- Recreate view policy to include STAFF
  DROP POLICY IF EXISTS "Utility requests: view" ON public.utility_requests;
  CREATE POLICY "Utility requests: view" ON public.utility_requests
    FOR SELECT TO authenticated
    USING (
      auth.uid() = user_id OR
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('SUPER_ADMIN', 'OPERASIONAL_DIV', 'SALES_DIV', 'STAFF')
      )
    );

  -- Recreate insert policy to include STAFF
  DROP POLICY IF EXISTS "Utility requests: insert" ON public.utility_requests;
  CREATE POLICY "Utility requests: insert" ON public.utility_requests
    FOR INSERT TO authenticated
    WITH CHECK (
      user_id IS NOT NULL AND auth.uid() = user_id AND
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('SUPER_ADMIN', 'OPERASIONAL_DIV', 'SALES_DIV', 'STAFF')
      )
    );

  -- Update and Delete policies remain unchanged (STAFF excluded — cannot approve/reject/delete)
END $$;
