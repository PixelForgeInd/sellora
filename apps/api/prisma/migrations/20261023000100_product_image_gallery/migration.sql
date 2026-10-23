ALTER TABLE "SelloraProduct" ADD COLUMN "imageUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
UPDATE "SelloraProduct" SET "imageUrls" = ARRAY["imageUrl"] WHERE "imageUrl" IS NOT NULL AND "imageUrl" <> '';
