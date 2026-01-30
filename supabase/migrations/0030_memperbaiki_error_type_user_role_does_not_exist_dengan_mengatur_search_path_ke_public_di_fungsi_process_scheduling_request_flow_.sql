CREATE OR REPLACE FUNCTION public.process_scheduling_request_flow()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER SET search_path = 'public' -- Mengubah search_path untuk menyertakan skema public
AS $$
DECLARE
    requester_role user_role;
BEGIN
    -- Ambil role user yang sedang berinteraksi
    SELECT role INTO requester_role FROM public.profiles WHERE id = auth.uid();

    -- LOGIKA 1: Generate DO Number saat status pindah ke 'approved'
    -- Pindahkan logika ini ke atas agar selalu dieksekusi jika kondisi terpenuhi
    IF NEW.status = 'approved' AND (OLD.status = 'pending' OR OLD.status IS NULL) THEN
        IF NEW.do_number IS NULL THEN
            NEW.do_number := 'DO/' || to_char(NOW(), 'YYYY/MM/') || LPAD(nextval('do_number_seq')::text, 4, '0');
        END IF;
    END IF;

    -- LOGIKA 2: Validasi Perubahan Status
    -- Jika user adalah OPERASIONAL_DIV atau SUPER_ADMIN, mereka bebas mengubah status (Admin Override)
    -- Setelah DO number generation, admin bisa langsung RETURN NEW
    IF requester_role IN ('OPERASIONAL_DIV', 'SUPER_ADMIN') THEN
        RETURN NEW;
    END IF;

    -- Jika user adalah TEKNISI, hanya boleh ubah ke 'on_progress' atau 'completed'
    -- dan hanya jika tugas tersebut miliknya
    IF requester_role = 'TECHNICIAN' THEN
        IF auth.uid() != NEW.assigned_technician_id THEN
            RAISE EXCEPTION 'Anda tidak ditugaskan untuk pekerjaan ini.';
        END IF;

        -- Teknisi tidak boleh lompat status dari pending langsung ke on_progress
        IF NEW.status = 'on_progress' AND OLD.status != 'approved' THEN
            RAISE EXCEPTION 'Status harus Approved sebelum dimulai.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;