-- ---------------------------------------------------------------------------
-- Price list categories
--
-- Categories used to live only as a column on price_items, which meant a
-- category existed only as long as something was filed under it: empty the
-- price list and the shop's shelves went with it. They are their own rows now,
-- so a heading survives having nothing under it.
--
-- price_items.category stays as the link. It is free text rather than a
-- foreign key so an item is never blocked by a missing heading; renaming and
-- removing a category updates both sides together.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS price_categories (
  name        VARCHAR(60) NOT NULL,
  created_at  TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Carry over every heading already in use, so nothing is lost on first deploy.
INSERT IGNORE INTO price_categories (name)
SELECT DISTINCT TRIM(category) FROM price_items
WHERE category IS NOT NULL AND TRIM(category) <> '';
