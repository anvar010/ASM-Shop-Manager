-- ---------------------------------------------------------------------------
-- How a credit repayment came in
--
-- A customer paying their tab back can hand over cash or pay by UPI. The
-- day's cash drawer and UPI totals need to know which. Additive only: every
-- existing repayment becomes 'cash', which is how they were treated before.
-- The app keeps working, recording repayments as before, until this is run.
-- ---------------------------------------------------------------------------

ALTER TABLE bill_credit_payments
  ADD COLUMN IF NOT EXISTS mode ENUM('cash','upi') NOT NULL DEFAULT 'cash';
