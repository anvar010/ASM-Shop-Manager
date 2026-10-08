-- Optional wholesale price for a listed item. It covers the same amount and
-- unit as the retail price (per_qty / unit), so no second quantity is stored.
-- NULL means no wholesale price has been set.
ALTER TABLE price_items
  ADD COLUMN IF NOT EXISTS wholesale_price DECIMAL(12,2) NULL AFTER price;
