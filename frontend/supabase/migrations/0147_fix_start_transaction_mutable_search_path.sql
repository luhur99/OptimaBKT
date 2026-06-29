-- Fix security issue: public.start_transaction has a mutable search_path
-- Setting search_path = '' prevents search_path injection attacks where
-- a malicious user could hijack unqualified object references inside the function.
ALTER FUNCTION public.start_transaction() SET search_path = '';
