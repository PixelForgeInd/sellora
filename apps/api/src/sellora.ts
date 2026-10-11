import { Router, Request, Response, NextFunction } from "express";
import { PrismaClient, Prisma } from "@prisma/client";
import { z } from "zod";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import { promisify } from "node:util";

const router = Router();
const prisma = new PrismaClient();
const imageUploadDir = path.resolve(process.env.UPLOAD_DIR || "./uploads");
fs.mkdirSync(imageUploadDir, { recursive: true });
const productImageUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, imageUploadDir),
    filename: (_req, file, callback) => {
      const ext = ({ "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif" } as Record<string,string>)[file.mimetype];
      callback(null, crypto.randomUUID() + ext);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => callback(null, ["image/jpeg","image/png","image/webp","image/gif"].includes(file.mimetype))
});



function razorpayEncryptionKey(): Buffer {
  const configured = process.env.RAZORPAY_ENCRYPTION_KEY || "";
  const key = /^[a-fA-F0-9]{64}$/.test(configured)
    ? Buffer.from(configured, "hex")
    : Buffer.from(configured, "base64");
  if (key.length !== 32) throw new Error("Set RAZORPAY_ENCRYPTION_KEY to a 32-byte base64 or 64-character hex key.");
  return key;
}
function encryptGatewaySecret(value: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", razorpayEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [iv.toString("base64"), cipher.getAuthTag().toString("base64"), encrypted.toString("base64")].join(".");
}
function decryptGatewaySecret(value: string): string {
  const [ivPart, tagPart, encryptedPart] = value.split(".");
  if (!ivPart || !tagPart || !encryptedPart) throw new Error("Stored Razorpay credentials are invalid.");
  const decipher = crypto.createDecipheriv("aes-256-gcm", razorpayEncryptionKey(), Buffer.from(ivPart, "base64"));
  decipher.setAuthTag(Buffer.from(tagPart, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(encryptedPart, "base64")), decipher.final()]).toString("utf8");
}
function paymentEncryptionKey(): Buffer {
  const raw = process.env.PAYMENT_ENCRYPTION_KEY || process.env.RAZORPAY_ENCRYPTION_KEY || "";
  const key = /^[a-fA-F0-9]{64}$/.test(raw)
    ? Buffer.from(raw, "hex")
    : Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("Configure PAYMENT_ENCRYPTION_KEY on the Sellora API server as a 32-byte key.");
  }
  return key;
}
function encryptPaymentSecret(value: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", paymentEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [iv.toString("hex"), cipher.getAuthTag().toString("hex"), encrypted.toString("hex")].join(":");
}
function decryptPaymentSecret(value: string): string {
  const [iv, tag, encrypted] = value.split(":");
  if (!iv || !tag || !encrypted) throw new Error("Stored payment credential is invalid.");
  const decipher = crypto.createDecipheriv("aes-256-gcm", paymentEncryptionKey(), Buffer.from(iv, "hex"));
  decipher.setAuthTag(Buffer.from(tag, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(encrypted, "hex")), decipher.final()]).toString("utf8");
}
function decryptStoredGatewaySecret(value: string): string {
  // Accept secrets saved by both the legacy Razorpay settings form and the current gateway settings form.
  return value.includes(":") ? decryptPaymentSecret(value) : decryptGatewaySecret(value);
}
function safeEqualHex(actual: string, expected: string): boolean {
  const a = Buffer.from(actual, "hex");
  const b = Buffer.from(expected, "hex");
  return a.length === b.length && a.length > 0 && crypto.timingSafeEqual(a, b);
}

async function razorpayRequest<T>(keyId: string, keySecret: string, path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch("https://api.razorpay.com/v1" + path, {
    ...init,
    headers: {
      Authorization: "Basic " + Buffer.from(keyId + ":" + keySecret).toString("base64"),
      "Content-Type": "application/json",
      ...(init.headers || {})
    }
  });
  const result = await response.json().catch(() => ({})) as T & { error?: { description?: string } };
  if (!response.ok) throw new Error(result?.error?.description || "Razorpay request failed.");
  return result;
}

const scrypt = promisify(crypto.scrypt);
const secret = process.env.AUTH_SECRET || "sellora-development-secret-change-before-deployment";
if (process.env.NODE_ENV === "production" && !process.env.AUTH_SECRET) {
  throw new Error("AUTH_SECRET must be configured before running Sellora in production.");
}
const tokenLifetimeSeconds = 60 * 60 * 24 * 7;

type AuthedRequest = Request & { userId?: string };
function tokenFor(userId: string) {
  const payload = Buffer.from(JSON.stringify({ sub: userId, exp: Math.floor(Date.now() / 1000) + tokenLifetimeSeconds })).toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}
export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return res.status(401).json({ error: "Please sign in to continue." });
  const expected = crypto.createHmac("sha256", secret).update(payload).digest();
  let supplied: Buffer;
  try { supplied = Buffer.from(signature, "base64url"); } catch { return res.status(401).json({ error: "Invalid session." }); }
  if (expected.length !== supplied.length || !crypto.timingSafeEqual(expected, supplied)) return res.status(401).json({ error: "Invalid session." });
  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { sub: string; exp: number };
    if (!decoded.sub || decoded.exp < Math.floor(Date.now() / 1000)) return res.status(401).json({ error: "Your session has expired. Please sign in again." });
    req.userId = decoded.sub;
    next();
  } catch { return res.status(401).json({ error: "Invalid session." }); }
}
const authenticated = (handler: (req: AuthedRequest, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => handler(req as AuthedRequest, res, next).catch(next);

async function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, 64) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}
async function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const actual = await scrypt(password, salt, 64) as Buffer;
  const expected = Buffer.from(hash, "hex");
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}
const templates: Record<string, Array<{key:string;label:string;type:string;required?:boolean;options?:string[]}>> = {
  "yarn-textiles": [
    {key:"count",label:"Yarn count",type:"select",required:true,options:["10s","18s","20s OE","2/20s","24s","2/40s"]},
    {key:"yarnType",label:"Yarn type",type:"select",required:true,options:["Recycled OE","Kora CP","Modal","Excel","Cotton","Polyester"]},
    {key:"shade",label:"Shade / colour",type:"text"},
    {key:"composition",label:"Composition",type:"text"},
    {key:"minOrderQuantity",label:"Minimum order quantity",type:"number"}
  ],
  clothing: [
    {key:"size",label:"Sizes available",type:"text"},{key:"colour",label:"Colour",type:"text"},
    {key:"material",label:"Material / fabric",type:"text"},{key:"collection",label:"Collection",type:"select",options:["Men","Women","Unisex","Kids"]},
    {key:"minOrderQuantity",label:"Minimum order quantity",type:"number"}
  ],
  furniture: [
    {key:"material",label:"Material",type:"text",required:true},{key:"dimensions",label:"Dimensions",type:"text"},
    {key:"finish",label:"Finish",type:"text"},{key:"assemblyRequired",label:"Assembly required",type:"select",options:["Yes","No"]}
  ],
  electronics: [
    {key:"brand",label:"Brand",type:"text"},{key:"model",label:"Model number",type:"text",required:true},
    {key:"warranty",label:"Warranty",type:"text"},{key:"specifications",label:"Specifications",type:"textarea"}
  ],
  "food-beverage": [
    {key:"ingredients",label:"Ingredients / composition",type:"textarea",required:true},
    {key:"netWeight",label:"Net weight / volume",type:"text",required:true},
    {key:"shelfLife",label:"Shelf life",type:"text"},
    {key:"dietary",label:"Dietary information",type:"multiselect",options:["Vegetarian","Vegan","Gluten-free","Sugar-free"]},
    {key:"storage",label:"Storage instructions",type:"text"}
  ],
  "beauty-personal-care": [
    {key:"skinType",label:"Suitable skin / hair type",type:"text"},
    {key:"ingredients",label:"Ingredients",type:"textarea",required:true},
    {key:"netVolume",label:"Net volume / weight",type:"text"},
    {key:"fragrance",label:"Fragrance",type:"text"},
    {key:"expiry",label:"Shelf life / expiry",type:"text"}
  ],
  "automotive": [
    {key:"makeModel",label:"Compatible make / model",type:"text",required:true},
    {key:"partNumber",label:"Part number",type:"text"},
    {key:"material",label:"Material",type:"text"},
    {key:"warranty",label:"Warranty",type:"text"},
    {key:"condition",label:"Condition",type:"select",options:["New","Refurbished","Used"]}
  ],
  "healthcare": [
    {key:"manufacturer",label:"Manufacturer",type:"text",required:true},
    {key:"model",label:"Model / reference",type:"text"},
    {key:"specifications",label:"Specifications",type:"textarea"},
    {key:"warranty",label:"Warranty",type:"text"},
    {key:"certification",label:"Certification / compliance",type:"text"}
  ],
  "building-materials": [
    {key:"material",label:"Material / grade",type:"text",required:true},
    {key:"dimensions",label:"Dimensions",type:"text"},
    {key:"finish",label:"Finish",type:"text"},
    {key:"unit",label:"Selling unit",type:"select",options:["piece","bag","kg","tonne","sq ft"]},
    {key:"minOrderQuantity",label:"Minimum order quantity",type:"number"}
  ],
  agriculture: [
    {key:"variety",label:"Variety / crop",type:"text",required:true},
    {key:"grade",label:"Grade / quality",type:"text"},
    {key:"origin",label:"Origin",type:"text"},
    {key:"packaging",label:"Packaging",type:"text"},
    {key:"season",label:"Season / harvest",type:"text"}
  ],
  other: [
    {key:"material",label:"Material",type:"text"},{key:"colour",label:"Colour",type:"text"},
    {key:"size",label:"Size / dimensions",type:"text"},{key:"unit",label:"Selling unit",type:"text"}
  ]
};
const slugify = (value: string) => value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 72) || "catalogue";

