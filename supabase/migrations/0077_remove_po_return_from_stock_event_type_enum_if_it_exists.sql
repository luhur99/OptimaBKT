DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'stock_event_type') AND enumlabel = 'PO_RETURN') THEN
    ALTER TYPE public.stock_event_type RENAME VALUE 'PO_RETURN' TO 'PO_RETURN_OLD';
  END IF;
END $$;