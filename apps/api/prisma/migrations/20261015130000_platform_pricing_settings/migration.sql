CREATE TABLE "PlatformPricing" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "monthlyPrice" DECIMAL(12,2) NOT NULL DEFAULT 249,
  "yearlyPrice" DECIMAL(12,2) NOT NULL DEFAULT 2490,
  "updatedBy" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PlatformPricing_pkey" PRIMARY KEY ("id")
);
INSERT INTO "PlatformPricing" ("id", "monthlyPrice", "yearlyPrice", "updatedAt")
VALUES ('default', 249, 2490, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
