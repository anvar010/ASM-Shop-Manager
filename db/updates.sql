-- ---------------------------------------------------------------------------
-- ASM Shop Manager — database updates (run once; safe to run again)
--
-- Adds only. Nothing existing is changed, renamed or removed, and every
-- statement checks first, so a second run does nothing.
--
--   1. daily_closings        — the end-of-day drawer count
--   2. bill_credit_payments.mode — cash or UPI on a credit repayment
-- ---------------------------------------------------------------------------

SET NAMES utf8mb4;

-- 1. Daily closing ----------------------------------------------------------

CREATE TABLE IF NOT EXISTS daily_closings (
  closed_on    DATE          NOT NULL,
  -- What the books say the drawer should hold, worked out when it was closed.
  expected     DECIMAL(12,2) NOT NULL,
  -- What was actually counted.
  counted      DECIMAL(12,2) NOT NULL,
  -- counted - expected: negative is a shortage, positive an excess.
  difference   DECIMAL(12,2) NOT NULL,
  -- Cash removed from the drawer when closing (banked, taken home). What is
  -- left, counted - taken_out, is where the next day's drawer starts.
  taken_out    DECIMAL(12,2) NOT NULL DEFAULT 0,
  note         VARCHAR(255)  NULL,
  closed_by    VARCHAR(120)  NOT NULL,
  created_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (closed_on),
  CONSTRAINT chk_closing_counted CHECK (counted >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- For a daily_closings table created before "taken_out" existed.
ALTER TABLE daily_closings
  ADD COLUMN IF NOT EXISTS taken_out DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER difference;

-- 2. How a credit repayment came in -----------------------------------------
-- Every existing repayment becomes 'cash', which is how they were treated.

ALTER TABLE bill_credit_payments
  ADD COLUMN IF NOT EXISTS mode ENUM('cash','upi') NOT NULL DEFAULT 'cash';
