-- Enforce non-null user_id where applicable without breaking existing rows
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'scheduling_requests' AND column_name = 'user_id'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'scheduling_requests_user_id_not_null'
    ) THEN
      ALTER TABLE public.scheduling_requests
        ADD CONSTRAINT scheduling_requests_user_id_not_null CHECK (user_id IS NOT NULL) NOT VALID;
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'purchase_requests' AND column_name = 'user_id'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'purchase_requests_user_id_not_null'
    ) THEN
      ALTER TABLE public.purchase_requests
        ADD CONSTRAINT purchase_requests_user_id_not_null CHECK (user_id IS NOT NULL) NOT VALID;
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'user_id'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'products_user_id_not_null'
    ) THEN
      ALTER TABLE public.products
        ADD CONSTRAINT products_user_id_not_null CHECK (user_id IS NOT NULL) NOT VALID;
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'warehouse_inventories' AND column_name = 'user_id'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'warehouse_inventories_user_id_not_null'
    ) THEN
      ALTER TABLE public.warehouse_inventories
        ADD CONSTRAINT warehouse_inventories_user_id_not_null CHECK (user_id IS NOT NULL) NOT VALID;
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'stock_ledger' AND column_name = 'user_id'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'stock_ledger_user_id_not_null'
    ) THEN
      ALTER TABLE public.stock_ledger
        ADD CONSTRAINT stock_ledger_user_id_not_null CHECK (user_id IS NOT NULL) NOT VALID;
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'user_id'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'invoices_user_id_not_null'
    ) THEN
      ALTER TABLE public.invoices
        ADD CONSTRAINT invoices_user_id_not_null CHECK (user_id IS NOT NULL) NOT VALID;
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invoice_items' AND column_name = 'user_id'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'invoice_items_user_id_not_null'
    ) THEN
      ALTER TABLE public.invoice_items
        ADD CONSTRAINT invoice_items_user_id_not_null CHECK (user_id IS NOT NULL) NOT VALID;
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'delivery_orders' AND column_name = 'user_id'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'delivery_orders_user_id_not_null'
    ) THEN
      ALTER TABLE public.delivery_orders
        ADD CONSTRAINT delivery_orders_user_id_not_null CHECK (user_id IS NOT NULL) NOT VALID;
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'user_id'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'customers_user_id_not_null'
    ) THEN
      ALTER TABLE public.customers
        ADD CONSTRAINT customers_user_id_not_null CHECK (user_id IS NOT NULL) NOT VALID;
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'suppliers' AND column_name = 'user_id'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'suppliers_user_id_not_null'
    ) THEN
      ALTER TABLE public.suppliers
        ADD CONSTRAINT suppliers_user_id_not_null CHECK (user_id IS NOT NULL) NOT VALID;
    END IF;
  END IF;
END $$;

-- Tighten insert policy for scheduling_requests to require user_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'scheduling_requests'
      AND policyname = 'Admins and Sales can insert scheduling requests'
  ) THEN
    DROP POLICY "Admins and Sales can insert scheduling requests" ON public.scheduling_requests;
  END IF;

  CREATE POLICY "Admins and Sales can insert scheduling requests" ON public.scheduling_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id IS NOT NULL AND (
      auth.uid() = user_id OR
      public.is_user_admin(auth.uid()) OR
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'SALES_DIV'
      )
    )
  );
END $$;
