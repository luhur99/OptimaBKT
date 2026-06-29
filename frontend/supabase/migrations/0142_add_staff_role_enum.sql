-- Add STAFF to user_role enum.
-- STAFF is a limited role: can only create and view their own utility requests.
-- NOTE: ALTER TYPE ADD VALUE cannot run inside a transaction block in PostgreSQL < 14.
-- Supabase uses PG15+ so this is safe.
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'STAFF';
