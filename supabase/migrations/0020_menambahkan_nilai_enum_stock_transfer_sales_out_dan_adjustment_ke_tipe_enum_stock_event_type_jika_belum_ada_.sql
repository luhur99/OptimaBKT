DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stock_event_type') THEN
        CREATE TYPE public.stock_event_type AS ENUM ('PO_RECEIPT', 'STOCK_TRANSFER', 'SALES_OUT', 'ADJUSTMENT');
    ELSE
        -- Add 'STOCK_TRANSFER' if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'stock_event_type') AND enumlabel = 'STOCK_TRANSFER') THEN
            ALTER TYPE public.stock_event_type ADD VALUE 'STOCK_TRANSFER';
        END IF;
        -- Add 'SALES_OUT' if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'stock_event_type') AND enumlabel = 'SALES_OUT') THEN
            ALTER TYPE public.stock_event_type ADD VALUE 'SALES_OUT';
        END IF;
        -- Add 'ADJUSTMENT' if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'stock_event_type') AND enumlabel = 'ADJUSTMENT') THEN
            ALTER TYPE public.stock_event_type ADD VALUE 'ADJUSTMENT';
        END IF;
    END IF;
END
$$;