router.post("/auth/signup", async (req, res) => {
  const data = z.object({ email:z.string().trim().email().max(160), password:z.string().min(8).max(128) }).parse(req.body);
  const email = data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where:{email} });
  if (existing) return res.status(409).json({error:"An account with this email already exists. Please log in."});
  const user = await prisma.user.create({data:{email,passwordHash:await hashPassword(data.password),role:"BUSINESS"}});
  res.status(201).json({token:tokenFor(user.id),user:{id:user.id,email:user.email}});
});
router.post("/auth/login", async (req, res) => {
  const data = z.object({email:z.string().trim().email().max(160),password:z.string().min(1).max(128)}).parse(req.body);
  const user = await prisma.user.findUnique({where:{email:data.email.toLowerCase()}});
  if (!user || !(await verifyPassword(data.password,user.passwordHash))) return res.status(401).json({error:"Email or password is incorrect."});
  res.json({token:tokenFor(user.id),user:{id:user.id,email:user.email}});
});
router.patch("/auth/password", requireAuth, authenticated(async (req,res) => {
  const data = z.object({
    currentPassword: z.string().min(1).max(128),
    newPassword: z.string().min(8).max(128)
  }).parse(req.body);
  const user = await prisma.user.findUnique({where:{id:req.userId},select:{id:true,passwordHash:true}});
  if (!user) return res.status(404).json({error:"Account not found."});
  if (!(await verifyPassword(data.currentPassword,user.passwordHash))) {
    return res.status(400).json({error:"Current password is incorrect."});
  }
  if (data.currentPassword === data.newPassword) {
    return res.status(400).json({error:"Choose a new password different from your current password."});
  }
  await prisma.user.update({where:{id:user.id},data:{passwordHash:await hashPassword(data.newPassword)}});
  res.json({success:true,message:"Password updated. Use the new password next time you sign in."});
}));

router.get("/auth/me", requireAuth, authenticated(async (req,res) => {
  const user = await prisma.user.findUnique({where:{id:req.userId},select:{id:true,email:true,role:true,createdAt:true}});
  if (!user) return res.status(401).json({error:"Account not found."});
  res.json({id:user.id,email:user.email,createdAt:user.createdAt,isPlatformOwner:user.role==="PLATFORM_OWNER"});
}));

// Platform-only diagnostics. Never return encryption keys or stored payment credentials.
router.get("/platform/admin/payment-settings", requireAuth, authenticated(async (req,res) => {
  const user = await prisma.user.findUnique({where:{id:req.userId},select:{email:true,role:true}});
  const ownerEmail = process.env.PLATFORM_OWNER_EMAIL?.trim().toLowerCase();
  if (!user || user.role !== "PLATFORM_OWNER" || !ownerEmail || user.email.toLowerCase() !== ownerEmail) {
    return res.status(403).json({error:"Platform owner access required."});
  }
  const apiBase = (process.env.PUBLIC_API_URL || "").replace(/\/$/, "");
  res.json({
    company:"PixelForge",
    webhookUrl: apiBase ? apiBase + "/api/webhooks/razorpay" : null
  });
}));

router.get("/workspace/business", requireAuth, authenticated(async (req,res) => {
  const business = await prisma.business.findFirst({
    where:{ownerUserId:req.userId},
    include:{catalogueFields:{orderBy:{sortOrder:"asc"}},_count:{select:{products:true,catalogues:true}}},
    omit:{razorpayKeySecretEncrypted:true,razorpayWebhookSecretEncrypted:true}
  });
  if (!business) return res.json(null);
  // Prisma's omit option above already excludes both gateway secrets from the response.
  res.json(business);
}));

// Industry-specific field schema management. All operations are scoped to the authenticated business.
const fieldInput = z.object({
  key: z.string().trim().min(2).max(48).regex(/^[a-z][a-zA-Z0-9_]*$/, "Use a key starting with a letter; letters, numbers and underscores only."),
  label: z.string().trim().min(2).max(80),
  type: z.enum(["text", "number", "textarea", "select", "multiselect", "boolean"]),
  required: z.boolean().default(false),
  options: z.array(z.string().trim().min(1).max(80)).max(100).optional()
}).superRefine((field, ctx) => {
  if (["select", "multiselect"].includes(field.type) && (!field.options || field.options.length < 1)) {
    ctx.addIssue({code:"custom", path:["options"], message:"Add at least one option for select fields."});
  }
  if (!["select", "multiselect"].includes(field.type) && field.options?.length) {
    ctx.addIssue({code:"custom", path:["options"], message:"Options are only supported for select fields."});
  }
});

