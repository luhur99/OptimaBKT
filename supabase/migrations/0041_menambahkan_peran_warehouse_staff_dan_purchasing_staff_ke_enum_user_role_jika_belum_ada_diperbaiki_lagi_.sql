DO $$
BEGIN
    -- Add 'WAREHOUSE_STAFF' if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'public.user_role'::regtype AND enumlabel = 'WAREHOUSE_STAFF') THEN
        ALTER TYPE public.user_role ADD VALUE 'WAREHOUSE_STAFF';
    END IF;

    -- Add 'PURCHASING_STAFF' if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'public.user_role'::regtype AND enumlabel = 'PURCHASING_STAFF') THEN
        ALTER TYPE public.user_role ADD VALUE 'PURCHASING_STAFF';
    END IF;
END
$$;