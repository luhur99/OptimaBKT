-- Add SECURITY DEFINER RPC for SUPER_ADMIN to change any user's role.
-- Using SECURITY DEFINER bypasses RLS entirely, making this reliable
-- regardless of the current RLS policy state on the profiles table.
-- Server-side authorization: only SUPER_ADMIN can call this successfully.

CREATE OR REPLACE FUNCTION public.change_user_role(
  target_user_id uuid,
  new_role public.user_role
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  caller_role public.user_role;
BEGIN
  -- Verify the calling user is SUPER_ADMIN
  SELECT role INTO caller_role
  FROM public.profiles
  WHERE id = auth.uid();

  IF caller_role IS DISTINCT FROM 'SUPER_ADMIN'::public.user_role THEN
    RAISE EXCEPTION 'Permission denied: only SUPER_ADMIN can change user roles';
  END IF;

  -- Perform the update (SECURITY DEFINER bypasses RLS)
  UPDATE public.profiles
  SET role = new_role, updated_at = now()
  WHERE id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target user not found';
  END IF;
END;
$$;
