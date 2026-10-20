CREATE TABLE "Subscription" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "interval" TEXT NOT NULL DEFAULT 'MONTHLY',
  "amount" DECIMAL(12,2) NOT NULL DEFAULT 249,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "currentPeriodStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
  "dueAt" TIMESTAMP(3) NOT NULL,
  "lastPaidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Subscription_businessId_key" ON "Subscription"("businessId");
CREATE INDEX "Subscription_status_dueAt_idx" ON "Subscription"("status", "dueAt");
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "PlatformSubscriptionPayment" (
  "id" TEXT NOT NULL,
  "subscriptionId" TEXT NOT NULL,
  "interval" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "razorpayOrderId" TEXT NOT NULL,
  "razorpayPaymentId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'CREATED',
  "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PlatformSubscriptionPayment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PlatformSubscriptionPayment_razorpayOrderId_key" ON "PlatformSubscriptionPayment"("razorpayOrderId");
CREATE UNIQUE INDEX "PlatformSubscriptionPayment_razorpayPaymentId_key" ON "PlatformSubscriptionPayment"("razorpayPaymentId");
CREATE INDEX "PlatformSubscriptionPayment_subscriptionId_createdAt_idx" ON "PlatformSubscriptionPayment"("subscriptionId", "createdAt");
CREATE INDEX "PlatformSubscriptionPayment_status_createdAt_idx" ON "PlatformSubscriptionPayment"("status", "createdAt");
ALTER TABLE "PlatformSubscriptionPayment" ADD CONSTRAINT "PlatformSubscriptionPayment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "PlatformAuditEvent" (
  "id" TEXT NOT NULL,
  "subscriptionId" TEXT,
  "actorUserId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "details" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlatformAuditEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PlatformAuditEvent_subscriptionId_createdAt_idx" ON "PlatformAuditEvent"("subscriptionId", "createdAt");
CREATE INDEX "PlatformAuditEvent_actorUserId_createdAt_idx" ON "PlatformAuditEvent"("actorUserId", "createdAt");
ALTER TABLE "PlatformAuditEvent" ADD CONSTRAINT "PlatformAuditEvent_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Existing businesses receive a 30-day initial active period; no tenant is unexpectedly locked by this migration.
INSERT INTO "Subscription" (
  "id", "businessId", "status", "interval", "amount", "currency",
  "currentPeriodStart", "currentPeriodEnd", "dueAt", "createdAt", "updatedAt"
)
SELECT
  'sub_' || md5(b."id"),
  b."id",
  'ACTIVE',
  'MONTHLY',
  249,
  'INR',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP + INTERVAL '30 days',
  CURRENT_TIMESTAMP + INTERVAL '30 days',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Business" b
ON CONFLICT ("businessId") DO NOTHING;
