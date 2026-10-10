import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { Prisma, PrismaClient, EnquiryStatus } from "@prisma/client";
import { z } from "zod";
import { businessSchema, catalogueFieldTemplates } from "./business-schema.js";
import selloraRouter, { requireAuth } from "./sellora.js";

const app = express();
const prisma = new PrismaClient();
const port = Number(process.env.API_PORT || 4000);
const webOrigin = process.env.WEB_ORIGIN || "http://localhost:5173";
const uploadDir = path.resolve(process.env.UPLOAD_DIR || "./uploads");
fs.mkdirSync(uploadDir, { recursive: true });

app.use(cors({ origin: webOrigin }));
app.use(express.json({ limit: "6mb" }));
app.use("/uploads", express.static(uploadDir));
app.use("/api", selloraRouter);

// Legacy V1 admin routes are retired in the SaaS UI. Do not leave their global-data mutations exposed.
app.post("/api/products", (_req, res) => res.status(410).json({ error: "This legacy endpoint is retired. Use the authenticated workspace product API." }));
app.patch("/api/products/:id", (_req, res) => res.status(410).json({ error: "This legacy endpoint is retired. Use the authenticated workspace product API." }));
app.post("/api/catalogues/upload", (_req, res) => res.status(410).json({ error: "PDF flipbook upload is not part of the current Sellora MVP." }));
app.get("/api/enquiries", (_req, res) => res.status(410).json({ error: "Legacy global enquiry administration is retired." }));
app.patch("/api/enquiries/:id/status", (_req, res) => res.status(410).json({ error: "Legacy global enquiry administration is retired." }));

const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 25 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (file.mimetype !== "application/pdf") return callback(new Error("Only PDF files are accepted."));
    callback(null, true);
  }
});


app.get("/api/health", (_req, res) => res.json({ ok: true, service: "sellora-api" }));


app.post("/api/businesses", requireAuth, async (req, res, next) => {
  try {
    const data = businessSchema.parse(req.body);
    const slug = (data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")).slice(0, 80);
    const templates = catalogueFieldTemplates[data.productCategory] || catalogueFieldTemplates.other;
    const business = await prisma.business.create({
      data: {
        ownerUserId: (req as any).userId,
        name: data.name, slug, industry: data.industry, productCategory: data.productCategory,
        businessModel: data.businessModel, email: data.email || null, phone: data.phone || null,
        website: data.website || null, brandColor: data.brandColor,
        catalogueFields: { create: templates.map((field, index) => ({
          key: field.key, label: field.label, type: field.type, required: field.required || false,
          options: field.options ? field.options : undefined, sortOrder: index
        })) }
      },
      include: { catalogueFields: { orderBy: { sortOrder: "asc" } } }
    });
    res.status(201).json(business);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return res.status(409).json({ error: "That catalogue URL name is already in use. Choose another one." });
    }
    next(error);
  }
});

// Internal development endpoint. Authentication and tenant authorization are required before production.
app.get("/api/businesses", requireAuth, async (req, res, next) => {
  try {
    const businesses = await prisma.business.findMany({
      where: { ownerUserId: (req as any).userId },
      include: { catalogueFields: { orderBy: { sortOrder: "asc" } } },
      orderBy: { createdAt: "desc" }, take: 100
    });
    res.json(businesses);
  } catch (error) { next(error); }
});


app.get("/api/products", async (req, res, next) => {
  try {
    const q = String(req.query.q || "").trim();
    const count = String(req.query.count || "").trim();
    const type = String(req.query.type || "").trim();
    const products = await prisma.product.findMany({
      where: {
        isPublished: true,
        ...(count ? { count: { label: count } } : {}),
        ...(type ? { yarnType: { name: type } } : {}),
        ...(q ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { sku: { contains: q, mode: "insensitive" } },
            { count: { label: { contains: q, mode: "insensitive" } } },
            { yarnType: { name: { contains: q, mode: "insensitive" } } },
            { shades: { some: { shade: { OR: [
              { name: { contains: q, mode: "insensitive" } },
              { code: { contains: q, mode: "insensitive" } }
            ] } } } }
          ]
        } : {})
      },
      include: {
        count: true,
        yarnType: true,
        shades: { include: { shade: true } },
        prices: { where: { isPublished: true }, orderBy: { effectiveAt: "desc" }, take: 1 }
      },
      orderBy: { name: "asc" }
    });
    res.json(products.map((p) => ({
      id: p.id, sku: p.sku, name: p.name, description: p.description,
      count: p.count.label, yarnType: p.yarnType.name, availability: p.availability,
      shades: p.shades.map((s) => ({ id: s.shade.id, name: s.shade.name, code: s.shade.code, hexColor: s.shade.hexColor })),
      price: p.prices[0] ? { amount: p.prices[0].amount.toString(), currency: p.prices[0].currency, unit: p.prices[0].unit } : null
    })));
  } catch (error) { next(error); }
});

app.get("/api/products/:id", async (req, res, next) => {
  try {
    const p = await prisma.product.findFirst({
      where: { id: req.params.id, isPublished: true },
      include: {
        count: true, yarnType: true,
        shades: { include: { shade: true } },
        prices: { where: { isPublished: true }, orderBy: { effectiveAt: "desc" }, take: 1 }
      }
    });
    if (!p) return res.status(404).json({ error: "Product not found" });
    res.json({
      id: p.id, sku: p.sku, name: p.name, description: p.description,
      count: p.count.label, yarnType: p.yarnType.name, availability: p.availability,
      shades: p.shades.map((s) => s.shade),
      price: p.prices[0] ? { amount: p.prices[0].amount.toString(), currency: p.prices[0].currency, unit: p.prices[0].unit } : null
    });
  } catch (error) { next(error); }
});

