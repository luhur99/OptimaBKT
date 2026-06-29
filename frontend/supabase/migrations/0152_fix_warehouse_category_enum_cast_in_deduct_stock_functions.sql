-- Fix: "operator does not exist: warehouse_category_enum = text"
--
-- Root cause:
--   The deduct_stock_on_invoice_creation() and deduct_stock_by_invoice_id()
--   functions compare the column `warehouse_category` (type warehouse_category_enum)
--   against a text literal 'siap_jual' without an explicit cast. PostgreSQL does
--   not implicitly cast text -> enum in WHERE / UPDATE predicates, so the lookup
--   fails. We also pin search_path to public so the enum type and tables resolve
--   correctly when the trigger fires.
--
-- Fix:
--   Recreate both functions with explicit ::public.warehouse_category_enum and
--   ::public.stock_event_type casts, and SET search_path TO 'public'.

CREATE OR REPLACE FUNCTION public.deduct_stock_on_invoice_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    item RECORD;
    available_qty INTEGER;
BEGIN
    IF NEW.stock_deducted IS FALSE OR NEW.stock_deducted IS NULL THEN
        FOR item IN SELECT product_id, quantity FROM public.invoice_items WHERE invoice_id = NEW.id LOOP
            IF (SELECT product_type FROM public.products WHERE id = item.product_id) = 'SERVICE' THEN
                CONTINUE;
            END IF;

            SELECT quantity INTO available_qty
            FROM public.warehouse_inventories
            WHERE product_id = item.product_id
              AND warehouse_category = 'siap_jual'::public.warehouse_category_enum;

            IF available_qty IS NULL OR available_qty < item.quantity THEN
                RAISE EXCEPTION 'Insufficient stock for product %', item.product_id;
            END IF;

            UPDATE public.warehouse_inventories
            SET quantity = quantity - item.quantity,
                updated_at = NOW()
            WHERE product_id = item.product_id
              AND warehouse_category = 'siap_jual'::public.warehouse_category_enum;

            INSERT INTO public.stock_ledger (
                user_id, product_id, event_type, quantity,
                from_warehouse_category, notes, event_date
            )
            VALUES (
                NEW.user_id,
                item.product_id,
                'SALES_OUT'::public.stock_event_type,
                item.quantity,
                'siap_jual'::public.warehouse_category_enum,
                'Auto deduction for invoice ' || NEW.invoice_number,
                NOW()
            );
        END LOOP;

        UPDATE public.invoices
        SET stock_deducted = TRUE, updated_at = NOW()
        WHERE id = NEW.id;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_deduct_stock_on_invoice_creation ON public.invoices;
CREATE TRIGGER trigger_deduct_stock_on_invoice_creation
AFTER INSERT ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.deduct_stock_on_invoice_creation();


CREATE OR REPLACE FUNCTION public.deduct_stock_by_invoice_id(invoice_uuid UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    inv RECORD;
    item RECORD;
    available_qty INTEGER;
BEGIN
    SELECT * INTO inv FROM public.invoices WHERE id = invoice_uuid;

    IF inv.stock_deducted IS FALSE OR inv.stock_deducted IS NULL THEN
        FOR item IN SELECT product_id, quantity FROM public.invoice_items WHERE invoice_id = inv.id LOOP
            IF (SELECT product_type FROM public.products WHERE id = item.product_id) = 'SERVICE' THEN
                CONTINUE;
            END IF;

            SELECT quantity INTO available_qty
            FROM public.warehouse_inventories
            WHERE product_id = item.product_id
              AND warehouse_category = 'siap_jual'::public.warehouse_category_enum;

            IF available_qty IS NULL OR available_qty < item.quantity THEN
                RAISE EXCEPTION 'Insufficient stock for product %', item.product_id;
            END IF;

            UPDATE public.warehouse_inventories
            SET quantity = quantity - item.quantity,
                updated_at = NOW()
            WHERE product_id = item.product_id
              AND warehouse_category = 'siap_jual'::public.warehouse_category_enum;

            INSERT INTO public.stock_ledger (
                user_id, product_id, event_type, quantity,
                from_warehouse_category, notes, event_date
            )
            VALUES (
                inv.user_id,
                item.product_id,
                'SALES_OUT'::public.stock_event_type,
                item.quantity,
                'siap_jual'::public.warehouse_category_enum,
                'Auto deduction for invoice ' || inv.invoice_number,
                NOW()
            );
        END LOOP;

        UPDATE public.invoices
        SET stock_deducted = TRUE, updated_at = NOW()
        WHERE id = inv.id;
    END IF;
END;
$$;
