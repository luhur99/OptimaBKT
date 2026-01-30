ALTER TABLE public.po_items
ADD COLUMN pr_id UUID REFERENCES public.purchase_requests(id) ON DELETE CASCADE;