router.post("/workspace/fields", requireAuth, authenticated(async (req,res) => {
  const data = fieldInput.parse(req.body);
  const business = await prisma.business.findFirst({where:{ownerUserId:req.userId},select:{id:true}});
  if (!business) return res.status(409).json({error:"Complete business setup first."});
  const last = await prisma.catalogueField.aggregate({where:{businessId:business.id},_max:{sortOrder:true}});
  const field = await prisma.catalogueField.create({data:{
    businessId:business.id,key:data.key,label:data.label,type:data.type,required:data.required,
    options:data.options && data.options.length ? data.options : undefined,sortOrder:(last._max.sortOrder ?? -1)+1
  }});
  res.status(201).json(field);
}));
router.patch("/workspace/fields/:id", requireAuth, authenticated(async (req,res) => {
  const data = fieldInput.parse(req.body);
  const business = await prisma.business.findFirst({where:{ownerUserId:req.userId},select:{id:true}});
  if (!business) return res.status(404).json({error:"Business not found."});
  const owned = await prisma.catalogueField.findFirst({where:{id:String(req.params.id),businessId:business.id}});
  if (!owned) return res.status(404).json({error:"Field not found."});
  if (data.key !== owned.key) {
    const duplicate = await prisma.catalogueField.findFirst({where:{businessId:business.id,key:data.key,NOT:{id:owned.id}}});
    if (duplicate) return res.status(409).json({error:"A field with this key already exists."});
  }
  const updated = await prisma.catalogueField.update({where:{id:owned.id},data:{
    key:data.key,label:data.label,type:data.type,required:data.required,
    options:data.options && data.options.length ? data.options : Prisma.DbNull
  }});
  res.json(updated);
}));
router.delete("/workspace/fields/:id", requireAuth, authenticated(async (req,res) => {
  const business = await prisma.business.findFirst({where:{ownerUserId:req.userId},select:{id:true}});
  if (!business) return res.status(404).json({error:"Business not found."});
  const field = await prisma.catalogueField.findFirst({where:{id:String(req.params.id),businessId:business.id}});
  if (!field) return res.status(404).json({error:"Field not found."});
  await prisma.catalogueField.delete({where:{id:field.id}});
  res.status(204).end();
}));
router.post("/workspace/fields/restore-defaults", requireAuth, authenticated(async (req,res) => {
  const business = await prisma.business.findFirst({where:{ownerUserId:req.userId}});
  if (!business) return res.status(404).json({error:"Business not found."});
  const defaults = templates[business.productCategory] || templates.other;
  await prisma.$transaction(async tx => {
    for (const [index, field] of defaults.entries()) {
      await tx.catalogueField.upsert({
        where:{businessId_key:{businessId:business.id,key:field.key}},
        create:{businessId:business.id,key:field.key,label:field.label,type:field.type,required:field.required||false,options:field.options,sortOrder:index},
        update:{label:field.label,type:field.type,required:field.required||false,options:field.options,sortOrder:index}
      });
    }
  });
  res.json(await prisma.catalogueField.findMany({where:{businessId:business.id},orderBy:{sortOrder:"asc"}}));
}));

router.post("/workspace/payments/razorpay/connect", requireAuth, authenticated(async (req,res) => {
  const data = z.object({
    keyId: z.string().trim().min(8).max(100).regex(/^rzp_(test|live)_/, "Enter a Razorpay test or live Key ID."),
    keySecret: z.string().trim().min(8).max(200)
  }).parse(req.body);
  const business = await prisma.business.findFirst({where:{ownerUserId:req.userId},select:{id:true}});
  if (!business) return res.status(404).json({error:"Business not found."});
  try {
    await razorpayRequest(data.keyId, data.keySecret, "/orders?count=1");
    const updated = await prisma.business.update({
      where:{id:business.id},
      data:{paymentGatewayProvider:"RAZORPAY",paymentGatewayStatus:"ACTIVE",razorpayKeyId:data.keyId,razorpayKeySecretEncrypted:encryptGatewaySecret(data.keySecret)},
      select:{id:true,paymentGatewayProvider:true,paymentGatewayStatus:true}
    });
    res.json({...updated,message:"Razorpay credentials verified and saved securely."});
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not validate Razorpay credentials.";
    res.status(400).json({error:message});
  }
}));

router.post("/workspace/payments/razorpay/disconnect", requireAuth, authenticated(async (req,res) => {
  const business = await prisma.business.findFirst({where:{ownerUserId:req.userId},select:{id:true}});
  if (!business) return res.status(404).json({error:"Business not found."});
  await prisma.business.update({where:{id:business.id},data:{paymentGatewayProvider:null,paymentGatewayStatus:"DISABLED",razorpayKeyId:null,razorpayKeySecretEncrypted:null}});
  res.json({paymentGatewayProvider:null,paymentGatewayStatus:"DISABLED"});
}));

router.patch("/workspace/business/settings", requireAuth, authenticated(async (req,res) => {
  const data = z.object({
    sellingMode: z.enum(["CATALOG_ONLY", "ONLINE_PAYMENTS"]).optional(),
    name: z.string().trim().min(2).max(120).optional(),
    industry: z.string().trim().min(2).max(100).optional(),
    productCategory: z.enum(["yarn-textiles","clothing","furniture","electronics","food-beverage","beauty-personal-care","automotive","healthcare","building-materials","agriculture","other"]).optional(),
    businessModel: z.enum(["B2B","B2C","B2B2C"]).optional(),
    phone: z.string().trim().max(30).nullable().optional(),
    email: z.union([z.string().trim().email().max(160), z.literal("")]).nullable().optional(),
    address: z.string().trim().max(1000).nullable().optional(),
    logoUrl: z.union([z.string().trim().url().max(500), z.literal("")]).nullable().optional(),
    website: z.union([z.string().trim().url().max(200),z.literal("")]).nullable().optional(),
    brandColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional()
  }).refine((value) => Object.values(value).some((item) => item !== undefined), { message: "Provide at least one setting to update." }).parse(req.body);
  const business = await prisma.business.findFirst({where:{ownerUserId:req.userId},select:{id:true,paymentGatewayStatus:true,razorpayKeyId:true,razorpayKeySecretEncrypted:true}});
  if (!business) return res.status(404).json({error:"Business not found."});
  if (data.sellingMode === "ONLINE_PAYMENTS" && (business.paymentGatewayStatus !== "ACTIVE" || !business.razorpayKeyId || !business.razorpayKeySecretEncrypted)) return res.status(409).json({error:"Connect and verify Razorpay before enabling online payments."});
  const updated = await prisma.business.update({
    where:{id:business.id},
    data:{...data,email:data.email === "" ? null : data.email,address:data.address === "" ? null : data.address,logoUrl:data.logoUrl === "" ? null : data.logoUrl,website:data.website === "" ? null : data.website},
    select:{
      id:true,name:true,slug:true,industry:true,productCategory:true,businessModel:true,email:true,phone:true,address:true,website:true,logoUrl:true,brandColor:true,sellingMode:true,paymentGatewayProvider:true,paymentGatewayStatus:true,updatedAt:true
    }
  });
  res.json({
    ...updated,
    checkoutReady: updated.sellingMode === "ONLINE_PAYMENTS" && updated.paymentGatewayStatus === "ACTIVE"
  });
}));

