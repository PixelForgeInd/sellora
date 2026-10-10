ALTER TABLE "Business"
  ADD COLUMN IF NOT EXISTS "razorpayKeyId" TEXT,
  ADD COLUMN IF NOT EXISTS "razorpayKeySecretEncrypted" TEXT,
  ADD COLUMN IF NOT EXISTS "razorpayWebhookSecretEncrypted" TEXT,
  ADD COLUMN IF NOT EXISTS "razorpayTestMode" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS "PaymentOrder" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "catalogueId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "productName" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unit" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "customerName" TEXT NOT NULL,
  "customerEmail" TEXT,
  "customerPhone" TEXT NOT NULL,
  "razorpayOrderId" TEXT NOT NULL,
  "razorpayPaymentId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'CREATED',
  "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PaymentOrder_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PaymentOrder_razorpayOrderId_key" ON "PaymentOrder"("razorpayOrderId");
CREATE INDEX IF NOT EXISTS "PaymentOrder_businessId_createdAt_idx" ON "PaymentOrder"("businessId", "createdAt");
CREATE INDEX IF NOT EXISTS "PaymentOrder_status_createdAt_idx" ON "PaymentOrder"("status", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PaymentOrder_businessId_fkey'
  ) THEN
    ALTER TABLE "PaymentOrder"
      ADD CONSTRAINT "PaymentOrder_businessId_fkey"
      FOREIGN KEY ("businessId") REFERENCES "Business"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
