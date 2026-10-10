ALTER TABLE "Business"
ADD COLUMN IF NOT EXISTS "razorpayKeyId" TEXT,
ADD COLUMN IF NOT EXISTS "razorpayKeySecretEncrypted" TEXT;

ALTER TABLE "SelloraOrder"
ADD COLUMN IF NOT EXISTS "razorpayOrderId" TEXT,
ADD COLUMN IF NOT EXISTS "razorpayPaymentId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "SelloraOrder_razorpayOrderId_key"
ON "SelloraOrder"("razorpayOrderId");

CREATE UNIQUE INDEX IF NOT EXISTS "SelloraOrder_razorpayPaymentId_key"
ON "SelloraOrder"("razorpayPaymentId");
