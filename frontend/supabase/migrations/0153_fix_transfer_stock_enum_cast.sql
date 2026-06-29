-- Fix: 500 error from /functions/v1/move-stock
--
-- Root cause:
--   The `transfer_stock(p_product_id, p_from_warehouse text, p_to_warehouse text,
--   p_quantity, p_user_id)` RPC compares `warehouse_category` (enum) with the
--   text parameters in WHERE/UPDATE and inserts text values into enum columns.
--   PostgreSQL throws:
--     operator does not exist: warehouse_category_enum = text
--   Also missing SET search_path.
--
-- Fix:
--   Recreate function with explicit ::public.warehouse_category_enum and
--   ::public.stock_event_type casts, plus SET search_path TO 'public'.

CREATE OR REPLACE FUNCTION public.transfer_stock(
  p_product_id     UUID,
  p_from_warehouse TEXT,
  p_to_warehouse   TEXT,
  p_quantity       INTEGER,
  p_user_id        UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_available_qty INTEGER;
  v_from public.warehouse_category_enum := p_from_warehouse::public.warehouse_category_enum;
  v_to   public.warehouse_category_enum := p_to_warehouse::public.warehouse_category_enum;
BEGIN
  IF v_from = v_to THEN
    RETURN jsonb_build_object('error', 'Cannot transfer to the same warehouse');
  END IF;

  IF p_quantity <= 0 THEN
    RETURN jsonb_build_object('error', 'Quantity must be greater than 0');
  END IF;

  SELECT quantity INTO v_available_qty
  FROM public.warehouse_inventories
  WHERE product_id = p_product_id
    AND warehouse_category = v_from
  FOR UPDATE;

  IF NOT FOUND OR v_available_qty < p_quantity THEN
    RETURN jsonb_build_object(
      'error',
      'Insufficient stock in ' || p_from_warehouse || '. Available: ' || COALESCE(v_available_qty, 0)
    );
  END IF;

  UPDATE public.warehouse_inventories
  SET quantity   = quantity - p_quantity,
      updated_at = NOW()
  WHERE product_id        = p_product_id
    AND warehouse_category = v_from;

  INSERT INTO public.warehouse_inventories
    (product_id, warehouse_category, quantity, user_id, created_at, updated_at)
  VALUES
    (p_product_id, v_to, p_quantity, p_user_id, NOW(), NOW())
  ON CONFLICT (product_id, warehouse_category)
  DO UPDATE SET
    quantity   = public.warehouse_inventories.quantity + EXCLUDED.quantity,
    updated_at = NOW();

  INSERT INTO public.stock_ledger
    (user_id, product_id, event_type, quantity,
     from_warehouse_category, to_warehouse_category, notes, event_date)
  VALUES
    (p_user_id, p_product_id, 'STOCK_TRANSFER'::public.stock_event_type, p_quantity,
     v_from, v_to,
     'Stock transfer from ' || p_from_warehouse || ' to ' || p_to_warehouse,
     CURRENT_DATE);

  RETURN jsonb_build_object('message', 'Stock moved successfully');
END;
$$;
