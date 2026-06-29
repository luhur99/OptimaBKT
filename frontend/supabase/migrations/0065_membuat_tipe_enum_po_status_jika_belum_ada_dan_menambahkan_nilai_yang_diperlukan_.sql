DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'po_status') THEN
        CREATE TYPE public.po_status AS ENUM ('PR_PENDING', 'WAITING_RECEIVED', 'RECEIVED', 'CLOSED');
    ELSE
        -- Add new values if they don't exist
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'public.po_status'::regtype AND enumlabel = 'PR_PENDING') THEN
            ALTER TYPE public.po_status ADD VALUE 'PR_PENDING';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'public.po_status'::regtype AND enumlabel = 'WAITING_RECEIVED') THEN
            ALTER TYPE public.po_status ADD VALUE 'WAITING_RECEIVED';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'public.po_status'::regtype AND enumlabel = 'RECEIVED') THEN
            ALTER TYPE public.po_status ADD VALUE 'RECEIVED';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'public.po_status'::regtype AND enumlabel = 'CLOSED') THEN
            ALTER TYPE public.po_status ADD VALUE 'CLOSED';
        END IF;
    END IF;
END
$$;