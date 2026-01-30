DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM (
    'SUPER_ADMIN',
    'OPERASIONAL_DIV',
    'SALES_DIV',
    'TECHNICIAN',
    'ACCOUNTING',
    'USER'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Alter the profiles table to use the new enum type if it's not already
ALTER TABLE public.profiles
ALTER COLUMN role TYPE public.user_role USING role::public.user_role;

-- Set default role to 'USER' if not already set
ALTER TABLE public.profiles
ALTER COLUMN role SET DEFAULT 'USER'::public.user_role;