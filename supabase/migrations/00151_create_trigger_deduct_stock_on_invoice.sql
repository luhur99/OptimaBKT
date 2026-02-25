-- Trigger: Deduct stock automatically when a new invoice is created
-- This trigger will call a PLPGSQL function to deduct stock for all items in the invoice

CREATE OR REPLACE FUNCTION public.deduct_stock_on_invoice_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    item RECORD;
    available_qty INTEGER;
BEGIN
    -- Only run if stock_deducted is false/null
    IF NEW.stock_deducted IS FALSE OR NEW.stock_deducted IS NULL THEN
        FOR item IN SELECT product_id, quantity FROM invoice_items WHERE invoice_id = NEW.id LOOP
            -- Skip if product is SERVICE
            IF (SELECT product_type FROM products WHERE id = item.product_id) = 'SERVICE' THEN
                CONTINUE;
            END IF;
            -- Get available stock
            SELECT quantity INTO available_qty FROM warehouse_inventories WHERE product_id = item.product_id AND warehouse_category = 'siap_jual';
            IF available_qty < item.quantity THEN
                RAISE EXCEPTION 'Insufficient stock for product %', item.product_id;
            END IF;
            -- Deduct stock
            UPDATE warehouse_inventories SET quantity = quantity - item.quantity, updated_at = NOW()
            WHERE product_id = item.product_id AND warehouse_category = 'siap_jual';
            -- Insert stock ledger
            INSERT INTO stock_ledger (user_id, product_id, event_type, quantity, from_warehouse_category, notes, event_date)
            VALUES (NEW.user_id, item.product_id, 'SALES_OUT', item.quantity, 'siap_jual', 'Auto deduction for invoice ' || NEW.invoice_number, NOW());
        END LOOP;
        -- Mark invoice as stock_deducted
        UPDATE invoices SET stock_deducted = TRUE, updated_at = NOW() WHERE id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$;

-- Create trigger on invoices table
DROP TRIGGER IF EXISTS trigger_deduct_stock_on_invoice_creation ON invoices;
CREATE TRIGGER trigger_deduct_stock_on_invoice_creation
AFTER INSERT ON invoices
FOR EACH ROW
EXECUTE FUNCTION public.deduct_stock_on_invoice_creation();
