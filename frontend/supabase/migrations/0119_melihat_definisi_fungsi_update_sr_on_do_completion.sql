SELECT pg_get_functiondef(f.oid)
FROM pg_proc f
JOIN pg_namespace n ON n.oid = f.pronamespace
WHERE n.nspname = 'public' AND f.proname = 'update_sr_on_do_completion';