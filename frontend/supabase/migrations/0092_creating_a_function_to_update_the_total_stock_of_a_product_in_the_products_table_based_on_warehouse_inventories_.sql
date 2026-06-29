CREATE OR REPLACE FUNCTION public.update_product_total_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- For INSERT or UPDATE on warehouse_inventories
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE public.products
    SET stok_sekarang = (
      SELECT COALESCE(SUM(quantity), 0)
      FROM public.warehouse_inventories
      WHERE product_id = NEW.product_id
    )
    WHERE id = NEW.product_id;
    RETURN NEW;
  -- For DELETE on warehouse_inventories
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.products
    SET stok_sekarang = (
      SELECT COALESCE(SUM(quantity), 0)
      FROM public.warehouse_inventories
      WHERE product_id = OLD.product_id
    )
    WHERE id = OLD.product_id;
    RETURN OLD;
  END IF;
  RETURN NULL; -- Should not be reached
END;
$$;