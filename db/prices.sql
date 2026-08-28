-- ---------------------------------------------------------------------------
-- Price list
--
-- What the shop charges for each item, so a price can be looked up at the
-- counter rather than remembered. Separate from purchases, which record what
-- was paid to a wholesaler; this is what the customer pays.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS price_items (
  id          CHAR(36)      NOT NULL,
  name        VARCHAR(160)  NOT NULL,
  price       DECIMAL(12,2) NOT NULL,
  -- Optional: "kg", "pkt", "btl" — what the price is per.
  unit        VARCHAR(24)   NULL,
  created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  -- One entry per item; adding an existing name updates its price instead.
  UNIQUE KEY uniq_price_name (name),
  KEY idx_price_name (name),
  CONSTRAINT chk_price_amount CHECK (price >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
