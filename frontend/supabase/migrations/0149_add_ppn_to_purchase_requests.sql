-- Add ppn (PPN 11% toggle) column to purchase_requests table
ALTER TABLE purchase_requests
  ADD COLUMN IF NOT EXISTS ppn BOOLEAN NOT NULL DEFAULT FALSE;
