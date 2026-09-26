-- ---------------------------------------------------------------------------
-- Daily closing
--
-- At the end of the day the owner counts the drawer and enters the figure. The
-- app works out what the drawer should hold (cash sales, plus cash paid back
-- against credit, minus expenses) and keeps both, with the difference, so a
-- shortage or an excess is on record against the day it happened.
--
-- One row per day. Closing a day again replaces its row.
-- New table only: nothing existing is changed. Safe to run more than once, and
-- if an earlier copy of this table exists it is brought up to date below.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS daily_closings (
  closed_on    DATE          NOT NULL,
  -- What the books say the drawer should hold, worked out when it was closed.
  expected     DECIMAL(12,2) NOT NULL,
  -- What was actually counted.
  counted      DECIMAL(12,2) NOT NULL,
  -- counted - expected: negative is a shortage, positive an excess.
  difference   DECIMAL(12,2) NOT NULL,
  -- Cash removed from the drawer when closing (banked, taken home). What is left,
  -- counted - taken_out, is where the next day's drawer starts.
  taken_out    DECIMAL(12,2) NOT NULL DEFAULT 0,
  note         VARCHAR(255)  NULL,
  closed_by    VARCHAR(120)  NOT NULL,
  created_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (closed_on),
  CONSTRAINT chk_closing_counted CHECK (counted >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- For a table created before "taken_out" existed.
ALTER TABLE daily_closings
  ADD COLUMN IF NOT EXISTS taken_out DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER difference;
