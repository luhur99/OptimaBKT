DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE public.user_role AS ENUM (
            'SUPER_ADMIN',
            'OPERASIONAL_DIV',
            'SALES_DIV',
            'TECHNICIAN',
            'ACCOUNTING',
            'USER'
        );
    END IF;
END
$$;