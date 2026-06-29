SELECT
    inv.id AS invoice_id,
    inv.invoice_number,
    inv.invoice_date,
    inv.total_amount,
    inv.payment_status,
    inv.invoice_status AS invoice_document_status,
    sr.id AS scheduling_request_id,
    sr.sr_number,
    sr.status AS scheduling_request_status,
    sr.invoice_status AS scheduling_request_invoice_status
FROM
    public.invoices inv
LEFT JOIN
    public.scheduling_requests sr ON inv.id = sr.invoice_id
WHERE
    inv.invoice_number = 'NOMOR_INVOICE_ANDA_DI_SINI';