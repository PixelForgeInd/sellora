CREATE TABLE "SelloraOrder" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "catalogueId" TEXT NOT NULL,
  "customerName" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT NOT NULL,
  "address" TEXT,
  "notes" TEXT,
  "currency" TEXT NOT NULL,
  "subtotal" DECIMAL(12,2) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SelloraOrder_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "SelloraOrderItem" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "productId" TEXT,
  "productName" TEXT NOT NULL,
  "sku" TEXT,
  "unit" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unitPrice" DECIMAL(12,2) NOT NULL,
  "lineTotal" DECIMAL(12,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SelloraOrderItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SelloraOrder_businessId_createdAt_idx" ON "SelloraOrder"("businessId","createdAt");
CREATE INDEX "SelloraOrder_catalogueId_createdAt_idx" ON "SelloraOrder"("catalogueId","createdAt");
CREATE INDEX "SelloraOrderItem_orderId_idx" ON "SelloraOrderItem"("orderId");
ALTER TABLE "SelloraOrder" ADD CONSTRAINT "SelloraOrder_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SelloraOrder" ADD CONSTRAINT "SelloraOrder_catalogueId_fkey" FOREIGN KEY ("catalogueId") REFERENCES "SelloraCatalogue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SelloraOrderItem" ADD CONSTRAINT "SelloraOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "SelloraOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Business" ADD COLUMN "lastOrderNumber" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "SelloraOrder" ADD COLUMN "orderNumber" TEXT;
WITH numbered AS (
  SELECT "id", ROW_NUMBER() OVER (ORDER BY "createdAt", "id") AS "sequence"
  FROM "SelloraOrder" WHERE "orderNumber" IS NULL
)
UPDATE "SelloraOrder" AS orders
SET "orderNumber" = 'ORDER-' || LPAD(numbered."sequence"::TEXT, 5, '0')
FROM numbered WHERE orders."id" = numbered."id";
ALTER TABLE "SelloraOrder" ALTER COLUMN "orderNumber" SET NOT NULL;
CREATE UNIQUE INDEX "SelloraOrder_orderNumber_key" ON "SelloraOrder"("orderNumber");
CREATE TABLE "CatalogueAnalyticsEvent" (
  "id" TEXT NOT NULL,
  "catalogueId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "sessionId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CatalogueAnalyticsEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CatalogueAnalyticsEvent_catalogueId_eventType_createdAt_idx" ON "CatalogueAnalyticsEvent"("catalogueId", "eventType", "createdAt");
CREATE INDEX "CatalogueAnalyticsEvent_catalogueId_sessionId_eventType_idx" ON "CatalogueAnalyticsEvent"("catalogueId", "sessionId", "eventType");
ALTER TABLE "CatalogueAnalyticsEvent" ADD CONSTRAINT "CatalogueAnalyticsEvent_catalogueId_fkey" FOREIGN KEY ("catalogueId") REFERENCES "SelloraCatalogue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
