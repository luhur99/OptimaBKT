-- Legacy single-item columns are now optional since items are stored in po_items
ALTER TABLE purchase_requests
  ALTER COLUMN item_name DROP NOT NULL,
  ALTER COLUMN item_code DROP NOT NULL,
  ALTER COLUMN quantity DROP NOT NULL,
  ALTER COLUMN unit_price DROP NOT NULL,
  ALTER COLUMN total_price DROP NOT NULL,
  ALTER COLUMN suggested_selling_price DROP NOT NULL;
