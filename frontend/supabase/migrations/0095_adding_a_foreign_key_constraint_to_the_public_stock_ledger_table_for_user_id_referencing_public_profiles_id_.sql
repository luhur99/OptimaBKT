ALTER TABLE public.stock_ledger
ADD CONSTRAINT fk_user_id
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;