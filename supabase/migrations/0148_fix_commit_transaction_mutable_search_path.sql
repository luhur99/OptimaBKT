-- Fix security issue: public.commit_transaction has a mutable search_path
-- Setting search_path = '' prevents search_path injection attacks.
ALTER FUNCTION public.commit_transaction() SET search_path = '';
