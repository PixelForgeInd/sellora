ALTER TABLE "SelloraProduct" ADD COLUMN IF NOT EXISTS "stockEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SelloraProduct" ADD COLUMN IF NOT EXISTS "stockQuantity" DECIMAL(12,3);
ALTER TABLE "SelloraOrder" ADD COLUMN IF NOT EXISTS "customerId" TEXT;
ALTER TABLE "SelloraOrder" ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP(3);
ALTER TABLE "SelloraOrder" ADD COLUMN IF NOT EXISTS "refundStatus" TEXT NOT NULL DEFAULT 'NONE';
ALTER TABLE "SelloraOrder" ADD COLUMN IF NOT EXISTS "razorpayRefundId" TEXT;
CREATE TABLE IF NOT EXISTS "SelloraCustomer" (
  "id" TEXT PRIMARY KEY, "businessId" TEXT NOT NULL REFERENCES "Business"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL, "email" TEXT, "phone" TEXT, "address" TEXT, "city" TEXT, "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
DO $ BEGIN
  ALTER TABLE "SelloraOrder" ADD CONSTRAINT "SelloraOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "SelloraCustomer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $;
CREATE INDEX IF NOT EXISTS "SelloraCustomer_businessId_phone_idx" ON "SelloraCustomer"("businessId","phone");
CREATE INDEX IF NOT EXISTS "SelloraCustomer_businessId_email_idx" ON "SelloraCustomer"("businessId","email");
CREATE INDEX IF NOT EXISTS "SelloraCustomer_businessId_name_idx" ON "SelloraCustomer"("businessId","name");
CREATE INDEX IF NOT EXISTS "SelloraOrder_customerId_createdAt_idx" ON "SelloraOrder"("customerId","createdAt");
CREATE TABLE IF NOT EXISTS "SelloraEnquiry" (
  "id" TEXT PRIMARY KEY, "reference" TEXT NOT NULL UNIQUE,
  "businessId" TEXT NOT NULL REFERENCES "Business"("id") ON DELETE CASCADE,
  "catalogueId" TEXT REFERENCES "SelloraCatalogue"("id") ON DELETE SET NULL,
  "productId" TEXT REFERENCES "SelloraProduct"("id") ON DELETE SET NULL,
  "customerId" TEXT REFERENCES "SelloraCustomer"("id") ON DELETE SET NULL,
  "customerName" TEXT NOT NULL, "email" TEXT, "phone" TEXT, "companyName" TEXT, "message" TEXT,
  "status" TEXT NOT NULL DEFAULT 'NEW', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX IF NOT EXISTS "SelloraEnquiry_businessId_status_createdAt_idx" ON "SelloraEnquiry"("businessId","status","createdAt");
CREATE INDEX IF NOT EXISTS "SelloraEnquiry_businessId_phone_idx" ON "SelloraEnquiry"("businessId","phone");
CREATE TABLE IF NOT EXISTS "SelloraStockMovement" (
  "id" TEXT PRIMARY KEY, "businessId" TEXT NOT NULL REFERENCES "Business"("id") ON DELETE CASCADE,
  "productId" TEXT NOT NULL REFERENCES "SelloraProduct"("id") ON DELETE CASCADE,
  "orderId" TEXT REFERENCES "SelloraOrder"("id") ON DELETE SET NULL,
  "quantityDelta" DECIMAL(12,3) NOT NULL, "reason" TEXT NOT NULL, "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "SelloraStockMovement_businessId_createdAt_idx" ON "SelloraStockMovement"("businessId","createdAt");
CREATE INDEX IF NOT EXISTS "SelloraStockMovement_productId_createdAt_idx" ON "SelloraStockMovement"("productId","createdAt");
CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
  "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "tokenHash" TEXT NOT NULL UNIQUE, "expiresAt" TIMESTAMP(3) NOT NULL, "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "PasswordResetToken_userId_expiresAt_idx" ON "PasswordResetToken"("userId","expiresAt");
CREATE TABLE IF NOT EXISTS "PaymentWebhookEvent" (
  "id" TEXT PRIMARY KEY, "businessId" TEXT NOT NULL REFERENCES "Business"("id") ON DELETE CASCADE,
  "eventId" TEXT NOT NULL, "eventType" TEXT NOT NULL, "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentWebhookEvent_businessId_eventId_key" UNIQUE ("businessId","eventId")
);
CREATE INDEX IF NOT EXISTS "PaymentWebhookEvent_businessId_eventType_processedAt_idx" ON "PaymentWebhookEvent"("businessId","eventType","processedAt");
