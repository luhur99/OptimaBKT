-- Fix: same enum/text bug in deduct_stock_by_invoice_id_log

CREATE OR REPLACE FUNCTION public.deduct_stock_by_invoice_id_log(invoice_uuid UUID)
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
            BEGIN
                IF (SELECT product_type FROM public.products WHERE id = item.product_id) = 'SERVICE' THEN
                    CONTINUE;
                END IF;

                SELECT quantity INTO available_qty
                FROM public.warehouse_inventories
                WHERE product_id = item.product_id
                  AND warehouse_category = 'siap_jual'::public.warehouse_category_enum;

                IF available_qty IS NULL OR available_qty < item.quantity THEN
                    INSERT INTO public.invoice_stock_deduction_errors (invoice_id, product_id, error_message)
                    VALUES (inv.id, item.product_id, 'Insufficient stock: available ' || COALESCE(available_qty,0) || ', requested ' || item.quantity);
                    CONTINUE;
                END IF;

                UPDATE public.warehouse_inventories
                SET quantity = quantity - item.quantity, updated_at = NOW()
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
            EXCEPTION WHEN OTHERS THEN
                INSERT INTO public.invoice_stock_deduction_errors (invoice_id, product_id, error_message)
                VALUES (inv.id, item.product_id, SQLERRM);
                CONTINUE;
            END;
        END LOOP;
        UPDATE public.invoices SET stock_deducted = TRUE, updated_at = NOW() WHERE id = inv.id;
    END IF;
END;
$$;
