-- Enable RLS for all core tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduling_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_inventories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- 1. Policies for 'profiles'
CREATE POLICY "Users can view their own profile" ON public.profiles
FOR SELECT TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT TO authenticated
USING (public.is_user_admin(auth.uid()));

CREATE POLICY "Admins can update all profiles" ON public.profiles
FOR UPDATE TO authenticated
USING (public.is_user_admin(auth.uid()));

-- 2. Policies for 'scheduling_requests'
CREATE POLICY "Users can view their own scheduling requests" ON public.scheduling_requests
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Authorized roles can view all scheduling requests" ON public.scheduling_requests
FOR SELECT TO authenticated
USING (
  public.is_user_admin(auth.uid()) OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('OPERASIONAL_DIV', 'SALES_DIV')
  )
);

CREATE POLICY "Admins and Sales can insert scheduling requests" ON public.scheduling_requests
FOR INSERT TO authenticated
WITH CHECK (
  public.is_user_admin(auth.uid()) OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'SALES_DIV'
  )
);

-- 3. Policies for 'delivery_orders'
CREATE POLICY "Authorized roles can view delivery orders" ON public.delivery_orders
FOR SELECT TO authenticated
USING (
  public.is_user_admin(auth.uid()) OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('OPERASIONAL_DIV', 'TECHNICIAN')
  )
);

CREATE POLICY "Operasional and Admins can manage delivery orders" ON public.delivery_orders
FOR ALL TO authenticated
USING (
  public.is_user_admin(auth.uid()) OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'OPERASIONAL_DIV'
  )
);

-- 4. Policies for 'invoices'
CREATE POLICY "Users can view their own invoices" ON public.invoices
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Accounting and Admins can view all invoices" ON public.invoices
FOR SELECT TO authenticated
USING (
  public.is_user_admin(auth.uid()) OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'ACCOUNTING'
  )
);

-- 5. Policies for 'products'
CREATE POLICY "Authenticated users can view products" ON public.products
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins and Operasional can manage products" ON public.products
FOR ALL TO authenticated
USING (
  public.is_user_admin(auth.uid()) OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'OPERASIONAL_DIV'
  )
);

-- 6. Policies for 'warehouse_inventories' and 'stock_ledger'
CREATE POLICY "Authorized roles can view inventory" ON public.warehouse_inventories
FOR SELECT TO authenticated
USING (
  public.is_user_admin(auth.uid()) OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'OPERASIONAL_DIV'
  )
);

CREATE POLICY "Admins and Operasional can manage inventory" ON public.warehouse_inventories
FOR ALL TO authenticated
USING (
  public.is_user_admin(auth.uid()) OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'OPERASIONAL_DIV'
  )
);

CREATE POLICY "Authorized roles can view stock ledger" ON public.stock_ledger
FOR SELECT TO authenticated
USING (
  public.is_user_admin(auth.uid()) OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'OPERASIONAL_DIV'
  )
);
