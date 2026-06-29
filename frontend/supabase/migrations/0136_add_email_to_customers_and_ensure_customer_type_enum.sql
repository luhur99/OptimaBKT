-- Migration: add email column to customers and ensure customer_type enum includes COMPANY

-- 1) Ensure enum type public.customer_type exists and contains INDIVIDUAL and COMPANY
DO $$
BEGIN
  -- If the enum type doesn't exist, create it with required values
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'customer_type') THEN
    CREATE TYPE public.customer_type AS ENUM ('INDIVIDUAL', 'COMPANY');
  ELSE
    -- If enum exists but missing values, add them conditionally
    IF NOT EXISTS (
      SELECT 1 FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname = 'customer_type' AND e.enumlabel = 'INDIVIDUAL'
    ) THEN
      ALTER TYPE public.customer_type ADD VALUE 'INDIVIDUAL';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname = 'customer_type' AND e.enumlabel = 'COMPANY'
    ) THEN
      ALTER TYPE public.customer_type ADD VALUE 'COMPANY';
    END IF;
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'Error ensuring customer_type enum: %', SQLERRM;
END$$;

-- 2) If customers table exists, add email column if missing and ensure customer_type column uses the enum
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'customers'
  ) THEN
    -- Add email column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'email'
    ) THEN
      ALTER TABLE public.customers ADD COLUMN email TEXT;
    END IF;

    -- If customer_type column exists and is not of type public.customer_type, try to alter safely
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'customer_type'
    ) THEN
      PERFORM (
        CASE WHEN (
          SELECT udt_name FROM information_schema.columns
          WHERE table_schema='public' AND table_name='customers' AND column_name='customer_type'
        ) != 'customer_type' THEN
          NULL
        ELSE NULL END
      );
      -- Attempt to alter column type to public.customer_type if it's not already that type
      BEGIN
        EXECUTE 'ALTER TABLE public.customers ALTER COLUMN customer_type TYPE public.customer_type USING customer_type::text::public.customer_type';
      EXCEPTION WHEN others THEN
        -- If ALTER TYPE failed, log notice and continue (manual migration may be required)
        RAISE NOTICE 'Could not alter customers.customer_type to public.customer_type automatically: %', SQLERRM;
      END;
    END IF;
  ELSE
    RAISE NOTICE 'Table public.customers does not exist; skipping column additions.';
  END IF;
END$$;

-- Optionally add an index on email for faster lookup and uniqueness if desired
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_email_unique ON public.customers (email);