router.post("/workspace/business", requireAuth, authenticated(async (req,res) => {
  const existing = await prisma.business.findFirst({where:{ownerUserId:req.userId}});
  if (existing) return res.status(409).json({error:"This account already has a business workspace."});
  const data = z.object({
    name:z.string().trim().min(2).max(120), industry:z.string().trim().min(2).max(100),
    productCategory:z.enum(["yarn-textiles","clothing","furniture","electronics","food-beverage","beauty-personal-care","automotive","healthcare","building-materials","agriculture","other"]),
    businessModel:z.enum(["B2B","B2C","B2B2C"]), phone:z.string().trim().max(30).optional(),
    website:z.union([z.string().trim().url().max(200),z.literal("")]).optional(),
    brandColor:z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#599c56"),
    sellingMode:z.enum(["CATALOG_ONLY","ONLINE_PAYMENTS"]).default("ONLINE_PAYMENTS")
  }).parse(req.body);
  const base = slugify(data.name);
  let slug = base, suffix = 2;
  while (await prisma.business.findUnique({where:{slug}})) slug = `${base}-${suffix++}`;
  const fields = templates[data.productCategory] || templates.other;
  const business = await prisma.business.create({data:{
    ownerUserId:req.userId!, name:data.name, slug, industry:data.industry, productCategory:data.productCategory,
    businessModel:data.businessModel, phone:data.phone || null, website:data.website || null, brandColor:data.brandColor, sellingMode:data.sellingMode,
    catalogueFields:{create:fields.map((f,i)=>({key:f.key,label:f.label,type:f.type,required:f.required || false,options:f.options,sortOrder:i}))}
  },include:{catalogueFields:{orderBy:{sortOrder:"asc"}}}});
  res.status(201).json(business);
}));
router.get("/workspace/products", requireAuth, authenticated(async (req,res) => {
  const business = await prisma.business.findFirst({where:{ownerUserId:req.userId},select:{id:true}});
  if (!business) return res.status(409).json({error:"Complete business setup first."});
  const products = await prisma.selloraProduct.findMany({where:{businessId:business.id},orderBy:{createdAt:"desc"}});
  res.json(products);
}));
function validateProductFields(fields: Record<string, string | number | boolean | string[]>, definitions: Array<{key:string;label:string;type:string;required:boolean;options:unknown}>) {
  for (const field of definitions) {
    const value = fields[field.key];
    const empty = value === undefined || value === null || value === "";
    if (field.required && empty) return `${field.label} is required.`;
    if (empty) continue;
    if (field.type === "number" && (typeof value !== "number" || !Number.isFinite(value) || value < 0)) return `${field.label} must be a valid non-negative number.`;
    if (["text", "textarea", "select"].includes(field.type) && typeof value !== "string") return `${field.label} must be text.`;
    if (field.type === "boolean" && typeof value !== "boolean") return `${field.label} must be true or false.`;
    const options = Array.isArray(field.options) ? field.options : null;
    if (field.type === "select" && options && !options.includes(value)) return `Choose a valid option for ${field.label}.`;
    if (field.type === "multiselect") {
      if (!Array.isArray(value) || value.some(v => typeof v !== "string")) return `${field.label} must contain a list of options.`;
      if (options && value.some(v => !options.includes(v))) return `Choose valid options for ${field.label}.`;
    }
  }
  return null;
}

router.post("/workspace/products", requireAuth, authenticated(async (req,res) => {
  const data = z.object({
    name:z.string().trim().min(2).max(160), sku:z.string().trim().max(64).optional(),
    description:z.string().trim().max(2000).optional(), price:z.number().positive().optional(),
    currency:z.string().length(3).default("INR"), unit:z.string().trim().min(1).max(20).default("piece"),
    imageUrl:z.union([z.string().url().max(500),z.string().regex(/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/).max(4200000),z.literal("")]).optional(),
    stockEnabled:z.boolean().default(false), stockQuantity:z.number().min(0).max(100000000).nullable().optional(),
    fields:z.record(z.string(),z.union([z.string().max(500),z.number(),z.boolean(),z.array(z.string().max(80)).max(100)])).default({})
  }).parse(req.body);
  const business = await prisma.business.findFirst({where:{ownerUserId:req.userId},select:{id:true}});
  if (!business) return res.status(409).json({error:"Complete business setup first."});
  const definitions = await prisma.catalogueField.findMany({where:{businessId:business.id},select:{key:true,label:true,type:true,required:true,options:true}});
  const fieldError = validateProductFields(data.fields, definitions);
  if (fieldError) return res.status(400).json({error:fieldError});
  const product = await prisma.selloraProduct.create({data:{
    businessId:business.id,name:data.name,sku:data.sku || null,description:data.description || null,
    price:data.price === undefined ? null : new Prisma.Decimal(data.price),currency:data.currency,unit:data.unit,
    imageUrl:data.imageUrl || null,fields:data.fields
  }});
  res.status(201).json(product);
}));
router.patch("/workspace/products/:id", requireAuth, authenticated(async (req,res) => {
  const data = z.object({
    name:z.string().trim().min(2).max(160).optional(),sku:z.string().trim().max(64).nullable().optional(),
    description:z.string().trim().max(2000).nullable().optional(),price:z.number().positive().nullable().optional(),
    currency:z.string().length(3).optional(),unit:z.string().trim().min(1).max(20).optional(),
    imageUrl:z.union([z.string().url().max(500),z.string().regex(/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/).max(4200000),z.literal("")]).nullable().optional(),
    stockEnabled:z.boolean().optional(), stockQuantity:z.number().min(0).max(100000000).nullable().optional(),
    fields:z.record(z.string(),z.union([z.string().max(500),z.number(),z.boolean(),z.array(z.string().max(80)).max(100)])).optional()
  }).parse(req.body);
  const business = await prisma.business.findFirst({where:{ownerUserId:req.userId},select:{id:true}});
  if (!business) return res.status(404).json({error:"Business not found."});
  const owned = await prisma.selloraProduct.findFirst({where:{id:String(req.params.id),businessId:business.id}});
  if (!owned) return res.status(404).json({error:"Product not found."});
  if (data.fields) {
    const definitions = await prisma.catalogueField.findMany({where:{businessId:business.id},select:{key:true,label:true,type:true,required:true,options:true}});
    const currentFields = owned.fields;
    const mergedFields = {...(currentFields && typeof currentFields === "object" && !Array.isArray(currentFields) ? currentFields as Record<string,string|number|boolean|string[]> : {}), ...data.fields};
    const fieldError = validateProductFields(mergedFields, definitions);
    if (fieldError) return res.status(400).json({error:fieldError});
  }
  const {price,...rest}=data;
  const product=await prisma.selloraProduct.update({where:{id:owned.id},data:{
    ...rest,imageUrl:rest.imageUrl === "" ? null : rest.imageUrl,
    ...(price !== undefined ? {price:price===null?null:new Prisma.Decimal(price)} : {})
  }});
  res.json(product);
}));
router.delete("/workspace/products/:id", requireAuth, authenticated(async (req,res) => {
  const business = await prisma.business.findFirst({where:{ownerUserId:req.userId},select:{id:true}});
  if (!business) return res.status(404).json({error:"Business not found."});
  const result=await prisma.selloraProduct.deleteMany({where:{id:String(req.params.id),businessId:business.id}});
  if (!result.count) return res.status(404).json({error:"Product not found."});
  res.status(204).end();
}));

