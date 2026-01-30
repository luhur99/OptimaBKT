-- Fix is_user_admin function to use correct role names that exist in user_role enum
CREATE OR REPLACE FUNCTION public.is_user_admin(user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Allow access if user is SUPER_ADMIN, OPERASIONAL_DIV, WAREHOUSE_STAFF, or PURCHASING_STAFF
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role IN ('SUPER_ADMIN', 'OPERASIONAL_DIV', 'WAREHOUSE_STAFF', 'PURCHASING_STAFF')
  );
END;
$function$;
