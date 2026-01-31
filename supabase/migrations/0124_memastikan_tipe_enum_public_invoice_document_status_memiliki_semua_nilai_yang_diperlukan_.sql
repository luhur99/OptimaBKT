DO $$ BEGIN
    -- Add 'DRAFT' if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'public.invoice_document_status'::regtype AND enumlabel = 'DRAFT') THEN
        ALTER TYPE public.invoice_document_status ADD VALUE 'DRAFT';
    END IF;
    -- Add 'PENDING' if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'public.invoice_document_status'::regtype AND enumlabel = 'PENDING') THEN
        ALTER TYPE public.invoice_document_status ADD VALUE 'PENDING';
    END IF;
    -- Add 'PAID' if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'public.invoice_document_status'::regtype AND enumlabel = 'PAID') THEN
        ALTER TYPE public.invoice_document_status ADD VALUE 'PAID';
    END IF;
    -- Add 'CANCELLED' if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'public.invoice_document_status'::regtype AND enumlabel = 'CANCELLED') THEN
        ALTER TYPE public.invoice_document_status ADD VALUE 'CANCELLED';
    END IF;
END $$;