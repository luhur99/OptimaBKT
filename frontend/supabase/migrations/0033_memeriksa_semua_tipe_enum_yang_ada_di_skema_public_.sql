SELECT
    t.typname AS enum_type_name,
    e.enumlabel AS enum_value
FROM
    pg_type t
JOIN
    pg_enum e ON t.oid = e.enumtypid
JOIN
    pg_namespace n ON t.typnamespace = n.oid
WHERE
    n.nspname = 'public'
ORDER BY
    enum_type_name, enum_value;