router.get("/workspace/catalogues", requireAuth, authenticated(async (req,res) => {
  const business=await prisma.business.findFirst({where:{ownerUserId:req.userId},select:{id:true}});
  if (!business) return res.status(409).json({error:"Complete business setup first."});
  res.json(await prisma.selloraCatalogue.findMany({where:{businessId:business.id},include:{items:{include:{product:true}}},orderBy:{createdAt:"desc"}}));
}));
router.post("/workspace/catalogues", requireAuth, authenticated(async (req,res) => {
  const data=z.object({title:z.string().trim().min(2).max(160),description:z.string().trim().max(1000).optional(),productIds:z.array(z.string()).max(500).default([])}).parse(req.body);
  const business=await prisma.business.findFirst({where:{ownerUserId:req.userId},select:{id:true,name:true,slug:true}});
  if (!business) return res.status(409).json({error:"Complete business setup first."});
  const ids=[...new Set(data.productIds)];
  const owned=ids.length?await prisma.selloraProduct.findMany({where:{id:{in:ids},businessId:business.id},select:{id:true}}):[];
  if(owned.length!==ids.length) return res.status(400).json({error:"One or more selected products do not belong to this business."});
  const base=slugify(data.title);
  let slug=`${business.slug}-${base}`.slice(0,95), suffix=2;
  while(await prisma.selloraCatalogue.findUnique({where:{slug}})) slug=`${business.slug}-${base}-${suffix++}`.slice(0,95);
  const catalogue=await prisma.selloraCatalogue.create({data:{
    businessId:business.id,title:data.title,slug,description:data.description || null,
    items:{create:ids.map((productId,index)=>({productId,sortOrder:index}))}
  },include:{items:{include:{product:true}}}});
  res.status(201).json(catalogue);
}));
router.patch("/workspace/catalogues/:id", requireAuth, authenticated(async (req,res) => {
  const data=z.object({title:z.string().trim().min(2).max(160).optional(),description:z.string().trim().max(1000).nullable().optional(),isPublished:z.boolean().optional(),productIds:z.array(z.string()).max(500).optional()}).parse(req.body);
  const business=await prisma.business.findFirst({where:{ownerUserId:req.userId},select:{id:true}});
  if(!business) return res.status(404).json({error:"Business not found."});
  const existing=await prisma.selloraCatalogue.findFirst({where:{id:String(req.params.id),businessId:business.id}});
  if(!existing) return res.status(404).json({error:"Catalogue not found."});
  if(data.productIds){
    const ids=[...new Set(data.productIds)];
    const owned=ids.length?await prisma.selloraProduct.findMany({where:{id:{in:ids},businessId:business.id},select:{id:true}}):[];
    if(owned.length!==ids.length) return res.status(400).json({error:"One or more selected products do not belong to this business."});
    await prisma.catalogueProduct.deleteMany({where:{catalogueId:existing.id}});
    await prisma.catalogueProduct.createMany({data:ids.map((productId,index)=>({catalogueId:existing.id,productId,sortOrder:index}))});
  }
  const {productIds,...fields}=data;
  const updated=await prisma.selloraCatalogue.update({where:{id:existing.id},data:{
    ...fields,...(fields.isPublished && !existing.isPublished ? {publishedAt:new Date()} : {}),
    ...(fields.isPublished===false ? {publishedAt:null} : {})
  },include:{items:{include:{product:true}}}});
  res.json(updated);
}));


router.get("/workspace/payment-orders",requireAuth,authenticated(async(req,res)=>{
 const business=await prisma.business.findFirst({where:{ownerUserId:req.userId},select:{id:true}});
 if(!business)return res.status(404).json({error:"Business not found."});
 const [legacyPayments,checkoutOrders]=await Promise.all([
  prisma.paymentOrder.findMany({where:{businessId:business.id},orderBy:{createdAt:"desc"},select:{id:true,productName:true,quantity:true,unit:true,amount:true,currency:true,customerName:true,customerEmail:true,customerPhone:true,status:true,razorpayOrderId:true,razorpayPaymentId:true,createdAt:true,paidAt:true,updatedAt:true}}),
  prisma.selloraOrder.findMany({where:{businessId:business.id},include:{items:true,catalogue:{select:{title:true,slug:true}}},orderBy:{createdAt:"desc"},take:500})
 ]);
 const legacy=legacyPayments.map(order=>({...order,recordType:"PAYMENT_ORDER",orderNumber:order.id,items:[{productName:order.productName,sku:null,quantity:order.quantity,unit:order.unit,unitPrice:order.amount.toString(),lineTotal:order.amount.toString()}],amount:order.amount.toString(),subtotal:order.amount.toString(),taxAmount:"0",totalAmount:order.amount.toString(),address:null,notes:null,paymentStatus:order.status}));
 const checkout=checkoutOrders.map(order=>({
  id:order.id,recordType:"CATALOGUE_ORDER",orderNumber:order.orderNumber,catalogueTitle:order.catalogue.title,
  productName:order.items.map(item=>item.productName).join(", ")||"Catalogue order",
  quantity:order.items.reduce((sum,item)=>sum+item.quantity,0),unit:"items",
  amount:order.totalAmount.toString(),subtotal:order.subtotal.toString(),taxAmount:order.taxAmount.toString(),totalAmount:order.totalAmount.toString(),
  currency:order.currency,customerName:order.customerName,customerEmail:order.email,customerPhone:order.phone,address:order.address,notes:order.notes,
  status:order.paymentStatus==="PAID"?"PAID":order.status==="CANCELLED"?"CANCELLED":order.paymentStatus==="FAILED"?"FAILED":"PENDING",
  paymentStatus:order.paymentStatus,razorpayOrderId:order.razorpayOrderId||"",razorpayPaymentId:order.razorpayPaymentId,
  createdAt:order.createdAt,paidAt:order.paymentStatus==="PAID"?order.updatedAt:null,updatedAt:order.updatedAt,
  items:order.items.map(item=>({productName:item.productName,sku:item.sku,quantity:item.quantity,unit:item.unit,unitPrice:item.unitPrice.toString(),lineTotal:item.lineTotal.toString()}))
 }));
 res.json([...legacy,...checkout].sort((a,b)=>new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime()));
}));

