-- Backfill stok_sekarang for existing products
UPDATE public.products p
SET stok_sekarang = (
  SELECT COALESCE(SUM(wi.quantity), 0)
  FROM public.warehouse_inventories wi
  WHERE wi.product_id = p.id
);