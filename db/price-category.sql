-- Categories for the price list. Nullable, so every existing item keeps its
-- price and simply has no category until one is chosen.
ALTER TABLE price_items
  ADD COLUMN IF NOT EXISTS category VARCHAR(60) NULL AFTER name,
  ADD KEY IF NOT EXISTS idx_price_category (category);