router.get("/workspace/business/tax-settings",requireAuth,authenticated(async(req,res)=>{
 const b=await prisma.business.findFirst({where:{ownerUserId:req.userId},select:{taxEnabled:true,taxRate:true}});
 if(!b)return res.status(404).json({error:"Business not found."});
 res.json({enabled:b.taxEnabled,rate:b.taxRate.toString()});
}));
router.put("/workspace/business/tax-settings",requireAuth,authenticated(async(req,res)=>{
 const d=z.object({enabled:z.boolean(),rate:z.number().min(0).max(100)}).parse(req.body);
 const b=await prisma.business.findFirst({where:{ownerUserId:req.userId},select:{id:true}});
 if(!b)return res.status(404).json({error:"Business not found."});
 const updated=await prisma.business.update({where:{id:b.id},data:{taxEnabled:d.enabled,taxRate:d.enabled?new Prisma.Decimal(d.rate.toFixed(2)):new Prisma.Decimal(0)},select:{taxEnabled:true,taxRate:true}});
 res.json({enabled:updated.taxEnabled,rate:updated.taxRate.toString()});
}));
router.get("/workspace/business/payment-gateway",requireAuth,authenticated(async(req,res)=>{
 const b=await prisma.business.findFirst({where:{ownerUserId:req.userId},select:{paymentGatewayProvider:true,paymentGatewayStatus:true,razorpayKeyId:true,razorpayKeySecretEncrypted:true,razorpayWebhookSecretEncrypted:true,razorpayTestMode:true}});
 if(!b)return res.status(404).json({error:"Business not found."});
 res.json({provider:b.paymentGatewayProvider,status:b.paymentGatewayStatus,keyId:b.razorpayKeyId||"",keySecretConfigured:Boolean(b.razorpayKeySecretEncrypted),webhookSecretConfigured:Boolean(b.razorpayWebhookSecretEncrypted),testMode:b.razorpayTestMode});
}));
router.put("/workspace/business/payment-gateway",requireAuth,authenticated(async(req,res)=>{
 const d=z.object({keyId:z.string().trim().min(8).max(100),keySecret:z.string().trim().min(8).max(200).optional().or(z.literal("")),webhookSecret:z.string().trim().min(1).max(200).optional().or(z.literal("")),testMode:z.boolean().default(true)}).parse(req.body);
 const b=await prisma.business.findFirst({where:{ownerUserId:req.userId},select:{id:true,razorpayKeySecretEncrypted:true,razorpayWebhookSecretEncrypted:true}});
 if(!b)return res.status(404).json({error:"Business not found."});
 try{paymentEncryptionKey();}catch(error){return res.status(503).json({error:error instanceof Error?error.message:"Payment encryption is not configured on the Sellora API server."});}
 if(d.testMode&&!d.keyId.startsWith("rzp_test_"))return res.status(400).json({error:"Test mode requires a Razorpay test Key ID (rzp_test_…)."});
 if(!d.testMode&&!d.keyId.startsWith("rzp_live_"))return res.status(400).json({error:"Live mode requires a Razorpay live Key ID (rzp_live_…)."});
 const secretValue=d.keySecret||(b.razorpayKeySecretEncrypted?decryptPaymentSecret(b.razorpayKeySecretEncrypted):"");
 if(!secretValue)return res.status(400).json({error:"Enter your Razorpay Key Secret."});
 try{await razorpayRequest(d.keyId,secretValue,"/orders?count=1");}
 catch(error){return res.status(400).json({error:error instanceof Error?"Could not authenticate with Razorpay: "+error.message:"Razorpay credentials could not be verified."});}
 const updated=await prisma.business.update({where:{id:b.id},data:{paymentGatewayProvider:"RAZORPAY",paymentGatewayStatus:"ACTIVE",razorpayKeyId:d.keyId,razorpayKeySecretEncrypted:d.keySecret?encryptPaymentSecret(secretValue):b.razorpayKeySecretEncrypted,razorpayWebhookSecretEncrypted:d.webhookSecret?encryptPaymentSecret(d.webhookSecret):b.razorpayWebhookSecretEncrypted,razorpayTestMode:d.testMode,sellingMode:"ONLINE_PAYMENTS"},select:{paymentGatewayProvider:true,paymentGatewayStatus:true,razorpayKeyId:true,razorpayTestMode:true}});
 res.json({provider:updated.paymentGatewayProvider,status:updated.paymentGatewayStatus,keyId:updated.razorpayKeyId,testMode:updated.razorpayTestMode,keySecretConfigured:true,webhookSecretConfigured:Boolean(d.webhookSecret||b.razorpayWebhookSecretEncrypted)});
}));
router.delete("/workspace/business/payment-gateway",requireAuth,authenticated(async(req,res)=>{
 const b=await prisma.business.findFirst({where:{ownerUserId:req.userId},select:{id:true}});
 if(!b)return res.status(404).json({error:"Business not found."});
 await prisma.business.update({where:{id:b.id},data:{paymentGatewayProvider:null,paymentGatewayStatus:"NOT_CONNECTED",razorpayKeyId:null,razorpayKeySecretEncrypted:null,razorpayWebhookSecretEncrypted:null,sellingMode:"CATALOG_ONLY"}});
 res.json({status:"NOT_CONNECTED"});
}));
router.post("/webhooks/razorpay",async(req,res)=>{
 const raw=(req as Request & {rawBody?:Buffer}).rawBody,signature=String(req.headers["x-razorpay-signature"]||"");
 if(!raw||!signature)return res.status(400).json({error:"Missing webhook signature or raw payload."});
 const event=req.body as {event?:string;payload?:{payment?:{entity?:{order_id?:string;id?:string}};order?:{entity?:{id?:string}}}};
 const orderId=event.payload?.payment?.entity?.order_id||event.payload?.order?.entity?.id;
 if(!orderId)return res.json({received:true});
 const p=await prisma.paymentOrder.findUnique({where:{razorpayOrderId:orderId},include:{business:true}});
 if(!p?.business.razorpayWebhookSecretEncrypted)return res.status(400).json({error:"Webhook secret is not configured for this order."});
 const expected=crypto.createHmac("sha256",decryptPaymentSecret(p.business.razorpayWebhookSecretEncrypted)).update(raw).digest("hex");
 if(!safeEqualHex(signature,expected))return res.status(400).json({error:"Invalid webhook signature."});
 if(event.event==="payment.captured"||event.event==="order.paid")await prisma.paymentOrder.update({where:{id:p.id},data:{status:"PAID",razorpayPaymentId:event.payload?.payment?.entity?.id||p.razorpayPaymentId,paidAt:p.paidAt||new Date()}});
 else if(event.event==="payment.failed")await prisma.paymentOrder.update({where:{id:p.id},data:{status:"FAILED"}});
 res.json({received:true});
});


router.get("/public/catalogues/:slug", async (req,res) => {
  const catalogue=await prisma.selloraCatalogue.findFirst({
    where:{slug:req.params.slug,isPublished:true},
    include:{business:true,items:{where:{product:{isActive:true}},include:{product:true},orderBy:{sortOrder:"asc"}}}
  });
  if(!catalogue) return res.status(404).json({error:"This catalogue is not published or no longer available."});
  res.json({
    title:catalogue.title,description:catalogue.description,slug:catalogue.slug,
    business:{name:catalogue.business.name,industry:catalogue.business.industry,email:catalogue.business.email,phone:catalogue.business.phone,address:catalogue.business.address,website:catalogue.business.website,brandColor:catalogue.business.brandColor,logoUrl:catalogue.business.logoUrl,sellingMode:catalogue.business.sellingMode,paymentGatewayStatus:catalogue.business.paymentGatewayStatus},
    checkoutReady: catalogue.business.sellingMode === "ONLINE_PAYMENTS" && catalogue.business.paymentGatewayStatus === "ACTIVE" && catalogue.business.paymentGatewayProvider === "RAZORPAY",
    products:catalogue.items.map(({product})=>({...product,price:product.price?.toString() ?? null}))
  });
});


