import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import path from "node:path";
import fs from "node:fs";
import { Prisma, PrismaClient } from "@prisma/client";
import { z } from "zod";
import { businessSchema, catalogueFieldTemplates } from "./business-schema.js";
import selloraRouter, { requireAuth } from "./sellora.js";
import platformRouter, { indiaEndOfDay } from "./platform.js";

// npm workspace scripts run with apps/api as cwd; load the repository-root .env explicitly.
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
dotenv.config();

const app = express();
const prisma = new PrismaClient();
const port = Number(process.env.API_PORT || 4000);
const webOrigin = process.env.WEB_ORIGIN || "http://localhost:5173";
const allowedOrigins = new Set([
  webOrigin,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5174",
]);
const uploadDir = path.resolve(process.env.UPLOAD_DIR || "./uploads");
fs.mkdirSync(uploadDir, { recursive: true });

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (such as curl/health checks) and configured frontend origins.
    if (!origin || allowedOrigins.has(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`Origin not allowed by CORS: ${origin}`));
  },
}));
app.use(express.json({ limit: "6mb", verify: (req, _res, buffer) => { (req as express.Request & {rawBody?:Buffer}).rawBody = Buffer.from(buffer); } }));
app.use("/uploads", express.static(uploadDir));
app.use("/api", platformRouter);
app.use("/api", selloraRouter);

// Legacy V1 endpoints are explicitly retired; all workspace mutations must use the authenticated API.
app.get("/api/products", (_req, res) => res.status(410).json({ error: "This legacy endpoint is retired. Use the authenticated workspace product API." }));
app.get("/api/products/:id", (_req, res) => res.status(410).json({ error: "This legacy endpoint is retired. Use the authenticated workspace product API." }));
app.post("/api/products", (_req, res) => res.status(410).json({ error: "This legacy endpoint is retired. Use the authenticated workspace product API." }));
app.patch("/api/products/:id", (_req, res) => res.status(410).json({ error: "This legacy endpoint is retired. Use the authenticated workspace product API." }));
app.post("/api/catalogues/upload", (_req, res) => res.status(410).json({ error: "PDF flipbook upload is not part of the current Sellora MVP." }));
app.get("/api/enquiries", (_req, res) => res.status(410).json({ error: "Legacy global enquiry administration is retired." }));
app.patch("/api/enquiries/:id/status", (_req, res) => res.status(410).json({ error: "Legacy global enquiry administration is retired." }));

app.get("/api/health", (_req, res) => res.json({ ok: true, service: "sellora-api" }));

app.post("/api/businesses", requireAuth, async (req, res, next) => {
  try {
    const data = businessSchema.parse(req.body);
    const slug = (data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")).slice(0, 80);
    const templates = catalogueFieldTemplates[data.productCategory] || catalogueFieldTemplates.other;
    const business = await prisma.business.create({
      data: {
        ownerUserId: (req as express.Request & { userId: string }).userId,
        name: data.name, slug, industry: data.industry, productCategory: data.productCategory,
        businessModel: data.businessModel, email: data.email || null, phone: data.phone || null,
        website: data.website || null, brandColor: data.brandColor,
        catalogueFields: { create: templates.map((field, index) => ({
          key: field.key, label: field.label, type: field.type, required: field.required || false,
          options: field.options ? field.options : undefined, sortOrder: index
        })) },
        subscription: { create: {
          status: "ACTIVE", interval: "MONTHLY", amount: 249, currency: "INR",
          currentPeriodStart: new Date(),
          currentPeriodEnd: indiaEndOfDay(new Date(), 1),
          dueAt: indiaEndOfDay(new Date(), 1)
        } }
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
      where: { ownerUserId: (req as express.Request & { userId: string }).userId },
      include: { catalogueFields: { orderBy: { sortOrder: "asc" } } },
      omit: { razorpayKeySecretEncrypted: true, razorpayWebhookSecretEncrypted: true },
      orderBy: { createdAt: "desc" }, take: 100
    });
    res.json(businesses);
  } catch (error) { next(error); }
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof z.ZodError) return res.status(400).json({ error: "Validation failed", details: error.issues });
  console.error(error);
  res.status(500).json({ error: error instanceof Error ? error.message : "Internal server error" });
});

app.listen(port, () => console.log(`Ganeshaa Sutra API listening on http://localhost:${port}`));
