-- RLS untuk tabel public.purchase_orders
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own purchase orders" ON public.purchase_orders
FOR SELECT TO authenticated
USING (auth.uid() = requested_by);

CREATE POLICY "Admins can view all purchase orders" ON public.purchase_orders
FOR SELECT TO authenticated
USING (public.is_user_admin(auth.uid()));

CREATE POLICY "Admins can insert purchase orders" ON public.purchase_orders
FOR INSERT TO authenticated
WITH CHECK (public.is_user_admin(auth.uid()));

CREATE POLICY "Admins can update purchase orders" ON public.purchase_orders
FOR UPDATE TO authenticated
USING (public.is_user_admin(auth.uid()));

CREATE POLICY "Admins can delete purchase orders" ON public.purchase_orders
FOR DELETE TO authenticated
USING (public.is_user_admin(auth.uid()));

-- RLS untuk tabel public.po_items
ALTER TABLE public.po_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own PO items" ON public.po_items
FOR SELECT TO authenticated
USING (auth.uid() = (SELECT user_id FROM public.purchase_requests WHERE id = pr_id));

CREATE POLICY "Admins can view all PO items" ON public.po_items
FOR SELECT TO authenticated
USING (public.is_user_admin(auth.uid()));

CREATE POLICY "Users can insert their own PO items" ON public.po_items
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = (SELECT user_id FROM public.purchase_requests WHERE id = pr_id));

CREATE POLICY "Admins can insert PO items" ON public.po_items
FOR INSERT TO authenticated
WITH CHECK (public.is_user_admin(auth.uid()));

CREATE POLICY "Users can update their own PO items" ON public.po_items
FOR UPDATE TO authenticated
USING (auth.uid() = (SELECT user_id FROM public.purchase_requests WHERE id = pr_id));

CREATE POLICY "Admins can update PO items" ON public.po_items
FOR UPDATE TO authenticated
USING (public.is_user_admin(auth.uid()));

CREATE POLICY "Users can delete their own PO items" ON public.po_items
FOR DELETE TO authenticated
USING (auth.uid() = (SELECT user_id FROM public.purchase_requests WHERE id = pr_id));

CREATE POLICY "Admins can delete PO items" ON public.po_items
FOR DELETE TO authenticated
USING (public.is_user_admin(auth.uid()));