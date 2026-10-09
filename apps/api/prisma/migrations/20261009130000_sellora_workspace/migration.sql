ALTER TABLE "Business" ADD COLUMN "ownerUserId" TEXT;
ALTER TABLE "Business" ADD CONSTRAINT "Business_ownerUserId_fkey"
  FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Business_ownerUserId_idx" ON "Business"("ownerUserId");

CREATE TABLE "SelloraProduct" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "sku" TEXT,
  "description" TEXT,
  "price" DECIMAL(12,2),
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "unit" TEXT NOT NULL DEFAULT 'piece',
  "imageUrl" TEXT,
  "fields" JSONB NOT NULL DEFAULT '{}',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SelloraProduct_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SelloraProduct_businessId_createdAt_idx" ON "SelloraProduct"("businessId","createdAt");
CREATE INDEX "SelloraProduct_businessId_name_idx" ON "SelloraProduct"("businessId","name");
ALTER TABLE "SelloraProduct" ADD CONSTRAINT "SelloraProduct_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "SelloraCatalogue" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "isPublished" BOOLEAN NOT NULL DEFAULT false,
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SelloraCatalogue_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SelloraCatalogue_slug_key" ON "SelloraCatalogue"("slug");
CREATE INDEX "SelloraCatalogue_businessId_createdAt_idx" ON "SelloraCatalogue"("businessId","createdAt");
ALTER TABLE "SelloraCatalogue" ADD CONSTRAINT "SelloraCatalogue_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CatalogueProduct" (
  "id" TEXT NOT NULL,
  "catalogueId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "CatalogueProduct_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CatalogueProduct_catalogueId_productId_key" ON "CatalogueProduct"("catalogueId","productId");
CREATE INDEX "CatalogueProduct_catalogueId_sortOrder_idx" ON "CatalogueProduct"("catalogueId","sortOrder");
ALTER TABLE "CatalogueProduct" ADD CONSTRAINT "CatalogueProduct_catalogueId_fkey"
  FOREIGN KEY ("catalogueId") REFERENCES "SelloraCatalogue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CatalogueProduct" ADD CONSTRAINT "CatalogueProduct_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "SelloraProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
