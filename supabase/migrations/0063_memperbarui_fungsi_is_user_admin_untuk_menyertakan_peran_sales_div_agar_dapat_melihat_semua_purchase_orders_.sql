CREATE OR REPLACE FUNCTION public.is_user_admin(user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  -- Allow access if the user has 'SUPER_ADMIN', 'OPERASIONAL_DIV', 'ACCOUNTING', or 'SALES_DIV' role
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role IN ('SUPER_ADMIN', 'OPERASIONAL_DIV', 'ACCOUNTING', 'SALES_DIV')
  );
END;
$$;