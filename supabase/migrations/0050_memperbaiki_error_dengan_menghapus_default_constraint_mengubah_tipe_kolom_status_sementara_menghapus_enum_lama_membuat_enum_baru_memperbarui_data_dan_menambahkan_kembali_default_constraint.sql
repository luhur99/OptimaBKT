DO $$
BEGIN
  -- 1. Remove the DEFAULT constraint from the status column
  ALTER TABLE public.delivery_orders
  ALTER COLUMN status DROP DEFAULT;

  -- 2. Change the column type to TEXT to remove dependency on the old enum
  ALTER TABLE public.delivery_orders
  ALTER COLUMN status TYPE TEXT;

  -- 3. Drop the old enum type if it exists
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'delivery_order_status_old') THEN
    DROP TYPE public.delivery_order_status_old;
  END IF;

  -- 4. Drop the original enum type if it exists (to ensure a clean recreation)
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'delivery_order_status') THEN
    DROP TYPE public.delivery_order_status;
  END IF;

  -- 5. Create the new enum type with the desired values
  CREATE TYPE public.delivery_order_status AS ENUM ('pending', 'in progress', 'completed', 'cancelled');

  -- 6. Update existing data to map old values to new enum values
  -- This is crucial if there are existing 'on_delivery' or 'delivered' values
  UPDATE public.delivery_orders
  SET status = 'in progress'
  WHERE status = 'on_delivery'; -- Assuming 'on_delivery' maps to 'in progress'

  UPDATE public.delivery_orders
  SET status = 'completed'
  WHERE status = 'delivered'; -- Assuming 'delivered' maps to 'completed'

  -- 7. Alter the column type back to the new enum
  ALTER TABLE public.delivery_orders
  ALTER COLUMN status TYPE public.delivery_order_status
  USING status::public.delivery_order_status;

  -- 8. Add the DEFAULT constraint back to the status column using the new enum
  ALTER TABLE public.delivery_orders
  ALTER COLUMN status SET DEFAULT 'pending'::public.delivery_order_status;

EXCEPTION
  WHEN duplicate_object THEN null;
END $$;