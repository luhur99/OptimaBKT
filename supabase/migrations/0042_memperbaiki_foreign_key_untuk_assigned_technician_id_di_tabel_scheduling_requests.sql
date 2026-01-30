-- 1. Hapus kendala Foreign Key yang ada (jika ada)
ALTER TABLE public.scheduling_requests
DROP CONSTRAINT IF EXISTS scheduling_requests_assigned_technician_id_fkey;

-- 2. Tambahkan kendala Foreign Key baru yang merujuk ke public.technicians(id)
ALTER TABLE public.scheduling_requests
ADD CONSTRAINT scheduling_requests_assigned_technician_id_fkey
FOREIGN KEY (assigned_technician_id) REFERENCES public.technicians(id) ON DELETE SET NULL;

-- Opsional: Jika Anda ingin memastikan bahwa technician_name selalu diisi saat assigned_technician_id ada,
-- Anda bisa menambahkan trigger AFTER UPDATE/INSERT untuk menyinkronkan nama.
-- Namun, dengan logika frontend saat ini, ini sudah ditangani.