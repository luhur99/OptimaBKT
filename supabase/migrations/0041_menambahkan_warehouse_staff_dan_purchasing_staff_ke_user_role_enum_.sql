-- Add WAREHOUSE_STAFF and PURCHASING_STAFF to user_role enum if they don't exist
DO $$
BEGIN
    -- Add WAREHOUSE_STAFF if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'user_role'
        AND t.typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
        AND e.enumlabel = 'WAREHOUSE_STAFF'
    ) THEN
        ALTER TYPE public.user_role ADD VALUE 'WAREHOUSE_STAFF';
    END IF;
END
$$;

DO $$
BEGIN
    -- Add PURCHASING_STAFF if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'user_role'
        AND t.typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
        AND e.enumlabel = 'PURCHASING_STAFF'
    ) THEN
        ALTER TYPE public.user_role ADD VALUE 'PURCHASING_STAFF';
    END IF;
END
$$;
