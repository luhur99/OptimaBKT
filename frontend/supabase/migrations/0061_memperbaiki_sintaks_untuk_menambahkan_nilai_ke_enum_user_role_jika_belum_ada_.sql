DO $$ BEGIN
  -- Check if the enum type 'user_role' exists
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    -- If not, create the enum type with all values
    CREATE TYPE public.user_role AS ENUM ('SUPER_ADMIN', 'OPERASIONAL_DIV', 'SALES_DIV', 'TECHNICIAN', 'ACCOUNTING', 'USER');
  ELSE
    -- If it exists, add each value individually if it doesn't already exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'public.user_role'::regtype AND enumlabel = 'SUPER_ADMIN') THEN
      ALTER TYPE public.user_role ADD VALUE 'SUPER_ADMIN';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'public.user_role'::regtype AND enumlabel = 'OPERASIONAL_DIV') THEN
      ALTER TYPE public.user_role ADD VALUE 'OPERASIONAL_DIV';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'public.user_role'::regtype AND enumlabel = 'SALES_DIV') THEN
      ALTER TYPE public.user_role ADD VALUE 'SALES_DIV';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'public.user_role'::regtype AND enumlabel = 'TECHNICIAN') THEN
      ALTER TYPE public.user_role ADD VALUE 'TECHNICIAN';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'public.user_role'::regtype AND enumlabel = 'ACCOUNTING') THEN
      ALTER TYPE public.user_role ADD VALUE 'ACCOUNTING';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'public.user_role'::regtype AND enumlabel = 'USER') THEN
      ALTER TYPE public.user_role ADD VALUE 'USER';
    END IF;
  END IF;
END $$;