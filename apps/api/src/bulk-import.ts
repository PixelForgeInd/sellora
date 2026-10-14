import { Router, Request, Response, NextFunction } from "express";
import { PrismaClient, Prisma } from "@prisma/client";
import { z } from "zod";
import { requireAuth } from "./sellora.js";

const router = Router();
const prisma = new PrismaClient();

type AuthenticatedRequest = Request & { userId: string };

const importRequestSchema = z.object({
  mode: z.enum(["CREATE_ONLY", "UPSERT"]),
  commit: z.boolean().default(false),
  rows: z.array(z.record(z.string(), z.unknown())).min(1).max(1000),
}).strict();

const stringValue = (value: unknown) =>
  value == null ? "" : String(value).trim();

function rowToProduct(row: Record<string, unknown>, rowNumber: number) {
  const errors: string[] = [];
  const name = stringValue(row.name);
  const sku = stringValue(row.sku) || null;
  const description = stringValue(row.description) || null;
  const currency = (stringValue(row.currency) || "INR").toUpperCase();
  const unit = stringValue(row.unit) || "piece";
  const imageUrl = stringValue(row.imageUrl) || null;

  if (!name) errors.push("Name is required.");
  if (name.length > 180) errors.push("Name must be 180 characters or fewer.");
  if (sku && sku.length > 100) errors.push("SKU must be 100 characters or fewer.");
  if (description && description.length > 5000) errors.push("Description must be 5,000 characters or fewer.");
  if (!/^[A-Z]{3}$/.test(currency)) errors.push("Currency must be a three-letter ISO code.");

  let price: string | null = null;
  const rawPrice = stringValue(row.price);
  if (rawPrice) {
    if (!/^\d+(\.\d{1,2})?$/.test(rawPrice) || !Number.isFinite(Number(rawPrice)) || Number(rawPrice) < 0) {
      errors.push("Price must be a non-negative number with up to two decimal places.");
    } else {
      price = rawPrice;
    }
  }

  let stockQuantity: string | null = null;
  const rawStock = stringValue(row.stockQuantity);
  if (rawStock) {
    if (!/^\d+(\.\d{1,3})?$/.test(rawStock) || !Number.isFinite(Number(rawStock)) || Number(rawStock) < 0) {
      errors.push("Stock quantity must be a non-negative number with up to three decimal places.");
    } else {
      stockQuantity = rawStock;
    }
  }

  let image: string | null = imageUrl;
  if (imageUrl) {
    try {
      const parsed = new URL(imageUrl);
      if (!["https:", "http:"].includes(parsed.protocol)) errors.push("Image URL must use HTTP or HTTPS.");
    } catch {
      errors.push("Image URL must be a valid HTTP or HTTPS URL.");
    }
  }

  const known = new Set(["name", "sku", "description", "price", "currency", "unit", "imageUrl", "stockEnabled", "stockQuantity"]);
  const fields = Object.fromEntries(Object.entries(row)
    .filter(([key, value]) => !known.has(key) && value !== undefined && value !== null && String(value).trim() !== "")
    .map(([key, value]) => [key, typeof value === "string" ? value.trim() : value]));

  return {
    rowNumber,
    errors,
    data: {
      name,
      sku,
      description,
      currency,
      unit,
      imageUrl: image,
      price,
      stockEnabled: ["true", "yes", "1"].includes(stringValue(row.stockEnabled).toLowerCase()),
      stockQuantity,
      fields,
    },
  };
}

router.post("/workspace/products/bulk-import", requireAuth, async (req, res, next) => {
  try {
    const body = importRequestSchema.parse(req.body);
    const userId = (req as AuthenticatedRequest).userId;
    const business = await prisma.business.findFirst({
      where: { ownerUserId: userId },
      select: { id: true, catalogueFields: { select: { key: true, required: true, label: true } } },
    });
    if (!business) return res.status(409).json({ error: "Complete business setup first." });

    const customKeys = new Set(business.catalogueFields.map(field => field.key));
    const prepared = body.rows.map((row, index) => {
      const result = rowToProduct(row, index + 2);
      for (const key of Object.keys(result.data.fields)) {
        if (!customKeys.has(key)) result.errors.push(`Unknown custom field "${key}". Configure it in business settings first.`);
      }
      for (const field of business.catalogueFields) {
        if (field.required && !stringValue(result.data.fields[field.key])) {
          result.errors.push(`${field.label} is required.`);
        }
      }
      return result;
    });

    const skuRows = new Map<string, number[]>();
    prepared.forEach(row => {
      if (row.data.sku) skuRows.set(row.data.sku, [...(skuRows.get(row.data.sku) || []), row.rowNumber]);
    });
    for (const [sku, rowNumbers] of skuRows) {
      if (rowNumbers.length > 1) {
        for (const row of prepared.filter(item => item.data.sku === sku)) row.errors.push(`SKU "${sku}" is duplicated in rows ${rowNumbers.join(", ")}.`);
      }
    }

    const skus = [...skuRows.keys()];
    const existing = skus.length ? await prisma.selloraProduct.findMany({
      where: { businessId: business.id, sku: { in: skus } },
      select: { sku: true },
    }) : [];
    const existingSkus = new Set(existing.map(product => product.sku).filter((sku): sku is string => Boolean(sku)));
    if (body.mode === "CREATE_ONLY") {
      for (const row of prepared) {
        if (row.data.sku && existingSkus.has(row.data.sku)) row.errors.push(`SKU "${row.data.sku}" already exists. Use UPSERT to update it.`);
      }
    }

    const invalid = prepared.filter(row => row.errors.length > 0);
    const valid = prepared.filter(row => row.errors.length === 0);
    if (!body.commit || invalid.length) {
      return res.status(invalid.length ? 422 : 200).json({
        mode: body.mode,
        committed: false,
        totalRows: prepared.length,
        validRows: valid.length,
        invalidRows: invalid.length,
        rows: prepared.map(row => ({ rowNumber: row.rowNumber, valid: row.errors.length === 0, errors: row.errors })),
        message: invalid.length ? "Fix the listed rows and submit the preview again." : "Validation passed. Submit with commit=true to import these rows.",
      });
    }

    const result = await prisma.$transaction(async tx => {
      let created = 0;
      let updated = 0;
      for (const row of valid) {
        const data = {
          name: row.data.name,
          sku: row.data.sku,
          description: row.data.description,
          currency: row.data.currency,
          unit: row.data.unit,
          imageUrl: row.data.imageUrl,
          price: row.data.price === null ? null : new Prisma.Decimal(row.data.price),
          stockEnabled: row.data.stockEnabled,
          stockQuantity: row.data.stockQuantity === null ? null : new Prisma.Decimal(row.data.stockQuantity),
          fields: row.data.fields as Prisma.InputJsonValue,
        };
        const match = body.mode === "UPSERT" && row.data.sku
          ? await tx.selloraProduct.findFirst({ where: { businessId: business.id, sku: row.data.sku }, select: { id: true } })
          : null;
        if (match) {
          await tx.selloraProduct.update({ where: { id: match.id }, data });
          updated += 1;
        } else {
          await tx.selloraProduct.create({ data: { ...data, businessId: business.id } });
          created += 1;
        }
      }
      return { created, updated };
    });

    return res.status(200).json({
      mode: body.mode,
      committed: true,
      totalRows: prepared.length,
      ...result,
      invalidRows: 0,
      message: "Products imported successfully.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid import payload.", details: error.issues });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return res.status(409).json({ error: "A product with this SKU already exists. Refresh the preview and try again." });
    }
    next(error);
  }
});

export default router;
