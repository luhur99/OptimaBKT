-- Enable RLS and add policies for customers, suppliers, purchase_requests, and invoice_items
DO $$
BEGIN
  -- Enable RLS
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'customers') THEN
    EXECUTE 'ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'suppliers') THEN
    EXECUTE 'ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'purchase_requests') THEN
    EXECUTE 'ALTER TABLE public.purchase_requests ENABLE ROW LEVEL SECURITY';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invoice_items') THEN
    EXECUTE 'ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;

-- Customers policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'customers') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Customers: view" ON public.customers';
    EXECUTE 'DROP POLICY IF EXISTS "Customers: insert" ON public.customers';
    EXECUTE 'DROP POLICY IF EXISTS "Customers: update" ON public.customers';
    EXECUTE 'DROP POLICY IF EXISTS "Customers: delete" ON public.customers';
  END IF;

  EXECUTE 'CREATE POLICY "Customers: view" ON public.customers
    FOR SELECT TO authenticated
    USING (
      auth.uid() = user_id OR
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (''SUPER_ADMIN'',''OPERASIONAL_DIV'',''SALES_DIV''))
    )';

  EXECUTE 'CREATE POLICY "Customers: insert" ON public.customers
    FOR INSERT TO authenticated
    WITH CHECK (
      user_id IS NOT NULL AND auth.uid() = user_id AND
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (''SUPER_ADMIN'',''OPERASIONAL_DIV'',''SALES_DIV''))
    )';

  EXECUTE 'CREATE POLICY "Customers: update" ON public.customers
    FOR UPDATE TO authenticated
    USING (
      auth.uid() = user_id OR
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (''SUPER_ADMIN'',''OPERASIONAL_DIV'',''SALES_DIV''))
    )';

  EXECUTE 'CREATE POLICY "Customers: delete" ON public.customers
    FOR DELETE TO authenticated
    USING (
      auth.uid() = user_id OR
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (''SUPER_ADMIN'',''OPERASIONAL_DIV'',''SALES_DIV''))
    )';
END $$;

-- Suppliers policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'suppliers') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Suppliers: view" ON public.suppliers';
    EXECUTE 'DROP POLICY IF EXISTS "Suppliers: insert" ON public.suppliers';
    EXECUTE 'DROP POLICY IF EXISTS "Suppliers: update" ON public.suppliers';
    EXECUTE 'DROP POLICY IF EXISTS "Suppliers: delete" ON public.suppliers';
  END IF;

  EXECUTE 'CREATE POLICY "Suppliers: view" ON public.suppliers
    FOR SELECT TO authenticated
    USING (
      auth.uid() = user_id OR
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (''SUPER_ADMIN'',''OPERASIONAL_DIV'',''SALES_DIV''))
    )';

  EXECUTE 'CREATE POLICY "Suppliers: insert" ON public.suppliers
    FOR INSERT TO authenticated
    WITH CHECK (
      user_id IS NOT NULL AND auth.uid() = user_id AND
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (''SUPER_ADMIN'',''OPERASIONAL_DIV'',''SALES_DIV''))
    )';

  EXECUTE 'CREATE POLICY "Suppliers: update" ON public.suppliers
    FOR UPDATE TO authenticated
    USING (
      auth.uid() = user_id OR
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (''SUPER_ADMIN'',''OPERASIONAL_DIV'',''SALES_DIV''))
    )';

  EXECUTE 'CREATE POLICY "Suppliers: delete" ON public.suppliers
    FOR DELETE TO authenticated
    USING (
      auth.uid() = user_id OR
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (''SUPER_ADMIN'',''OPERASIONAL_DIV'',''SALES_DIV''))
    )';
END $$;

-- Purchase requests policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'purchase_requests') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Purchase requests: view" ON public.purchase_requests';
    EXECUTE 'DROP POLICY IF EXISTS "Purchase requests: insert" ON public.purchase_requests';
    EXECUTE 'DROP POLICY IF EXISTS "Purchase requests: update" ON public.purchase_requests';
    EXECUTE 'DROP POLICY IF EXISTS "Purchase requests: delete" ON public.purchase_requests';
  END IF;

  EXECUTE 'CREATE POLICY "Purchase requests: view" ON public.purchase_requests
    FOR SELECT TO authenticated
    USING (
      auth.uid() = user_id OR
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (''SUPER_ADMIN'',''OPERASIONAL_DIV'',''SALES_DIV''))
    )';

  EXECUTE 'CREATE POLICY "Purchase requests: insert" ON public.purchase_requests
    FOR INSERT TO authenticated
    WITH CHECK (
      user_id IS NOT NULL AND auth.uid() = user_id AND
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (''SUPER_ADMIN'',''OPERASIONAL_DIV'',''SALES_DIV''))
    )';

  EXECUTE 'CREATE POLICY "Purchase requests: update" ON public.purchase_requests
    FOR UPDATE TO authenticated
    USING (
      auth.uid() = user_id OR
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (''SUPER_ADMIN'',''OPERASIONAL_DIV'',''SALES_DIV''))
    )';

  EXECUTE 'CREATE POLICY "Purchase requests: delete" ON public.purchase_requests
    FOR DELETE TO authenticated
    USING (
      auth.uid() = user_id OR
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (''SUPER_ADMIN'',''OPERASIONAL_DIV''))
    )';
END $$;

-- Invoice items policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'invoice_items') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Invoice items: view" ON public.invoice_items';
    EXECUTE 'DROP POLICY IF EXISTS "Invoice items: insert" ON public.invoice_items';
    EXECUTE 'DROP POLICY IF EXISTS "Invoice items: update" ON public.invoice_items';
    EXECUTE 'DROP POLICY IF EXISTS "Invoice items: delete" ON public.invoice_items';
  END IF;

  EXECUTE 'CREATE POLICY "Invoice items: view" ON public.invoice_items
    FOR SELECT TO authenticated
    USING (
      auth.uid() = user_id OR
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (''SUPER_ADMIN'',''OPERASIONAL_DIV'',''ACCOUNTING''))
    )';

  EXECUTE 'CREATE POLICY "Invoice items: insert" ON public.invoice_items
    FOR INSERT TO authenticated
    WITH CHECK (
      user_id IS NOT NULL AND auth.uid() = user_id AND
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (''SUPER_ADMIN'',''OPERASIONAL_DIV'',''ACCOUNTING''))
    )';

  EXECUTE 'CREATE POLICY "Invoice items: update" ON public.invoice_items
    FOR UPDATE TO authenticated
    USING (
      auth.uid() = user_id OR
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (''SUPER_ADMIN'',''OPERASIONAL_DIV'',''ACCOUNTING''))
    )';

  EXECUTE 'CREATE POLICY "Invoice items: delete" ON public.invoice_items
    FOR DELETE TO authenticated
    USING (
      auth.uid() = user_id OR
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (''SUPER_ADMIN'',''OPERASIONAL_DIV'',''ACCOUNTING''))
    )';
END $$;
