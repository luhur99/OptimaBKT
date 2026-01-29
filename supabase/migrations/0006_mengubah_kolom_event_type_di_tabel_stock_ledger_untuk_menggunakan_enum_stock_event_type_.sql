ALTER TABLE public.stock_ledger
ALTER COLUMN event_type TYPE stock_event_type USING event_type::text::stock_event_type;