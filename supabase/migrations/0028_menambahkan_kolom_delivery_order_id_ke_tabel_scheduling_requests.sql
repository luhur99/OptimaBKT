ALTER TABLE public.scheduling_requests
ADD COLUMN delivery_order_id UUID REFERENCES public.delivery_orders(id) ON DELETE SET NULL;

-- Opsional: Tambahkan kebijakan RLS jika diperlukan untuk kolom ini secara spesifik.
-- Namun, biasanya kebijakan RLS pada tabel induk sudah cukup.
-- Jika Anda ingin pengguna hanya dapat melihat SR yang terkait dengan DO yang mereka miliki,
-- Anda mungkin perlu kebijakan yang lebih kompleks. Untuk saat ini, kita akan mengandalkan
-- kebijakan RLS yang sudah ada pada tabel scheduling_requests.