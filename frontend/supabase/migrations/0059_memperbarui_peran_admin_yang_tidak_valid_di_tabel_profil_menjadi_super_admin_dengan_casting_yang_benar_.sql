UPDATE public.profiles
SET role = 'SUPER_ADMIN'::public.user_role
WHERE role::text = 'admin';