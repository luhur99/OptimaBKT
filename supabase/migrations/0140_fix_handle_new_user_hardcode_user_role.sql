-- SECURITY FIX: handle_new_user must never read role from user-supplied metadata.
-- raw_user_meta_data is set by the client during signUp() and can be forged by anyone
-- with the anon key to self-assign SUPER_ADMIN or any other role.
-- Role assignment is now exclusively done by the create-staff-user edge function
-- (which verifies SUPER_ADMIN before calling the admin API) via a subsequent
-- UPDATE on the profiles table using the service role key.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.email,
    'USER'::public.user_role  -- Always default to USER; role is set explicitly by create-staff-user
  );
  RETURN new;
END;
$$;

-- Recreate the trigger (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
