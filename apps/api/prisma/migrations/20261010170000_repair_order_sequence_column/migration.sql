-- Repair databases where the original order-sequence migration was recorded
-- as applied but the Business counter column is missing.
ALTER TABLE "Business"
ADD COLUMN IF NOT EXISTS "lastOrderNumber" INTEGER NOT NULL DEFAULT 0;
