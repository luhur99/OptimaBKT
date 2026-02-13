-- Fix utility_requests INSERT policy to allow USER role to create requests
-- The previous policy only allowed SUPER_ADMIN, OPERASIONAL_DIV, and SALES_DIV
-- but USER role also needs to create utility requests

-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Utility requests: insert" ON public.utility_requests;

-- Create the updated INSERT policy that includes USER role
CREATE POLICY "Utility requests: insert" ON public.utility_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id IS NOT NULL AND auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('SUPER_ADMIN', 'OPERASIONAL_DIV', 'SALES_DIV', 'USER')
    )
  );
