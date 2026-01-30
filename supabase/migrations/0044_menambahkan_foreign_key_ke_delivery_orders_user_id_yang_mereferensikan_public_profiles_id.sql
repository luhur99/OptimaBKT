ALTER TABLE public.delivery_orders
ADD CONSTRAINT fk_user_id
FOREIGN KEY (user_id)
REFERENCES public.profiles(id)
ON DELETE SET NULL;