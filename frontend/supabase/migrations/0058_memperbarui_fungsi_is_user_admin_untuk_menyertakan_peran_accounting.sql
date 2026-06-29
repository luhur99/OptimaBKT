CREATE OR REPLACE FUNCTION public.is_user_admin(user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Izinkan akses jika pengguna adalah 'SUPER_ADMIN', 'OPERASIONAL_DIV', 'ACCOUNTING', 'admin' ATAU 'staff'
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role IN ('SUPER_ADMIN', 'OPERASIONAL_DIV', 'ACCOUNTING', 'admin', 'staff')
  );
END;
$function$;