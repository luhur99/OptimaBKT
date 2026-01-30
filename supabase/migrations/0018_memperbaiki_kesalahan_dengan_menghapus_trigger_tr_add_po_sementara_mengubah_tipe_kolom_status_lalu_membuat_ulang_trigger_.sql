-- 0. Hapus trigger tr_add_po sementara karena bergantung pada kolom status
DROP TRIGGER IF EXISTS tr_add_po ON public.purchase_orders;

-- 1. Hapus nilai default yang ada dari kolom status
ALTER TABLE public.purchase_orders ALTER COLUMN status DROP DEFAULT;

-- 2. Ubah tipe kolom status ke po_status, mengonversi data yang ada
ALTER TABLE public.purchase_orders ALTER COLUMN status TYPE po_status USING status::text::po_status;

-- 3. Tambahkan kembali nilai default dengan tipe enum yang benar
ALTER TABLE public.purchase_orders ALTER COLUMN status SET DEFAULT 'PR_PENDING'::po_status;

-- 4. Buat ulang trigger tr_add_po
CREATE TRIGGER tr_add_po
AFTER UPDATE OF status ON public.purchase_orders
FOR EACH ROW
WHEN (NEW.status = 'CLOSED' AND OLD.status IS DISTINCT FROM 'CLOSED')
EXECUTE FUNCTION public.fn_add_po_to_inventory();