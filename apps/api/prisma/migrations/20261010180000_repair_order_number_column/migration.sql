-- Repair databases where the checkout migration was recorded as applied
-- but the orderNumber column or unique index is missing.
ALTER TABLE "SelloraOrder"
ADD COLUMN IF NOT EXISTS "orderNumber" TEXT;

WITH numbered AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (ORDER BY "createdAt", "id") AS "sequence"
  FROM "SelloraOrder"
  WHERE "orderNumber" IS NULL
)
UPDATE "SelloraOrder" AS orders
SET "orderNumber" = 'ORDER-' || LPAD(numbered."sequence"::TEXT, 5, '0')
FROM numbered
WHERE orders."id" = numbered."id";

ALTER TABLE "SelloraOrder"
ALTER COLUMN "orderNumber" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "SelloraOrder_orderNumber_key"
ON "SelloraOrder"("orderNumber");
