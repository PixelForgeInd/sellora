ALTER TABLE "Business"
  ADD COLUMN "sellingMode" TEXT NOT NULL DEFAULT 'CATALOG_ONLY',
  ADD COLUMN "paymentGatewayProvider" TEXT,
  ADD COLUMN "paymentGatewayStatus" TEXT NOT NULL DEFAULT 'NOT_CONNECTED';

ALTER TABLE "Business"
  ADD CONSTRAINT "Business_sellingMode_check"
    CHECK ("sellingMode" IN ('CATALOG_ONLY', 'ONLINE_PAYMENTS')),
  ADD CONSTRAINT "Business_paymentGatewayStatus_check"
    CHECK ("paymentGatewayStatus" IN ('NOT_CONNECTED', 'PENDING', 'ACTIVE', 'DISABLED'));