router.post("/public/catalogues/:slug/orders", async (req,res) => {

  const catalogue=await prisma.selloraCatalogue.findFirst({
    where:{slug:String(req.params.slug),isPublished:true},
    include:{business:true,items:{where:{product:{isActive:true}},include:{product:true}}}
  });
  if(!catalogue) return res.status(404).json({error:"This catalogue is not published or no longer available."});
  if(catalogue.business.sellingMode !== "ONLINE_PAYMENTS") return res.status(403).json({error:"Online checkout is not enabled."});
  if(catalogue.business.paymentGatewayProvider !== "RAZORPAY" || catalogue.business.paymentGatewayStatus !== "ACTIVE" || !catalogue.business.razorpayKeyId || !catalogue.business.razorpayKeySecretEncrypted) {
    return res.status(409).json({error:"This business has not connected Razorpay payments yet. Please contact the business."});
  }
  const data = z.object({
    customerName:z.string().trim().min(2).max(120),
    email:z.union([z.string().trim().email().max(160),z.literal("")]).optional(),
    phone:z.string().trim().min(7).max(30),
    address:z.string().trim().min(5).max(1000),
    notes:z.string().trim().max(1000).optional(),
    items:z.array(z.object({productId:z.string().min(1),quantity:z.number().int().min(1).max(1000)})).min(1).max(100)
  }).parse(req.body);
  const keyId = catalogue.business.razorpayKeyId;
  let keySecret: string;
  try { keySecret = decryptStoredGatewaySecret(catalogue.business.razorpayKeySecretEncrypted); }
  catch { return res.status(503).json({error:"Payment configuration is unavailable. Please contact the business."}); }
  const requested = new Map<string,number>();
  for(const item of data.items) requested.set(item.productId,(requested.get(item.productId)||0)+item.quantity);
  const available = new Map(catalogue.items.map(({product})=>[product.id,product]));
  const orderItems: Prisma.SelloraOrderItemCreateWithoutOrderInput[] = [];
  let currency: string | null = null;
  let total = new Prisma.Decimal(0);
  for(const [productId,quantity] of requested.entries()){
    const product=available.get(productId);
    if(!product) return res.status(400).json({error:"One or more cart items are unavailable. Refresh the catalogue and try again."});
    if(product.price === null || !product.price.isFinite() || product.price.lte(0)) return res.status(400).json({error:`Price is unavailable for ${product.name}. Please enquire with the business.`});
    if(currency && currency !== product.currency) return res.status(400).json({error:"Products with different currencies cannot be checked out together."});
    currency=product.currency;
    const unitPrice=product.price;
    const lineTotal=unitPrice.mul(quantity);
    total=total.add(lineTotal);
    orderItems.push({productId:product.id,productName:product.name,sku:product.sku,unit:product.unit,quantity,unitPrice,lineTotal});
  }
  if(currency !== "INR") return res.status(400).json({error:"Razorpay checkout currently supports INR orders only."});
  const taxAmount = catalogue.business.taxEnabled ? total.mul(catalogue.business.taxRate).div(100).toDecimalPlaces(2) : new Prisma.Decimal(0);
  const grandTotal = total.add(taxAmount);
  const amountPaise = grandTotal.mul(100).toDecimalPlaces(0).toNumber();
  if(!Number.isSafeInteger(amountPaise) || amountPaise < 100) return res.status(400).json({error:"Order total is outside Razorpay's supported amount range."});
  let order: {id:string;orderNumber:string;status:string;paymentStatus:string;currency:string;subtotal:Prisma.Decimal;createdAt:Date} | null = null;
  try {
    order = await prisma.$transaction(async (tx) => {
      const sequence = await tx.business.update({
        where:{id:catalogue.businessId},data:{lastOrderNumber:{increment:1}},
        select:{lastOrderNumber:true,slug:true}
      });
      const prefix = sequence.slug.toUpperCase().replace(/[^A-Z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,32) || "COMPANY";
      const orderNumber = prefix + "-" + String(sequence.lastOrderNumber).padStart(5,"0");
      return tx.selloraOrder.create({data:{
        orderNumber,businessId:catalogue.businessId,catalogueId:catalogue.id,customerName:data.customerName,email:data.email||null,
        phone:data.phone,address:data.address,notes:data.notes||null,currency:"INR",subtotal:total,taxAmount,totalAmount:grandTotal,
        items:{create:orderItems}
      },select:{id:true,orderNumber:true,status:true,paymentStatus:true,currency:true,subtotal:true,createdAt:true}});
    });
    const razorpayOrder = await razorpayRequest<{id:string}>(
      keyId,keySecret,"/orders",
      {method:"POST",body:JSON.stringify({amount:amountPaise,currency:"INR",receipt:order.orderNumber,notes:{selloraOrderId:order.id,catalogueSlug:catalogue.slug,businessName:catalogue.business.name}})}
    );
    await prisma.selloraOrder.update({where:{id:order.id},data:{razorpayOrderId:razorpayOrder.id}});
    res.status(201).json({
      orderId:order.id,orderNumber:order.orderNumber,subtotal:order.subtotal.toString(),taxAmount:taxAmount.toString(),total:grandTotal.toString(),taxRate:catalogue.business.taxEnabled?catalogue.business.taxRate.toString():"0",
      checkout:{keyId,razorpayOrderId:razorpayOrder.id,amount:amountPaise,currency:"INR",name:catalogue.business.name,description:catalogue.title,prefill:{name:data.customerName,email:data.email||undefined,contact:data.phone}},
      message:"Continue to Razorpay to complete your payment."
    });
  } catch (error) {
    if (order) await prisma.selloraOrder.delete({where:{id:order.id}}).catch(()=>{});
    const message = error instanceof Error ? error.message : "Could not start Razorpay checkout.";
    res.status(502).json({error:"Could not start payment. " + message});
  }
});

router.post("/public/catalogues/:slug/payments/verify", async (req,res) => {
  const data = z.object({
    razorpay_order_id:z.string().min(1).max(100),
    razorpay_payment_id:z.string().min(1).max(100),
    razorpay_signature:z.string().min(1).max(200)
  }).parse(req.body);
  const catalogue=await prisma.selloraCatalogue.findFirst({
    where:{slug:String(req.params.slug),isPublished:true},
    select:{id:true,business:{select:{name:true,razorpayKeyId:true,razorpayKeySecretEncrypted:true,paymentGatewayProvider:true}}}
  });
  if(!catalogue) return res.status(404).json({error:"Catalogue not found."});
  if(catalogue.business.paymentGatewayProvider!=="RAZORPAY" || !catalogue.business.razorpayKeyId || !catalogue.business.razorpayKeySecretEncrypted) return res.status(409).json({error:"Payment gateway is not configured."});
  const order = await prisma.selloraOrder.findFirst({where:{catalogueId:catalogue.id,razorpayOrderId:data.razorpay_order_id}});
  if(!order) return res.status(404).json({error:"Payment order not found."});
  if(order.paymentStatus==="PAID") return res.json({success:true,orderNumber:order.orderNumber,message:"Payment already verified."});
  let keySecret: string;
  try { keySecret=decryptStoredGatewaySecret(catalogue.business.razorpayKeySecretEncrypted); }
  catch { return res.status(503).json({error:"Payment configuration is unavailable."}); }
  const expected=crypto.createHmac("sha256",keySecret).update(data.razorpay_order_id+"|"+data.razorpay_payment_id).digest();
  let supplied: Buffer;
  try { supplied=Buffer.from(data.razorpay_signature,"hex"); } catch { return res.status(400).json({error:"Invalid payment signature."}); }
  if(expected.length!==supplied.length || !crypto.timingSafeEqual(expected,supplied)) return res.status(400).json({error:"Payment signature verification failed."});
  try {
    const payment=await razorpayRequest<{id:string;order_id:string;amount:number;currency:string;status:string}>(
      catalogue.business.razorpayKeyId,keySecret,"/payments/"+encodeURIComponent(data.razorpay_payment_id)
    );
    const expectedAmount=order.totalAmount.mul(100).toDecimalPlaces(0).toNumber();
    if(payment.order_id!==data.razorpay_order_id || payment.amount!==expectedAmount || payment.currency!==order.currency) {
      return res.status(400).json({error:"Payment details do not match this order."});
    }
    if(payment.status!=="captured") {
      return res.status(202).json({success:false,paymentStatus:payment.status,message:"Payment is not captured yet. Please wait for confirmation."});
    }
    const updated=await prisma.selloraOrder.update({where:{id:order.id},data:{razorpayPaymentId:payment.id,paymentStatus:"PAID",status:"CONFIRMED"}});
    await prisma.catalogueAnalyticsEvent.create({data:{catalogueId:catalogue.id,eventType:"payment_confirmed",metadata:{orderNumber:updated.orderNumber}}}).catch(()=>{});
    res.json({success:true,orderNumber:updated.orderNumber,message:"Payment confirmed successfully."});
  } catch {
    res.status(502).json({error:"We could not verify payment right now. Do not pay again; contact the business with your payment reference."});
  }
});

// Lightweight public funnel tracking; never accepts payment-completed events from browsers.
router.post("/public/catalogues/:slug/events", async (req,res) => {
  const data=z.object({
    eventType:z.enum(["page_view","product_opened","add_to_cart","checkout_started","payment_gateway_opened"]),
    sessionId:z.string().trim().min(8).max(100).optional(),
    metadata:z.record(z.string(),z.union([z.string().max(200),z.number(),z.boolean()])).optional()
  }).parse(req.body);
  const catalogue=await prisma.selloraCatalogue.findFirst({where:{slug:String(req.params.slug),isPublished:true},select:{id:true}});
  if(!catalogue) return res.status(404).json({error:"Catalogue not found."});
  await prisma.catalogueAnalyticsEvent.create({data:{catalogueId:catalogue.id,eventType:data.eventType,sessionId:data.sessionId,metadata:data.metadata}});
  res.status(202).json({accepted:true});
});

router.get("/workspace/orders", requireAuth, authenticated(async (req,res) => {
  const business=await prisma.business.findFirst({where:{ownerUserId:req.userId},select:{id:true}});
  if(!business) return res.status(409).json({error:"Complete business setup first."});
  const [orders,payments]=await Promise.all([
    prisma.selloraOrder.findMany({where:{businessId:business.id},include:{catalogue:{select:{id:true,title:true,slug:true}},items:true},orderBy:{createdAt:"desc"}}),
    prisma.paymentOrder.findMany({where:{businessId:business.id},orderBy:{createdAt:"desc"}})
  ]);
  const catalogueOrders=orders.map(order=>({...order,recordType:"CATALOGUE_ORDER",paidAt:order.paymentStatus==="PAID"?order.updatedAt:null,subtotal:order.subtotal.toString(),taxAmount:order.taxAmount.toString(),totalAmount:order.totalAmount.toString(),items:order.items.map(item=>({...item,unitPrice:item.unitPrice.toString(),lineTotal:item.lineTotal.toString()}))}));
  const legacyOrders=payments.map(order=>({
    id:"payment-"+order.id,recordType:"PAYMENT_ORDER",orderNumber:order.id,
    businessId:order.businessId,catalogueId:null,catalogue:null,
    customerName:order.customerName,email:order.customerEmail||null,phone:order.customerPhone||null,address:null,notes:null,
    currency:order.currency,subtotal:order.amount.toString(),taxAmount:"0",totalAmount:order.amount.toString(),
    status:order.status==="PAID"?"CONFIRMED":order.status==="FAILED"?"PAYMENT_FAILED":"PENDING",
    paymentStatus:order.status,razorpayOrderId:order.razorpayOrderId,razorpayPaymentId:order.razorpayPaymentId,
    createdAt:order.createdAt,paidAt:order.status==="PAID"?(order.paidAt||order.updatedAt):null,updatedAt:order.updatedAt,items:[{id:"item-"+order.id,productName:order.productName,sku:null,quantity:order.quantity,unit:order.unit,unitPrice:order.amount.toString(),lineTotal:order.amount.toString()}]
  }));
  res.json([...catalogueOrders,...legacyOrders].sort((a,b)=>new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime()));
}));

// Fulfilment status is separate from payment status. Payment can only be confirmed by verified gateway callbacks.
router.patch("/workspace/orders/:id/status", requireAuth, authenticated(async (req,res) => {
  const data = z.object({
    status: z.enum(["PENDING", "CONFIRMED", "PROCESSING", "DISPATCHED", "DELIVERED", "CANCELLED"])
  }).parse(req.body);
  const business = await prisma.business.findFirst({where:{ownerUserId:req.userId},select:{id:true}});
  if (!business) return res.status(409).json({error:"Complete business setup first."});
  const order = await prisma.selloraOrder.findFirst({
    where:{id:String(req.params.id),businessId:business.id},
    select:{id:true,status:true,paymentStatus:true,orderNumber:true}
  });
  if (!order) return res.status(404).json({error:"Order not found."});
  if (order.status === "CANCELLED" || order.status === "DELIVERED") {
    return res.status(409).json({error:"This order is already in a final fulfilment state."});
  }
  if (data.status === "CANCELLED" && order.paymentStatus === "PAID") {
    return res.status(409).json({error:"This order has a verified payment. Process the refund before cancelling it."});
  }
  const updated = await prisma.selloraOrder.update({
    where:{id:order.id},
    data:{status:data.status},
    select:{id:true,orderNumber:true,status:true,paymentStatus:true,updatedAt:true}
  });
  res.json(updated);
}));

router.get("/workspace/catalogues/:id/analytics", requireAuth, authenticated(async (req,res) => {
  const business=await prisma.business.findFirst({where:{ownerUserId:req.userId},select:{id:true}});
  if(!business) return res.status(409).json({error:"Complete business setup first."});
  const catalogue=await prisma.selloraCatalogue.findFirst({where:{id:String(req.params.id),businessId:business.id},select:{id:true}});
  if(!catalogue) return res.status(404).json({error:"Catalogue not found."});
  const [events,orders,visitorSessions]=await Promise.all([
    prisma.catalogueAnalyticsEvent.groupBy({by:["eventType"],where:{catalogueId:catalogue.id},_count:{_all:true}}),
    prisma.selloraOrder.groupBy({by:["paymentStatus"],where:{catalogueId:catalogue.id},_count:{_all:true},_sum:{subtotal:true}}),
    prisma.catalogueAnalyticsEvent.findMany({where:{catalogueId:catalogue.id,eventType:"page_view",sessionId:{not:null}},select:{sessionId:true},distinct:["sessionId"]})
  ]);
  const counts=Object.fromEntries(events.map(event=>[event.eventType,event._count._all]));
  const orderCount=orders.reduce((sum,item)=>sum+item._count._all,0);
  const paymentCount=orders.filter(item=>item.paymentStatus==="PAID").reduce((sum,item)=>sum+item._count._all,0);
  res.json({
    catalogueId:catalogue.id,
    views:counts.page_view||0,
    uniqueVisitors:visitorSessions.length,
    productOpens:counts.product_opened||0,
    addToCart:counts.add_to_cart||0,
    checkoutStarted:counts.checkout_started||0,
    paymentGatewayOpened:counts.payment_gateway_opened||0,
    ordersSubmitted:counts.order_submitted||0,
    orders:orderCount,
    paymentsConfirmed:paymentCount,
    revenue:orders.filter(item=>item.paymentStatus==="PAID").reduce((sum,item)=>sum+Number(item._sum.subtotal||0),0)
  });
}));

export default router;
