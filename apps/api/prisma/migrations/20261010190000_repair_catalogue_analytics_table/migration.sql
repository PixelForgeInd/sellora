-- Repair databases where the checkout migration was marked as applied
-- even though the catalogue analytics table was never created.
CREATE TABLE IF NOT EXISTS "CatalogueAnalyticsEvent" (
  "id" TEXT NOT NULL,
  "catalogueId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "sessionId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CatalogueAnalyticsEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CatalogueAnalyticsEvent_catalogueId_eventType_createdAt_idx"
ON "CatalogueAnalyticsEvent"("catalogueId", "eventType", "createdAt");

CREATE INDEX IF NOT EXISTS "CatalogueAnalyticsEvent_catalogueId_sessionId_eventType_idx"
ON "CatalogueAnalyticsEvent"("catalogueId", "sessionId", "eventType");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'CatalogueAnalyticsEvent_catalogueId_fkey'
      AND conrelid = '"CatalogueAnalyticsEvent"'::regclass
  ) THEN
    ALTER TABLE "CatalogueAnalyticsEvent"
    ADD CONSTRAINT "CatalogueAnalyticsEvent_catalogueId_fkey"
    FOREIGN KEY ("catalogueId") REFERENCES "SelloraCatalogue"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
