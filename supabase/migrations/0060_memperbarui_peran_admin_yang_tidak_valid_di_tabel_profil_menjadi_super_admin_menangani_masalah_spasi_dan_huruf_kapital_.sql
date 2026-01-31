UPDATE public.profiles
SET role = 'SUPER_ADMIN'::public.user_role
WHERE TRIM(LOWER(role::text)) = 'admin';