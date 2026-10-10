ALTER TABLE "Business"
  ADD COLUMN "razorpayKeyId" TEXT,
  ADD COLUMN "razorpayKeySecretEncrypted" TEXT,
  ADD COLUMN "razorpayWebhookSecretEncrypted" TEXT,
  ADD COLUMN "razorpayTestMode" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "PaymentOrder" (
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

CREATE UNIQUE INDEX "PaymentOrder_razorpayOrderId_key" ON "PaymentOrder"("razorpayOrderId");
CREATE INDEX "PaymentOrder_businessId_createdAt_idx" ON "PaymentOrder"("businessId", "createdAt");
CREATE INDEX "PaymentOrder_status_createdAt_idx" ON "PaymentOrder"("status", "createdAt");

ALTER TABLE "PaymentOrder"
  ADD CONSTRAINT "PaymentOrder_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Business"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
