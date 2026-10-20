ALTER TABLE "Business"
  ADD COLUMN IF NOT EXISTS "subscriptionStatus" TEXT NOT NULL DEFAULT 'TRIAL',
  ADD COLUMN IF NOT EXISTS "subscriptionInterval" TEXT,
  ADD COLUMN IF NOT EXISTS "subscriptionCurrentPeriodEnd" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "subscriptionLastPaidAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "SubscriptionPayment" (
  "id" TEXT PRIMARY KEY,
  "businessId" TEXT NOT NULL REFERENCES "Business"("id") ON DELETE CASCADE,
  "interval" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "razorpayOrderId" TEXT NOT NULL UNIQUE,
  "razorpayPaymentId" TEXT UNIQUE,
  "status" TEXT NOT NULL DEFAULT 'CREATED',
  "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX IF NOT EXISTS "SubscriptionPayment_businessId_createdAt_idx" ON "SubscriptionPayment"("businessId","createdAt");
CREATE INDEX IF NOT EXISTS "SubscriptionPayment_status_createdAt_idx" ON "SubscriptionPayment"("status","createdAt");
