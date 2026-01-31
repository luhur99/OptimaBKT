-- Create the new enum type for invoice document status
DO $$ BEGIN
    CREATE TYPE public.invoice_document_status AS ENUM ('DRAFT', 'PENDING', 'PAID', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Process public.invoices table
-- 1. Drop existing default constraint if any
ALTER TABLE public.invoices ALTER COLUMN invoice_status DROP DEFAULT;

-- 2. Update existing data in public.invoices to match new enum values before altering column type
UPDATE public.invoices
SET invoice_status = CASE
    WHEN invoice_status = 'issued' THEN 'PENDING'
    WHEN invoice_status = 'waiting_document_inv' THEN 'DRAFT'
    WHEN invoice_status = 'FINAL' THEN 'PENDING' -- Map FINAL to PENDING for invoices
    WHEN invoice_status = 'cancelled' THEN 'CANCELLED'
    ELSE 'DRAFT' -- Default any other unexpected values to DRAFT
END
WHERE invoice_status IS NOT NULL; -- Only update rows where invoice_status is not null

-- 3. Alter the invoice_status column in public.invoices to use the new enum type
ALTER TABLE public.invoices
ALTER COLUMN invoice_status TYPE public.invoice_document_status
USING invoice_status::public.invoice_document_status;

-- 4. Set the new default value for invoice_status in public.invoices
ALTER TABLE public.invoices
ALTER COLUMN invoice_status SET DEFAULT 'DRAFT'::public.invoice_document_status;


-- Process public.scheduling_requests table
-- 1. Drop existing default constraint if any
ALTER TABLE public.scheduling_requests ALTER COLUMN invoice_status DROP DEFAULT;

-- 2. Update existing data in public.scheduling_requests to match new enum values before altering column type
UPDATE public.scheduling_requests
SET invoice_status = CASE
    WHEN invoice_status = 'FINAL' THEN 'PENDING'
    ELSE 'DRAFT' -- Default any other unexpected values to DRAFT
END
WHERE invoice_status IS NOT NULL; -- Only update rows where invoice_status is not null

-- 3. Alter the invoice_status column in public.scheduling_requests to use the new enum type
ALTER TABLE public.scheduling_requests
ALTER COLUMN invoice_status TYPE public.invoice_document_status
USING invoice_status::public.invoice_document_status;

-- 4. Set the new default value for invoice_status in public.scheduling_requests
ALTER TABLE public.scheduling_requests
ALTER COLUMN invoice_status SET DEFAULT 'DRAFT'::public.invoice_document_status;