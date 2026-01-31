CREATE OR REPLACE FUNCTION public.calc_po_item_subtotal()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.subtotal := NEW.qty_request * NEW.harga_beli_satuan;
    NEW.qty_balance := NEW.qty_request - NEW.qty_received;
    IF NEW.qty_balance < 0 THEN
        NEW.qty_balance := 0; -- Ensure balance doesn't go negative
    END IF;
    RETURN NEW;
END;
$function$;