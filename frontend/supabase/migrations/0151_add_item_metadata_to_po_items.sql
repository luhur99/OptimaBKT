-- Add item metadata columns to po_items for denormalized lookup
ALTER TABLE po_items
  ADD COLUMN IF NOT EXISTS item_name TEXT,
  ADD COLUMN IF NOT EXISTS item_code TEXT,
  ADD COLUMN IF NOT EXISTS satuan TEXT,
  ADD COLUMN IF NOT EXISTS suggested_selling_price NUMERIC DEFAULT 0;
