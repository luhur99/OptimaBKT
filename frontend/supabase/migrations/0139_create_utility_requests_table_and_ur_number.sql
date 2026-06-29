-- Create utility_requests table and UR number generator
CREATE TABLE IF NOT EXISTS public.utility_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ur_number TEXT UNIQUE,
  item_name TEXT NOT NULL,
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC NOT NULL CHECK (unit_price >= 0),
  total_price NUMERIC NOT NULL CHECK (total_price >= 0),
  supplier_name TEXT,
  supplier_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  notes TEXT,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE SEQUENCE IF NOT EXISTS public.ur_number_seq;

CREATE OR REPLACE FUNCTION public.generate_ur_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_date_str TEXT;
  v_sequence BIGINT;
  v_ur_number TEXT;
BEGIN
  IF NEW.ur_number IS NULL OR TRIM(NEW.ur_number) = '' THEN
    v_date_str := to_char(current_date, 'YYMMDD');
    SELECT nextval('ur_number_seq') INTO v_sequence;
    v_ur_number := 'UR-' || v_date_str || '-' || LPAD(v_sequence::TEXT, 4, '0');
    NEW.ur_number := v_ur_number;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_ur_number_before_insert ON public.utility_requests;
CREATE TRIGGER set_ur_number_before_insert
BEFORE INSERT ON public.utility_requests
FOR EACH ROW EXECUTE FUNCTION public.generate_ur_number();

-- Enable RLS and add policies for utility_requests
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'utility_requests') THEN
    EXECUTE 'ALTER TABLE public.utility_requests ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'utility_requests') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Utility requests: view" ON public.utility_requests';
    EXECUTE 'DROP POLICY IF EXISTS "Utility requests: insert" ON public.utility_requests';
    EXECUTE 'DROP POLICY IF EXISTS "Utility requests: update" ON public.utility_requests';
    EXECUTE 'DROP POLICY IF EXISTS "Utility requests: delete" ON public.utility_requests';
  END IF;

  EXECUTE 'CREATE POLICY "Utility requests: view" ON public.utility_requests
    FOR SELECT TO authenticated
    USING (
      auth.uid() = user_id OR
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (''SUPER_ADMIN'',''OPERASIONAL_DIV'',''SALES_DIV''))
    )';

  EXECUTE 'CREATE POLICY "Utility requests: insert" ON public.utility_requests
    FOR INSERT TO authenticated
    WITH CHECK (
      user_id IS NOT NULL AND auth.uid() = user_id AND
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (''SUPER_ADMIN'',''OPERASIONAL_DIV'',''SALES_DIV''))
    )';

  EXECUTE 'CREATE POLICY "Utility requests: update" ON public.utility_requests
    FOR UPDATE TO authenticated
    USING (
      auth.uid() = user_id OR
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (''SUPER_ADMIN'',''OPERASIONAL_DIV''))
    )';

  EXECUTE 'CREATE POLICY "Utility requests: delete" ON public.utility_requests
    FOR DELETE TO authenticated
    USING (
      auth.uid() = user_id OR
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (''SUPER_ADMIN'',''OPERASIONAL_DIV''))
    )';
END $$;
