-- Function to deduct stock for a given invoice_id (for manual and batch processing)
CREATE OR REPLACE FUNCTION public.deduct_stock_by_invoice_id(invoice_uuid UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    inv RECORD;
    item RECORD;
    available_qty INTEGER;
BEGIN
    SELECT * INTO inv FROM invoices WHERE id = invoice_uuid;
    IF inv.stock_deducted IS FALSE OR inv.stock_deducted IS NULL THEN
        FOR item IN SELECT product_id, quantity FROM invoice_items WHERE invoice_id = inv.id LOOP
            IF (SELECT product_type FROM products WHERE id = item.product_id) = 'SERVICE' THEN
                CONTINUE;
            END IF;
            SELECT quantity INTO available_qty FROM warehouse_inventories WHERE product_id = item.product_id AND warehouse_category = 'siap_jual';
            IF available_qty < item.quantity THEN
                RAISE EXCEPTION 'Insufficient stock for product %', item.product_id;
            END IF;
            UPDATE warehouse_inventories SET quantity = quantity - item.quantity, updated_at = NOW()
            WHERE product_id = item.product_id AND warehouse_category = 'siap_jual';
            INSERT INTO stock_ledger (user_id, product_id, event_type, quantity, from_warehouse_category, notes, event_date)
            VALUES (inv.user_id, item.product_id, 'SALES_OUT', item.quantity, 'siap_jual', 'Auto deduction for invoice ' || inv.invoice_number, NOW());
        END LOOP;
        UPDATE invoices SET stock_deducted = TRUE, updated_at = NOW() WHERE id = inv.id;
    END IF;
END;
$$;
