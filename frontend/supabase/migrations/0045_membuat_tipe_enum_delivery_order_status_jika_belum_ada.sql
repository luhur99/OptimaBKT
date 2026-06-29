DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'delivery_order_status') THEN
    CREATE TYPE public.delivery_order_status AS ENUM ('pending', 'on_delivery', 'delivered', 'cancelled');
  END IF;
END $$;