// Development foundation only: protect admin endpoints with authentication before production.
const productSchema = z.object({
  sku: z.string().min(1).max(64),
  name: z.string().min(1).max(160),
  description: z.string().max(2000).optional(),
  count: z.string().min(1),
  yarnType: z.string().min(1),
  price: z.number().positive().optional(),
  unit: z.string().min(1).default("kg"),
  isPublished: z.boolean().default(false)
});

app.post("/api/products", async (req, res, next) => {
  try {
    const data = productSchema.parse(req.body);
    const count = await prisma.yarnCount.upsert({ where: { label: data.count }, update: {}, create: { label: data.count } });
    const yarnType = await prisma.yarnType.upsert({ where: { name: data.yarnType }, update: {}, create: { name: data.yarnType } });
    const product = await prisma.product.create({
      data: {
        sku: data.sku, name: data.name, description: data.description,
        countId: count.id, yarnTypeId: yarnType.id, isPublished: data.isPublished,
        ...(data.price ? { prices: { create: { amount: new Prisma.Decimal(data.price), unit: data.unit, isPublished: true } } } : {})
      }
    });
    res.status(201).json(product);
  } catch (error) { next(error); }
});

app.patch("/api/products/:id", async (req, res, next) => {
  try {
    const body = z.object({
      name: z.string().min(1).optional(),
      description: z.string().max(2000).nullable().optional(),
      isPublished: z.boolean().optional(),
      availability: z.enum(["AVAILABLE", "LIMITED", "UNAVAILABLE", "CONTACT"]).optional(),
      price: z.number().positive().optional()
    }).parse(req.body);
    const { price, ...fields } = body;
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: {
        ...fields,
        ...(price !== undefined ? { prices: { create: { amount: new Prisma.Decimal(price), unit: "kg", isPublished: true } } } : {})
      }
    });
    res.json(product);
  } catch (error) { next(error); }
});

app.post("/api/catalogues/upload", upload.single("pdf"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Choose a PDF file." });
    const title = String(req.body.title || req.file.originalname).slice(0, 160);
    const catalogue = await prisma.catalogue.create({
      data: {
        title, originalName: req.file.originalname, filePath: req.file.filename,
        mimeType: req.file.mimetype, fileSize: req.file.size, isPublished: req.body.isPublished === "true"
      }
    });
    res.status(201).json({ ...catalogue, url: `/uploads/${req.file.filename}` });
  } catch (error) { next(error); }
});

const enquirySchema = z.object({
  customerName: z.string().trim().min(2).max(120),
  businessName: z.string().trim().max(160).optional(),
  phone: z.string().trim().min(7).max(30),
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().max(100).optional(),
  message: z.string().trim().max(2000).optional(),
  items: z.array(z.object({
    productId: z.string().min(1),
    shadeName: z.string().max(100).optional(),
    quantity: z.number().positive().max(1000000),
    unit: z.string().min(1).max(20).default("kg")
  })).min(1).max(50)
});

app.post("/api/enquiries", async (req, res, next) => {
  try {
    const data = enquirySchema.parse(req.body);
    const productIds = [...new Set(data.items.map((i) => i.productId))];
    const products = await prisma.product.findMany({ where: { id: { in: productIds }, isPublished: true } });
    if (products.length !== productIds.length) return res.status(400).json({ error: "One or more products are unavailable." });
    const productMap = new Map(products.map((p) => [p.id, p]));
    const reference = `GS-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
    const enquiry = await prisma.enquiry.create({
      data: {
        reference, customerName: data.customerName, businessName: data.businessName,
        phone: data.phone, city: data.city, state: data.state, message: data.message,
        items: { create: data.items.map((item) => ({
          productId: item.productId, productName: productMap.get(item.productId)!.name,
          shadeName: item.shadeName, quantity: new Prisma.Decimal(item.quantity), unit: item.unit
        })) }
      },
      include: { items: true }
    });
    res.status(201).json({ reference: enquiry.reference, message: "Enquiry saved successfully." });
  } catch (error) { next(error); }
});

// Development foundation only: protect this endpoint before production.
app.get("/api/enquiries", async (_req, res, next) => {
  try {
    const enquiries = await prisma.enquiry.findMany({ include: { items: true }, orderBy: { createdAt: "desc" }, take: 200 });
    res.json(enquiries);
  } catch (error) { next(error); }
});

app.patch("/api/enquiries/:id/status", async (req, res, next) => {
  try {
    const body = z.object({ status: z.nativeEnum(EnquiryStatus) }).parse(req.body);
    const enquiry = await prisma.enquiry.update({ where: { id: req.params.id }, data: { status: body.status } });
    res.json(enquiry);
  } catch (error) { next(error); }
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof z.ZodError) return res.status(400).json({ error: "Validation failed", details: error.issues });
  if (error instanceof multer.MulterError) return res.status(400).json({ error: error.message });
  console.error(error);
  res.status(500).json({ error: error instanceof Error ? error.message : "Internal server error" });
});

app.listen(port, () => console.log(`Ganeshaa Sutra API listening on http://localhost:${port}`));
