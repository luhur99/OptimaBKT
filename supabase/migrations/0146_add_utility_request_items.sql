-- Refactor utility_requests: 1 UR number per submission with N line items.
-- Creates utility_request_items as the child table.
-- Migrates existing single-item rows into the new table.
-- Drops item_name, quantity, unit_price from utility_requests (total_price stays as grand total).

-- 1. Create the items table
CREATE TABLE IF NOT EXISTS public.utility_request_items (
  id         UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  ur_id      UUID            NOT NULL REFERENCES public.utility_requests(id) ON DELETE CASCADE,
  item_name  TEXT            NOT NULL,
  quantity   INTEGER         NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price NUMERIC(14,2)   NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  total_price NUMERIC(14,2)  NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE public.utility_request_items ENABLE ROW LEVEL SECURITY;

-- 3. VIEW: same access as the parent utility_requests row
CREATE POLICY "UR items: view" ON public.utility_request_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.utility_requests ur
      WHERE ur.id = ur_id
        AND (
          ur.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role IN ('SUPER_ADMIN','OPERASIONAL_DIV','SALES_DIV','STAFF')
          )
        )
    )
  );

-- 4. INSERT: user may only add items to their own requests
CREATE POLICY "UR items: insert" ON public.utility_request_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.utility_requests ur
      WHERE ur.id = ur_id AND ur.user_id = auth.uid()
    )
  );

-- 5. UPDATE: only SUPER_ADMIN / OPERASIONAL_DIV
CREATE POLICY "UR items: update" ON public.utility_request_items
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('SUPER_ADMIN','OPERASIONAL_DIV')
    )
  );

-- 6. DELETE: only SUPER_ADMIN / OPERASIONAL_DIV
CREATE POLICY "UR items: delete" ON public.utility_request_items
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('SUPER_ADMIN','OPERASIONAL_DIV')
    )
  );

-- 7. Migrate existing data: copy each row's item into the new table
INSERT INTO public.utility_request_items (ur_id, item_name, quantity, unit_price, total_price)
SELECT
  id,
  COALESCE(item_name, 'Unknown Item'),
  COALESCE(quantity, 1),
  COALESCE(unit_price, 0),
  COALESCE(total_price, 0)
FROM public.utility_requests
WHERE item_name IS NOT NULL AND item_name <> '';

-- 8. Drop item-level columns from utility_requests
--    total_price stays as the grand total of all items in the request
ALTER TABLE public.utility_requests
  DROP COLUMN IF EXISTS item_name,
  DROP COLUMN IF EXISTS quantity,
  DROP COLUMN IF EXISTS unit_price;
