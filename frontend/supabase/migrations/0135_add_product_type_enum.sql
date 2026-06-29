-- Create the product_type enum if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_type') THEN
        CREATE TYPE public.product_type AS ENUM ('GOODS', 'SERVICE');
    END IF;
END
$$;

-- Add product_type column to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS product_type public.product_type NOT NULL DEFAULT 'GOODS';

-- Create an index for performance
CREATE INDEX IF NOT EXISTS idx_products_product_type ON public.products(product_type);
