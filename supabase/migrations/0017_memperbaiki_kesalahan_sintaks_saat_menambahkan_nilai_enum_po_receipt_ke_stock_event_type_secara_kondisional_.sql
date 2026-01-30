DO $$
BEGIN
  -- Check if the enum type 'stock_event_type' exists
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stock_event_type') THEN
    CREATE TYPE stock_event_type AS ENUM ('IN', 'OUT', 'ADJUSTMENT', 'TRANSFER');
  END IF;

  -- Check if 'PO_RECEIPT' value already exists in 'stock_event_type'
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'stock_event_type') AND enumlabel = 'PO_RECEIPT') THEN
    ALTER TYPE stock_event_type ADD VALUE 'PO_RECEIPT';
  END IF;
END $$;