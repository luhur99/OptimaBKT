-- 1. Update existing 'admin' roles to 'SUPER_ADMIN'
UPDATE public.profiles
SET role = 'SUPER_ADMIN'::public.user_role
WHERE role::text = 'admin';

-- 2. Update existing 'staff' roles to 'OPERASIONAL_DIV'
UPDATE public.profiles
SET role = 'OPERASIONAL_DIV'::public.user_role
WHERE role::text = 'staff';

-- 3. Recreate the is_user_admin function to only check valid enum roles
CREATE OR REPLACE FUNCTION public.is_user_admin(user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Allow access if the user has 'SUPER_ADMIN', 'OPERASIONAL_DIV', or 'ACCOUNTING' role
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role IN ('SUPER_ADMIN', 'OPERASIONAL_DIV', 'ACCOUNTING')
  );
END;
$function$;