-- Add PARTIAL_RECEIVED to po_status enum if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'po_status' AND enum_range('po_status') @> ARRAY['PARTIAL_RECEIVED']::po_status[]) THEN
        ALTER TYPE po_status ADD VALUE 'PARTIAL_RECEIVED';
    END IF;
END
$$;

-- Drop the old trigger that only runs when PO status is CLOSED
DROP TRIGGER IF EXISTS tr_add_po ON public.purchase_orders;

-- Drop the old function as its logic will be replaced by a more granular item-level trigger
DROP FUNCTION IF EXISTS public.fn_add_po_to_inventory();