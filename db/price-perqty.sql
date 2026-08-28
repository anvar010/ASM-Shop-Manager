-- The amount a price covers: "100 gram for 30" is price 30, per_qty 100,
-- unit gram. Existing rows default to 1, which is what they already mean.
ALTER TABLE price_items
  ADD COLUMN IF NOT EXISTS per_qty DECIMAL(12,3) NOT NULL DEFAULT 1 AFTER price;
