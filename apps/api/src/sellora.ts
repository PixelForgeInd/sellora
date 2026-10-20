import { Router, Request, Response, NextFunction } from "express";
import { PrismaClient, Prisma } from "@prisma/client";
import { z } from "zod";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import { promisify } from "node:util";

const router = Router();
const prisma = ((globalThis as typeof globalThis & { __selloraPrisma?: PrismaClient }).__selloraPrisma ??= new PrismaClient());
function getImageUploadDir() {
  const directory = path.resolve(process.env.UPLOAD_DIR || "./uploads");
  fs.mkdirSync(directory, { recursive: true });
  return directory;
}
function uploadedImageFilename(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const pathname=value.startsWith("/")?value:new URL(value).pathname;
    return pathname.startsWith("/uploads/")?path.basename(pathname):null;
  } catch { return null; }
}
function hasValidImageSignature(buffer: Buffer, mimeType: string) {
  if (mimeType === "image/png") return buffer.length >= 8 && buffer.subarray(0,8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]));
  if (mimeType === "image/jpeg") return buffer.length >= 3 && buffer[0]===0xff && buffer[1]===0xd8 && buffer[2]===0xff;
  if (mimeType === "image/gif") return buffer.length >= 6 && ["GIF87a","GIF89a"].includes(buffer.subarray(0,6).toString("ascii"));
  if (mimeType === "image/webp") return buffer.length >= 12 && buffer.subarray(0,4).toString("ascii")==="RIFF" && buffer.subarray(8,12).toString("ascii")==="WEBP";
  return false;
}
const productImageUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => { try { callback(null, getImageUploadDir()); } catch (error) { callback(error as Error, ""); } },
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
  const ownerEmail = process.env.PLATFORM_OWNER_EMAIL?.trim().toLowerCase();
  const role = ownerEmail && email === ownerEmail ? "PLATFORM_OWNER" : "BUSINESS";
  const user = await prisma.user.create({data:{email,passwordHash:await hashPassword(data.password),role}});
  res.status(201).json({token:tokenFor(user.id),user:{id:user.id,email:user.email}});
});
router.post("/auth/login", async (req, res) => {
  const data = z.object({email:z.string().trim().email().max(160),password:z.string().min(1).max(128)}).parse(req.body);
  let user = await prisma.user.findUnique({where:{email:data.email.toLowerCase()}});
  if (!user || !(await verifyPassword(data.password,user.passwordHash))) return res.status(401).json({error:"Email or password is incorrect."});
  const ownerEmail = process.env.PLATFORM_OWNER_EMAIL?.trim().toLowerCase();
  if (ownerEmail && user.email.toLowerCase() === ownerEmail && user.role !== "PLATFORM_OWNER") {
    user = await prisma.user.update({where:{id:user.id},data:{role:"PLATFORM_OWNER"}});
  }
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

router.post("/auth/password/forgot", async (req,res) => {
  const data = z.object({email:z.string().trim().email().max(160)}).parse(req.body);
  const generic = {success:true,message:"If an account exists for that email, password reset instructions will be sent."};
  const user = await prisma.user.findUnique({where:{email:data.email.toLowerCase()},select:{id:true,email:true}});
  if (!user) return res.json(generic);
  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  await prisma.passwordResetToken.create({data:{userId:user.id,tokenHash,expiresAt:new Date(Date.now()+30*60*1000)}});
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  const webOrigin = (process.env.WEB_ORIGIN || "http://localhost:5173").replace(/\/$/,"");
  if (apiKey && from) {
    const link = webOrigin + "/?resetToken=" + encodeURIComponent(token) + "&resetEmail=" + encodeURIComponent(user.email);
    const response = await fetch("https://api.resend.com/emails",{
      method:"POST",headers:{"Authorization":"Bearer "+apiKey,"Content-Type":"application/json"},
      body:JSON.stringify({from,to:[user.email],subject:"Reset your Sellora password",html:"<p>We received a request to reset your Sellora password.</p><p><a href=\""+link+"\">Reset password</a></p><p>This link expires in 30 minutes. If you did not request this, you can ignore this email.</p>"})
    });
    if (!response.ok) {
      await prisma.passwordResetToken.deleteMany({where:{tokenHash}});
      // Do not expose provider errors or whether the account exists to the caller.
    }
  }
  res.json(generic);
});

router.post("/auth/password/reset", async (req,res) => {
  const data = z.object({token:z.string().min(20).max(200),newPassword:z.string().min(8).max(128)}).parse(req.body);
  const tokenHash = crypto.createHash("sha256").update(data.token).digest("hex");
  const reset = await prisma.passwordResetToken.findUnique({where:{tokenHash},include:{user:true}});
  if (!reset || reset.usedAt || reset.expiresAt <= new Date()) return res.status(400).json({error:"This password reset link is invalid or expired. Request a new one."});
  await prisma.$transaction([
    prisma.user.update({where:{id:reset.userId},data:{passwordHash:await hashPassword(data.newPassword)}}),
    prisma.passwordResetToken.update({where:{id:reset.id},data:{usedAt:new Date()}})
  ]);
  await prisma.passwordResetToken.deleteMany({where:{userId:reset.userId,usedAt:null}});
  res.json({success:true,message:"Password reset successfully. You can now sign in."});
});

router.get("/auth/me", requireAuth, authenticated(async (req,res) => {
  let user = await prisma.user.findUnique({where:{id:req.userId},select:{id:true,email:true,role:true,createdAt:true}});
  if (!user) return res.status(401).json({error:"Account not found."});
  const ownerEmail = process.env.PLATFORM_OWNER_EMAIL?.trim().toLowerCase();
  if (ownerEmail && user.email.toLowerCase() === ownerEmail && user.role !== "PLATFORM_OWNER") {
    user = await prisma.user.update({where:{id:user.id},data:{role:"PLATFORM_OWNER"},select:{id:true,email:true,role:true,createdAt:true}});
  }
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
    phone: z.string().trim().min(7, "Enter a valid phone number.").max(30).nullable().optional(),
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
    businessModel:z.enum(["B2B","B2C","B2B2C"]), phone:z.string().trim().min(7, "Enter a valid phone number.").max(30),
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
    businessModel:data.businessModel, phone:data.phone, website:data.website || null, brandColor:data.brandColor, sellingMode:data.sellingMode,
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
  }).refine(data => !data.stockEnabled || (data.stockQuantity !== undefined && data.stockQuantity !== null), {message:"Set an initial stock quantity when enabling stock tracking."}).parse(req.body);
  const business = await prisma.business.findFirst({where:{ownerUserId:req.userId},select:{id:true}});
  if (!business) return res.status(409).json({error:"Complete business setup first."});
  const definitions = await prisma.catalogueField.findMany({where:{businessId:business.id},select:{key:true,label:true,type:true,required:true,options:true}});
  const fieldError = validateProductFields(data.fields, definitions);
  if (fieldError) return res.status(400).json({error:fieldError});
  const product = await prisma.$transaction(async tx => {
    const created=await tx.selloraProduct.create({data:{
      businessId:business.id,name:data.name,sku:data.sku || null,description:data.description || null,
      price:data.price === undefined ? null : new Prisma.Decimal(data.price),currency:data.currency,unit:data.unit,
      imageUrl:data.imageUrl || null,stockEnabled:data.stockEnabled,stockQuantity:data.stockEnabled && data.stockQuantity !== undefined && data.stockQuantity !== null ? new Prisma.Decimal(data.stockQuantity) : null,fields:data.fields
    }});
    if(data.stockEnabled && data.stockQuantity && data.stockQuantity>0) {
      await tx.selloraStockMovement.create({data:{businessId:business.id,productId:created.id,quantityDelta:new Prisma.Decimal(data.stockQuantity),reason:"INITIAL_STOCK"}});
    }
    return created;
  });
  res.status(201).json(product);
}));
router.patch("/workspace/products/:id", requireAuth, authenticated(async (req,res) => {
  const data = z.object({
    name:z.string().trim().min(2).max(160).optional(),sku:z.string().trim().max(64).nullable().optional(),
    description:z.string().trim().max(2000).nullable().optional(),price:z.number().positive().nullable().optional(),
    currency:z.string().length(3).optional(),unit:z.string().trim().min(1).max(20).optional(),
    imageUrl:z.union([z.string().url().max(500),z.string().regex(/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/).max(4200000),z.literal("")]).nullable().optional(),
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
  const oldImageFilename=uploadedImageFilename(owned.imageUrl);
  if(oldImageFilename && product.imageUrl!==owned.imageUrl) {
    await fs.promises.unlink(path.join(getImageUploadDir(),oldImageFilename)).catch(()=>{});
  }
  res.json(product);
}));
router.post("/workspace/products/:id/image", requireAuth, productImageUpload.single("image"), authenticated(async (req,res) => {
  const business = await prisma.business.findFirst({where:{ownerUserId:req.userId},select:{id:true}});
  const file = (req as AuthedRequest & {file?: Express.Multer.File}).file;
  if (!business) {
    if (file) await fs.promises.unlink(file.path).catch(()=>{});
    return res.status(409).json({error:"Complete business setup first."});
  }
  const product = await prisma.selloraProduct.findFirst({where:{id:String(req.params.id),businessId:business.id},select:{id:true,imageUrl:true}});
  if (!product) {
    if (file) await fs.promises.unlink(file.path).catch(()=>{});
    return res.status(404).json({error:"Product not found."});
  }
  if (!file) return res.status(400).json({error:"Choose a PNG, JPEG, WebP or GIF image up to 5 MB."});
  const imageBytes=await fs.promises.readFile(file.path);
  if(!hasValidImageSignature(imageBytes,file.mimetype)){await fs.promises.unlink(file.path).catch(()=>{});return res.status(400).json({error:"The uploaded file is not a valid image of the selected type."});}
  const publicApiOrigin=(process.env.PUBLIC_API_URL||req.protocol+"://"+req.get("host")).replace(/\/$/,"");
  const imageUrl = publicApiOrigin + "/uploads/" + file.filename;
  await prisma.selloraProduct.update({where:{id:product.id},data:{imageUrl}});
  const oldImageFilename=uploadedImageFilename(product.imageUrl);
  if (oldImageFilename) {
    await fs.promises.unlink(path.join(getImageUploadDir(), oldImageFilename)).catch(()=>{});
  }
  res.status(201).json({imageUrl});
}));

router.get("/workspace/inventory", requireAuth, authenticated(async (req,res) => {
  const business = await prisma.business.findFirst({where:{ownerUserId:req.userId},select:{id:true}});
  if (!business) return res.status(409).json({error:"Complete business setup first."});
  const products = await prisma.selloraProduct.findMany({where:{businessId:business.id},orderBy:{name:"asc"},select:{id:true,name:true,sku:true,unit:true,stockEnabled:true,stockQuantity:true,updatedAt:true}});
  const movements = await prisma.selloraStockMovement.findMany({where:{businessId:business.id},include:{product:{select:{name:true,sku:true}},order:{select:{orderNumber:true}}},orderBy:{createdAt:"desc"},take:100});
  res.json({products,movements});
}));

router.post("/workspace/inventory/:productId/adjust", requireAuth, authenticated(async (req,res) => {
  const data = z.object({quantity:z.number().min(0).max(100000000),reason:z.enum(["RECEIVED","ADJUSTMENT","RETURNED"]),note:z.string().trim().max(500).optional()}).parse(req.body);
  const business = await prisma.business.findFirst({where:{ownerUserId:req.userId},select:{id:true}});
  if (!business) return res.status(409).json({error:"Complete business setup first."});
  const result = await prisma.$transaction(async tx => {
    const product = await tx.selloraProduct.findFirst({where:{id:String(req.params.productId),businessId:business.id},select:{id:true,stockEnabled:true,stockQuantity:true}});
    if (!product) throw Object.assign(new Error("Product not found."),{status:404});
    const current = product.stockEnabled && product.stockQuantity ? product.stockQuantity : new Prisma.Decimal(0);
    const next = new Prisma.Decimal(data.quantity);
    const delta = next.sub(current);
    await tx.selloraProduct.update({where:{id:product.id},data:{stockEnabled:true,stockQuantity:next}});
    if (!delta.isZero()) await tx.selloraStockMovement.create({data:{businessId:business.id,productId:product.id,quantityDelta:delta,reason:data.reason,note:data.note || null}});
    return {productId:product.id,stockEnabled:true,stockQuantity:next.toString(),movement:delta.toString()};
  });
  res.json(result);
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
  const data=z.object({title:z.string().trim().min(2).max(160),description:z.string().trim().max(1000).optional(),shareImageUrl:z.union([z.string().url().max(2000),z.literal(""),z.null()]).optional(),productIds:z.array(z.string()).max(500).default([])}).parse(req.body);
  const business=await prisma.business.findFirst({where:{ownerUserId:req.userId},select:{id:true,name:true,slug:true}});
  if (!business) return res.status(409).json({error:"Complete business setup first."});
  const ids=[...new Set(data.productIds)];
  const owned=ids.length?await prisma.selloraProduct.findMany({where:{id:{in:ids},businessId:business.id},select:{id:true}}):[];
  if(owned.length!==ids.length) return res.status(400).json({error:"One or more selected products do not belong to this business."});
  const base=slugify(data.title);
  let slug=`${business.slug}-${base}`.slice(0,95), suffix=2;
  while(await prisma.selloraCatalogue.findUnique({where:{slug}})) slug=`${business.slug}-${base}-${suffix++}`.slice(0,95);
  const catalogue=await prisma.selloraCatalogue.create({data:{
    businessId:business.id,title:data.title,slug,description:data.description || null,shareImageUrl:data.shareImageUrl || null,
    items:{create:ids.map((productId,index)=>({productId,sortOrder:index}))}
  },include:{items:{include:{product:true}}}});
  res.status(201).json(catalogue);
}));
router.patch("/workspace/catalogues/:id", requireAuth, authenticated(async (req,res) => {
  const data=z.object({title:z.string().trim().min(2).max(160).optional(),description:z.string().trim().max(1000).nullable().optional(),shareImageUrl:z.union([z.string().url().max(2000),z.literal(""),z.null()]).optional(),isPublished:z.boolean().optional(),productIds:z.array(z.string()).max(500).optional()}).parse(req.body);
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
    ...fields,...(fields.shareImageUrl !== undefined ? {shareImageUrl:fields.shareImageUrl || null} : {}),...(fields.isPublished && !existing.isPublished ? {publishedAt:new Date()} : {}),
    ...(fields.isPublished===false ? {publishedAt:null} : {})
  },include:{items:{include:{product:true}}}});
  res.json(updated);
}));


router.post("/workspace/catalogues/:id/image", requireAuth, productImageUpload.single("image"), authenticated(async (req,res) => {
  const file = (req as AuthedRequest & {file?: Express.Multer.File}).file;
  const business = await prisma.business.findFirst({where:{ownerUserId:req.userId},select:{id:true}});
  if (!business) {
    if (file) await fs.promises.unlink(file.path).catch(()=>{});
    return res.status(409).json({error:"Complete business setup first."});
  }
  const catalogue = await prisma.selloraCatalogue.findFirst({where:{id:String(req.params.id),businessId:business.id},select:{id:true,shareImageUrl:true}});
  if (!catalogue) {
    if (file) await fs.promises.unlink(file.path).catch(()=>{});
    return res.status(404).json({error:"Catalogue not found."});
  }
  if (!file) return res.status(400).json({error:"Choose a PNG, JPEG, WebP or GIF image up to 5 MB."});
  const imageBytes = await fs.promises.readFile(file.path);
  if (!hasValidImageSignature(imageBytes,file.mimetype)) {
    await fs.promises.unlink(file.path).catch(()=>{});
    return res.status(400).json({error:"The uploaded file is not a valid image of the selected type."});
  }
  const publicApiOrigin=(process.env.PUBLIC_API_URL||req.protocol+"://"+req.get("host")).replace(/\/$/,"");
  const shareImageUrl=publicApiOrigin+"/uploads/"+file.filename;
  await prisma.selloraCatalogue.update({where:{id:catalogue.id},data:{shareImageUrl}});
  const oldImageFilename=uploadedImageFilename(catalogue.shareImageUrl);
  if (oldImageFilename) await fs.promises.unlink(path.join(getImageUploadDir(),oldImageFilename)).catch(()=>{});
  res.status(201).json({shareImageUrl});
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
  createdAt:order.createdAt,paidAt:order.paymentStatus==="PAID"?order.paidAt:null,updatedAt:order.updatedAt,
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
router.post("/webhooks/razorpay", async (req,res) => {
  const raw=(req as Request & {rawBody?:Buffer}).rawBody;
  const signature=String(req.headers["x-razorpay-signature"]||"");
  if(!raw||!signature)return res.status(400).json({error:"Missing webhook signature or raw payload."});
  const event=req.body as {event?:string;payload?:{payment?:{entity?:{order_id?:string;id?:string}};order?:{entity?:{id?:string}};refund?:{entity?:{payment_id?:string;id?:string}}}};
  const eventType=String(event.event||"unknown");
  const orderId=event.payload?.payment?.entity?.order_id||event.payload?.order?.entity?.id;
  const paymentId=event.payload?.payment?.entity?.id||event.payload?.refund?.entity?.payment_id;
  let catalogueOrder = orderId ? await prisma.selloraOrder.findUnique({where:{razorpayOrderId:orderId},include:{business:true}}) : null;
  if(!catalogueOrder && paymentId) catalogueOrder=await prisma.selloraOrder.findFirst({where:{razorpayPaymentId:paymentId},include:{business:true}});
  const legacyPayment = orderId ? await prisma.paymentOrder.findUnique({where:{razorpayOrderId:orderId},include:{business:true}}) : null;
  const business = catalogueOrder?.business || legacyPayment?.business;
  if(!business?.razorpayWebhookSecretEncrypted)return res.status(400).json({error:"Webhook secret is not configured for this order."});
  const expected=crypto.createHmac("sha256",decryptStoredGatewaySecret(business.razorpayWebhookSecretEncrypted)).update(raw).digest("hex");
  if(!safeEqualHex(signature,expected))return res.status(400).json({error:"Invalid webhook signature."});
  const eventId=String(req.headers["x-razorpay-event-id"]||crypto.createHash("sha256").update(raw).digest("hex"));
  try {
    await prisma.$transaction(async tx => {
      await tx.paymentWebhookEvent.create({data:{businessId:business.id,eventId,eventType}});
      if(catalogueOrder) {
        if(eventType==="payment.captured"||eventType==="order.paid") {
          await tx.selloraOrder.update({where:{id:catalogueOrder.id},data:{
            paymentStatus:"PAID",razorpayPaymentId:paymentId||catalogueOrder.razorpayPaymentId,paidAt:catalogueOrder.paidAt||new Date(),
            status:catalogueOrder.status==="PENDING"?"CONFIRMED":catalogueOrder.status
          }});
        } else if(eventType==="payment.failed" && catalogueOrder.paymentStatus!=="PAID") {
          await tx.selloraOrder.update({where:{id:catalogueOrder.id},data:{paymentStatus:"FAILED"}});
        } else if(eventType==="refund.processed"||eventType==="payment.refunded") {
          const current=await tx.selloraOrder.findUnique({where:{id:catalogueOrder.id},include:{items:true}});
          if(current) {
            const claimed=await tx.selloraOrder.updateMany({where:{id:current.id,refundStatus:{not:"REFUNDED"}},data:{refundStatus:"REFUNDED",paymentStatus:"REFUNDED"}});
            if(claimed.count) {
              for(const item of current.items) {
                if(!item.productId) continue;
                const product=await tx.selloraProduct.findFirst({where:{id:item.productId,businessId:business.id},select:{id:true,stockEnabled:true}});
                if(product?.stockEnabled) {
                  await tx.selloraProduct.update({where:{id:product.id},data:{stockQuantity:{increment:new Prisma.Decimal(item.quantity)}}});
                  await tx.selloraStockMovement.create({data:{businessId:business.id,productId:product.id,orderId:current.id,quantityDelta:new Prisma.Decimal(item.quantity),reason:"ORDER_REFUNDED"}});
                }
              }
              if(!["DISPATCHED","DELIVERED"].includes(current.status)) await tx.selloraOrder.update({where:{id:current.id},data:{status:"CANCELLED"}});
            }
          }
        } else if(eventType==="refund.failed") {
          await tx.selloraOrder.update({where:{id:catalogueOrder.id},data:{refundStatus:"FAILED"}});
        }
      }
      if(legacyPayment) {
        if(eventType==="payment.captured"||eventType==="order.paid") await tx.paymentOrder.update({where:{id:legacyPayment.id},data:{status:"PAID",razorpayPaymentId:paymentId||legacyPayment.razorpayPaymentId,paidAt:legacyPayment.paidAt||new Date()}});
        else if(eventType==="payment.failed" && legacyPayment.status!=="PAID") await tx.paymentOrder.update({where:{id:legacyPayment.id},data:{status:"FAILED"}});
      }
    });
    res.json({received:true});
  } catch(error) {
    if(error && typeof error==="object" && "code" in error && (error as {code?:string}).code==="P2002") return res.json({received:true,duplicate:true});
    throw error;
  }
});


router.get("/public/catalogues/:slug", async (req,res) => {
  const catalogue=await prisma.selloraCatalogue.findFirst({
    where:{slug:req.params.slug,isPublished:true},
    include:{business:true,items:{where:{product:{isActive:true}},include:{product:true},orderBy:{sortOrder:"asc"}}}
  });
  if(!catalogue) return res.status(404).json({error:"This catalogue is not published or no longer available."});
  const subscription = await prisma.subscription.findUnique({
    where: { businessId: catalogue.businessId },
    select: { status: true, dueAt: true }
  });
  if (subscription && (subscription.status !== "ACTIVE" || subscription.dueAt.getTime() + 24 * 60 * 60 * 1000 < Date.now())) {
    return res.status(402).json({ error: "This catalogue is temporarily unavailable because the business subscription has expired.", code: "SUBSCRIPTION_REQUIRED" });
  }
  res.json({
    title:catalogue.title,description:catalogue.description,slug:catalogue.slug,shareImageUrl:catalogue.shareImageUrl,
    business:{name:catalogue.business.name,industry:catalogue.business.industry,email:catalogue.business.email,phone:catalogue.business.phone,address:catalogue.business.address,website:catalogue.business.website,brandColor:catalogue.business.brandColor,logoUrl:catalogue.business.logoUrl,sellingMode:catalogue.business.sellingMode,paymentGatewayStatus:catalogue.business.paymentGatewayStatus},
    checkoutReady: catalogue.business.sellingMode === "ONLINE_PAYMENTS" && catalogue.business.paymentGatewayStatus === "ACTIVE" && catalogue.business.paymentGatewayProvider === "RAZORPAY",
    products:catalogue.items.map(({product})=>({...product,price:product.price?.toString() ?? null}))
  });
});


router.post("/public/catalogues/:slug/enquiries", async (req,res) => {
  const data = z.object({
    customerName:z.string().trim().min(2).max(120),
    email:z.string().trim().email().max(160),
    phone:z.string().trim().min(7,"Enter a valid phone number.").max(30),
    companyName:z.string().trim().max(160).optional(),
    message:z.string().trim().min(3).max(2000),
    productId:z.string().optional()
  }).parse(req.body);
  const catalogue = await prisma.selloraCatalogue.findFirst({
    where:{slug:String(req.params.slug),isPublished:true},
    include:{business:{select:{id:true,name:true,email:true}},items:{select:{productId:true,product:{select:{name:true}}}}}
  });
  if (!catalogue) return res.status(404).json({error:"Catalogue not found."});
  const subscription = await prisma.subscription.findUnique({ where: { businessId: catalogue.business.id }, select: { status: true, dueAt: true } });
  if (subscription && (subscription.status !== "ACTIVE" || subscription.dueAt.getTime() + 24 * 60 * 60 * 1000 < Date.now())) {
    return res.status(402).json({ error: "This business subscription has expired.", code: "SUBSCRIPTION_REQUIRED" });
  }
  if (data.productId && !catalogue.items.some(item=>item.productId===data.productId)) {
    return res.status(400).json({error:"This product is not part of the published catalogue."});
  }
  const reference = "ENQ-" + crypto.randomBytes(4).toString("hex").toUpperCase();
  const email = data.email?.trim().toLowerCase() || null;
  const phone = data.phone?.trim() || null;
  const normalizePhone = (value: string | null | undefined) => (value || "").replace(/\\D/g, "");
  const phoneDigits = normalizePhone(phone);
  const enquiry = await prisma.$transaction(async tx => {
    // Match within this business using normalized email or phone. Phone formatting
    // differences such as spaces, dashes, and country-code prefixes should not
    // create a new customer record for every enquiry.
    const candidates = await tx.selloraCustomer.findMany({
      where:{businessId:catalogue.business.id,OR:[...(email?[{email}]:[]),...(phone?[{phone}]:[])]},
      orderBy:{updatedAt:"desc"}
    });
    let customer = candidates.find(candidate =>
      Boolean(email && candidate.email?.trim().toLowerCase() === email) ||
      Boolean(phoneDigits && normalizePhone(candidate.phone) === phoneDigits) ||
      Boolean(phoneDigits && phoneDigits.length >= 10 && normalizePhone(candidate.phone).length >= 10 &&
        normalizePhone(candidate.phone).slice(-10) === phoneDigits.slice(-10))
    );
    // Fallback for previously stored numbers with different formatting, which
    // cannot be matched with an exact database query.
    if (!customer && phoneDigits.length >= 10) {
      const phoneCandidates = await tx.selloraCustomer.findMany({
        where:{businessId:catalogue.business.id,phone:{not:null}},
        orderBy:{updatedAt:"desc"}
      });
      customer = phoneCandidates.find(candidate => {
        const savedDigits = normalizePhone(candidate.phone);
        return savedDigits === phoneDigits ||
          (savedDigits.length >= 10 && savedDigits.slice(-10) === phoneDigits.slice(-10));
      });
    }
    if (customer) {
      customer = await tx.selloraCustomer.update({where:{id:customer.id},data:{
        name:data.customerName,
        email:email||customer.email,
        phone:phone||customer.phone,
        ...(data.companyName?.trim()?{notes:data.companyName.trim()}: {})
      }});
    } else {
      customer = await tx.selloraCustomer.create({data:{businessId:catalogue.business.id,name:data.customerName,email,phone,notes:data.companyName?.trim() || null}});
    }
    return tx.selloraEnquiry.create({data:{
      reference,businessId:catalogue.business.id,catalogueId:catalogue.id,productId:data.productId||null,
      customerId:customer.id,customerName:data.customerName,email,phone,companyName:data.companyName?.trim()||null,message:data.message
    },select:{reference:true,createdAt:true}});
  });
  await prisma.catalogueAnalyticsEvent.create({data:{catalogueId:catalogue.id,eventType:"enquiry_submitted",metadata:{reference:enquiry.reference,productId:data.productId||""}}}).catch(()=>{});

  // Optional business email notification. Configure RESEND_API_KEY and set
  // ENQUIRY_EMAIL_NOTIFICATIONS_ENABLED=true to enable it. Notification failure
  // must never prevent the enquiry from being saved or the customer getting a reference.
  const resendApiKey = process.env.RESEND_API_KEY;
  const notificationsEnabled = process.env.ENQUIRY_EMAIL_NOTIFICATIONS_ENABLED === "true";
  if (notificationsEnabled && resendApiKey && catalogue.business.email) {
    const productName = data.productId
      ? catalogue.items.find(item => item.productId === data.productId)?.product.name || "Selected product"
      : "General enquiry";
    const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
    }[char] || char));
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method:"POST",
        headers:{"Authorization":"Bearer "+resendApiKey,"Content-Type":"application/json"},
        body:JSON.stringify({
          from:process.env.RESEND_FROM_EMAIL || "Sellora <onboarding@resend.dev>",
          to:[catalogue.business.email],
          subject:"New customer enquiry "+reference+" — "+catalogue.business.name,
          html:"<h2>New enquiry received</h2><p><b>Reference:</b> "+escapeHtml(reference)+"</p><p><b>Customer:</b> "+escapeHtml(data.customerName)+"</p><p><b>Company:</b> "+escapeHtml(data.companyName?.trim() || "Not provided")+"</p><p><b>Email:</b> "+escapeHtml(email || "Not provided")+"</p><p><b>Phone:</b> "+escapeHtml(phone || "Not provided")+"</p><p><b>Interested in:</b> "+escapeHtml(productName)+"</p><p><b>Message:</b><br>"+escapeHtml(data.message).replace(/\\n/g,"<br>")+"</p><p>Open Sellora → Customers → Enquiries to follow up.</p>"
        })
      });
      if (!response.ok) console.error("Sellora enquiry notification failed:", response.status, await response.text().catch(()=> ""));
    } catch (notificationError) {
      console.error("Sellora enquiry notification failed:", notificationError);
    }
  }
  res.status(201).json({success:true,reference:enquiry.reference,message:"Your enquiry has been sent to the business."});
});

router.post("/public/catalogues/:slug/orders", async (req,res) => {

  const catalogue=await prisma.selloraCatalogue.findFirst({
    where:{slug:String(req.params.slug),isPublished:true},
    include:{business:true,items:{where:{product:{isActive:true}},include:{product:true}}}
  });
  if(!catalogue) return res.status(404).json({error:"This catalogue is not published or no longer available."});
  const subscription = await prisma.subscription.findUnique({ where: { businessId: catalogue.businessId }, select: { status: true, dueAt: true } });
  if (subscription && (subscription.status !== "ACTIVE" || subscription.dueAt.getTime() + 24 * 60 * 60 * 1000 < Date.now())) {
    return res.status(402).json({ error: "This business subscription has expired.", code: "SUBSCRIPTION_REQUIRED" });
  }
  if(catalogue.business.sellingMode !== "ONLINE_PAYMENTS") return res.status(403).json({error:"Online checkout is not enabled."});
  if(catalogue.business.paymentGatewayProvider !== "RAZORPAY" || catalogue.business.paymentGatewayStatus !== "ACTIVE" || !catalogue.business.razorpayKeyId || !catalogue.business.razorpayKeySecretEncrypted) {
    return res.status(409).json({error:"This business has not connected Razorpay payments yet. Please contact the business."});
  }
  const data = z.object({
    customerName:z.string().trim().min(2).max(120),
    email:z.string().trim().email().max(160),
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
    if(product.stockEnabled && (product.stockQuantity === null || product.stockQuantity === undefined || product.stockQuantity.lte(0))) {
      return res.status(409).json({error: product.name + " is out of stock. Please enquire with the business."});
    }
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
      const email=data.email?.trim().toLowerCase()||null;
      let customer=await tx.selloraCustomer.findFirst({where:{businessId:catalogue.businessId,OR:[{phone:data.phone},...(email?[{email}]:[])]}});
      if(customer) customer=await tx.selloraCustomer.update({where:{id:customer.id},data:{name:data.customerName,email:email||customer.email,phone:data.phone,address:data.address}});
      else customer=await tx.selloraCustomer.create({data:{businessId:catalogue.businessId,name:data.customerName,email,phone:data.phone,address:data.address}});
      const created=await tx.selloraOrder.create({data:{
        orderNumber,businessId:catalogue.businessId,catalogueId:catalogue.id,customerId:customer.id,customerName:data.customerName,email,
        phone:data.phone,address:data.address,notes:data.notes||null,currency:"INR",subtotal:total,taxAmount,totalAmount:grandTotal,
        items:{create:orderItems}
      },select:{id:true,orderNumber:true,status:true,paymentStatus:true,currency:true,subtotal:true,createdAt:true}});
      for(const [productId,quantity] of requested.entries()) {
        const product=available.get(productId);
        if(product?.stockEnabled) {
          const stock=product.stockQuantity;
          if(stock===null||stock===undefined||stock.lt(quantity)) throw Object.assign(new Error("Insufficient stock for "+product.name+"."),{status:409});
          const changed=await tx.selloraProduct.updateMany({where:{id:productId,businessId:catalogue.businessId,stockEnabled:true,stockQuantity:{gte:new Prisma.Decimal(quantity)}},data:{stockQuantity:{decrement:new Prisma.Decimal(quantity)}}});
          if(!changed.count) throw Object.assign(new Error("Stock changed while placing the order. Refresh the catalogue and try again."),{status:409});
          await tx.selloraStockMovement.create({data:{businessId:catalogue.businessId,productId,orderId:created.id,quantityDelta:new Prisma.Decimal(-quantity),reason:"ORDER_RESERVED"}});
        }
      }
      return created;
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
    const status = error && typeof error==="object" && "status" in error ? Number((error as {status?:number}).status) : 502;
    if (order) {
      await prisma.$transaction(async tx => {
        for(const [productId,quantity] of requested.entries()) {
          const product=available.get(productId);
          if(product?.stockEnabled) {
            await tx.selloraProduct.updateMany({where:{id:productId,businessId:catalogue.businessId,stockEnabled:true},data:{stockQuantity:{increment:new Prisma.Decimal(quantity)}}});
            await tx.selloraStockMovement.create({data:{businessId:catalogue.businessId,productId,quantityDelta:new Prisma.Decimal(quantity),reason:"ORDER_RESERVATION_RELEASED",note:"Checkout could not be started."}});
          }
        }
        await tx.selloraOrder.delete({where:{id:order!.id}});
      }).catch(()=>{});
    }
    const message = error instanceof Error ? error.message : "Could not start Razorpay checkout.";
    res.status(status===409?409:502).json({error:status===409?message:"Could not start payment. " + message});
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
    const updated=await prisma.selloraOrder.update({where:{id:order.id},data:{razorpayPaymentId:payment.id,paymentStatus:"PAID",status:"CONFIRMED",paidAt:order.paidAt||new Date()}});
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
    select:{id:true,status:true,paymentStatus:true,orderNumber:true,items:true}
  });
  if (!order) return res.status(404).json({error:"Order not found."});
  if (order.status === "CANCELLED" || order.status === "DELIVERED") {
    return res.status(409).json({error:"This order is already in a final fulfilment state."});
  }
  if (data.status === "CANCELLED" && order.paymentStatus === "PAID") {
    return res.status(409).json({error:"This order has a verified payment. Process the refund before cancelling it."});
  }
  const updated = await prisma.$transaction(async tx => {
    const claimed=await tx.selloraOrder.updateMany({where:{id:order.id,businessId:business.id,status:order.status},data:{status:data.status}});
    if(!claimed.count) return null;
    if(data.status==="CANCELLED") {
      for(const item of order.items) {
        if(!item.productId) continue;
        const product=await tx.selloraProduct.findFirst({where:{id:item.productId,businessId:business.id},select:{id:true,stockEnabled:true}});
        if(product?.stockEnabled) {
          await tx.selloraProduct.update({where:{id:product.id},data:{stockQuantity:{increment:new Prisma.Decimal(item.quantity)}}});
          await tx.selloraStockMovement.create({data:{businessId:business.id,productId:product.id,orderId:order.id,quantityDelta:new Prisma.Decimal(item.quantity),reason:"ORDER_CANCELLED"}});
        }
      }
    }
    return tx.selloraOrder.findUnique({where:{id:order.id},select:{id:true,orderNumber:true,status:true,paymentStatus:true,updatedAt:true}});
  });
  if(!updated) return res.status(409).json({error:"The order status changed. Refresh and try again."});
  res.json(updated);
}));

router.patch("/workspace/orders/:id", requireAuth, authenticated(async (req,res) => {
  const data=z.object({
    customerName:z.string().trim().min(2).max(120).optional(),
    email:z.union([z.string().trim().email().max(160),z.literal("")]).nullable().optional(),
    phone:z.string().trim().min(7).max(30).optional(),
    address:z.string().trim().min(5).max(1000).nullable().optional(),
    notes:z.string().trim().max(1000).nullable().optional()
  }).refine(v=>Object.values(v).some(value=>value!==undefined),{message:"Provide at least one order field to update."}).parse(req.body);
  const business=await prisma.business.findFirst({where:{ownerUserId:req.userId},select:{id:true}});
  if(!business)return res.status(409).json({error:"Complete business setup first."});
  const order=await prisma.selloraOrder.findFirst({where:{id:String(req.params.id),businessId:business.id},select:{id:true,status:true,paymentStatus:true,customerId:true}});
  if(!order)return res.status(404).json({error:"Order not found."});
  if(["DELIVERED","CANCELLED","DISPATCHED"].includes(order.status))return res.status(409).json({error:"Customer details cannot be changed after dispatch or completion."});
  const fields={...data,email:data.email===""?null:data.email,address:data.address===""?null:data.address};
  const updated=await prisma.$transaction(async tx=>{
    const saved=await tx.selloraOrder.update({where:{id:order.id},data:fields,include:{items:true}});
    if(order.customerId) await tx.selloraCustomer.update({where:{id:order.customerId},data:{
      ...(data.customerName!==undefined?{name:data.customerName}:{}),
      ...(data.email!==undefined?{email:fields.email}:{}),
      ...(data.phone!==undefined?{phone:data.phone}:{}),
      ...(data.address!==undefined?{address:fields.address}:{})
    }});
    return saved;
  });
  res.json({...updated,subtotal:updated.subtotal.toString(),taxAmount:updated.taxAmount.toString(),totalAmount:updated.totalAmount.toString(),items:updated.items.map(item=>({...item,unitPrice:item.unitPrice.toString(),lineTotal:item.lineTotal.toString()}))});
}));

router.post("/workspace/orders/:id/refund", requireAuth, authenticated(async (req,res) => {
  const business=await prisma.business.findFirst({where:{ownerUserId:req.userId},select:{id:true,razorpayKeyId:true,razorpayKeySecretEncrypted:true}});
  if(!business)return res.status(409).json({error:"Complete business setup first."});
  const order=await prisma.selloraOrder.findFirst({where:{id:String(req.params.id),businessId:business.id},include:{items:true}});
  if(!order)return res.status(404).json({error:"Order not found."});
  if(order.paymentStatus!=="PAID"||!order.razorpayPaymentId)return res.status(409).json({error:"Only verified, paid catalogue orders can be refunded."});
  if(order.refundStatus!=="NONE"&&order.refundStatus!=="FAILED")return res.status(409).json({error:"A refund is already pending or completed for this order."});
  if(!business.razorpayKeyId||!business.razorpayKeySecretEncrypted)return res.status(409).json({error:"Razorpay credentials are not configured."});
  const claim=await prisma.selloraOrder.updateMany({where:{id:order.id,businessId:business.id,refundStatus:order.refundStatus},data:{refundStatus:"PENDING"}});
  if(!claim.count)return res.status(409).json({error:"The refund state changed. Refresh and try again."});
  try {
    const secret=decryptStoredGatewaySecret(business.razorpayKeySecretEncrypted);
    const refund=await razorpayRequest<{id:string;status:string}>(business.razorpayKeyId,secret,"/payments/"+encodeURIComponent(order.razorpayPaymentId)+"/refund",{
      method:"POST",body:JSON.stringify({amount:order.totalAmount.mul(100).toDecimalPlaces(0).toNumber(),notes:{selloraOrderId:order.id,orderNumber:order.orderNumber}})
    });
    await prisma.selloraOrder.updateMany({where:{id:order.id,businessId:business.id,refundStatus:"PENDING"},data:{razorpayRefundId:refund.id}});
    const updated=await prisma.selloraOrder.findUnique({where:{id:order.id},select:{orderNumber:true,refundStatus:true}});
    res.json({orderNumber:updated?.orderNumber||order.orderNumber,refundStatus:updated?.refundStatus||"PENDING",refundId:refund.id,message:"Refund submitted to Razorpay. Final status will be reconciled by webhook."});
  } catch(error) {
    await prisma.selloraOrder.update({where:{id:order.id},data:{refundStatus:"FAILED"}}).catch(()=>{});
    res.status(502).json({error:error instanceof Error?"Razorpay refund failed: "+error.message:"Could not submit refund."});
  }
}));

router.get("/workspace/enquiries", requireAuth, authenticated(async (req,res) => {
  const business = await prisma.business.findFirst({where:{ownerUserId:req.userId},select:{id:true}});
  if (!business) return res.status(409).json({error:"Complete business setup first."});
  const enquiries = await prisma.selloraEnquiry.findMany({where:{businessId:business.id},include:{catalogue:{select:{title:true,slug:true}},product:{select:{name:true,sku:true}},customer:{select:{id:true,name:true,email:true,phone:true}}},orderBy:{createdAt:"desc"}});
  res.json(enquiries);
}));

router.patch("/workspace/enquiries/:id", requireAuth, authenticated(async (req,res) => {
  const data = z.object({status:z.enum(["NEW","CONTACTED","QUOTATION_SENT","CONVERTED","LOST"]),message:z.string().trim().max(2000).optional()}).parse(req.body);
  const business = await prisma.business.findFirst({where:{ownerUserId:req.userId},select:{id:true}});
  if (!business) return res.status(409).json({error:"Complete business setup first."});
  const enquiry = await prisma.selloraEnquiry.findFirst({where:{id:String(req.params.id),businessId:business.id},select:{id:true}});
  if (!enquiry) return res.status(404).json({error:"Enquiry not found."});
  res.json(await prisma.selloraEnquiry.update({where:{id:enquiry.id},data,include:{catalogue:{select:{title:true}},product:{select:{name:true}},customer:{select:{id:true,name:true,email:true,phone:true}}}}));
}));

router.get("/workspace/customers", requireAuth, authenticated(async (req,res) => {
  const business = await prisma.business.findFirst({where:{ownerUserId:req.userId},select:{id:true}});
  if (!business) return res.status(409).json({error:"Complete business setup first."});
  const legacyPayments=await prisma.paymentOrder.findMany({where:{businessId:business.id},select:{id:true,customerName:true,customerEmail:true,customerPhone:true,productName:true,quantity:true,unit:true,amount:true,currency:true,status:true,createdAt:true,paidAt:true,updatedAt:true,razorpayOrderId:true,razorpayPaymentId:true}});
  for(const legacy of legacyPayments) {
    const email=legacy.customerEmail?.toLowerCase()||null;
    const phone=legacy.customerPhone||null;
    if(!email&&!phone) continue;
    const existing=await prisma.selloraCustomer.findFirst({where:{businessId:business.id,OR:[...(phone?[{phone}]:[]),...(email?[{email}]:[])]}});
    if(!existing) await prisma.selloraCustomer.create({data:{businessId:business.id,name:legacy.customerName,email,phone}});
  }
  const customers = await prisma.selloraCustomer.findMany({
    where:{businessId:business.id},
    include:{orders:{orderBy:{createdAt:"desc"},include:{items:true}},enquiries:{orderBy:{createdAt:"desc"},select:{id:true,reference:true,status:true,createdAt:true,message:true}}},
    orderBy:{updatedAt:"desc"}
  });
  res.json(customers.map(customer=>{
    const legacyOrders=legacyPayments.filter(payment=>
      (customer.phone && payment.customerPhone===customer.phone) ||
      (customer.email && payment.customerEmail?.toLowerCase()===customer.email.toLowerCase())
    ).map(payment=>({
      id:"payment-"+payment.id,orderNumber:payment.id,recordType:"PAYMENT_ORDER",
      status:payment.status==="PAID"?"CONFIRMED":payment.status==="FAILED"?"PAYMENT_FAILED":"PENDING",
      paymentStatus:payment.status,currency:payment.currency,subtotal:payment.amount.toString(),taxAmount:"0",totalAmount:payment.amount.toString(),
      createdAt:payment.createdAt,paidAt:payment.paidAt,updatedAt:payment.updatedAt,
      razorpayOrderId:payment.razorpayOrderId,razorpayPaymentId:payment.razorpayPaymentId,
      items:[{id:"item-"+payment.id,productName:payment.productName,sku:null,quantity:payment.quantity,unit:payment.unit,unitPrice:payment.amount.toString(),lineTotal:payment.amount.toString()}]
    }));
    const catalogueOrders=customer.orders.map(order=>({...order,subtotal:order.subtotal.toString(),taxAmount:order.taxAmount.toString(),totalAmount:order.totalAmount.toString(),items:order.items.map(item=>({...item,unitPrice:item.unitPrice.toString(),lineTotal:item.lineTotal.toString()}))}));
    return {...customer,orders:[...catalogueOrders,...legacyOrders].sort((a,b)=>new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime())};
  }));
}));

router.get("/workspace/reports", requireAuth, authenticated(async (req,res) => {
  const query = z.object({from:z.string().datetime().optional(),to:z.string().datetime().optional()}).parse(req.query);
  const business = await prisma.business.findFirst({where:{ownerUserId:req.userId},select:{id:true}});
  if (!business) return res.status(409).json({error:"Complete business setup first."});
  const from = query.from ? new Date(query.from) : new Date(Date.now()-30*24*60*60*1000);
  const to = query.to ? new Date(query.to) : new Date();
  if (from > to) return res.status(400).json({error:"Report start date must be before the end date."});
  const createdRange={gte:from,lte:to};
  const [orders, legacyOrders, paidOrders, paidLegacy, enquiries, products, movements] = await Promise.all([
    prisma.selloraOrder.findMany({where:{businessId:business.id,createdAt:createdRange},select:{id:true,orderNumber:true,status:true,paymentStatus:true,subtotal:true,taxAmount:true,totalAmount:true,createdAt:true,paidAt:true}}),
    prisma.paymentOrder.findMany({where:{businessId:business.id,createdAt:createdRange},select:{id:true,status:true,amount:true,currency:true,createdAt:true,paidAt:true,customerName:true}}),
    prisma.selloraOrder.findMany({where:{businessId:business.id,paymentStatus:"PAID",paidAt:createdRange},select:{subtotal:true,taxAmount:true,totalAmount:true,paidAt:true}}),
    prisma.paymentOrder.findMany({where:{businessId:business.id,status:"PAID",paidAt:createdRange},select:{amount:true,paidAt:true}}),
    prisma.selloraEnquiry.count({where:{businessId:business.id,createdAt:createdRange}}),
    prisma.selloraProduct.count({where:{businessId:business.id,isActive:true}}),
    prisma.selloraStockMovement.count({where:{businessId:business.id,createdAt:createdRange}})
  ]);
  const unpaidOrderCount=orders.filter(order=>order.paymentStatus!=="PAID").length+legacyOrders.filter(order=>order.status!=="PAID").length;
  const paidTotal=[...paidOrders.map(order=>order.totalAmount),...paidLegacy.map(order=>order.amount)].reduce((sum,amount)=>sum.add(amount),new Prisma.Decimal(0));
  const paidSubtotal=paidOrders.reduce((sum,order)=>sum.add(order.subtotal),new Prisma.Decimal(0)).add(paidLegacy.reduce((sum,order)=>sum.add(order.amount),new Prisma.Decimal(0)));
  const paidTax=paidOrders.reduce((sum,order)=>sum.add(order.taxAmount),new Prisma.Decimal(0));
  const orderRows=[
    ...orders.map(order=>({...order,recordType:"CATALOGUE_ORDER",subtotal:order.subtotal.toString(),taxAmount:order.taxAmount.toString(),totalAmount:order.totalAmount.toString()})),
    ...legacyOrders.map(order=>({id:"payment-"+order.id,orderNumber:order.id,recordType:"PAYMENT_ORDER",status:order.status==="PAID"?"CONFIRMED":order.status==="FAILED"?"PAYMENT_FAILED":"PENDING",paymentStatus:order.status,subtotal:order.amount.toString(),taxAmount:"0",totalAmount:order.amount.toString(),createdAt:order.createdAt,paidAt:order.paidAt}))
  ].sort((a,b)=>new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime());
  res.json({
    from:from.toISOString(),to:to.toISOString(),orderCount:orderRows.length,
    paidOrderCount:paidOrders.length+paidLegacy.length,unpaidOrderCount,
    paidSubtotal:paidSubtotal.toString(),paidTax:paidTax.toString(),paidTotal:paidTotal.toString(),
    enquiryCount:enquiries,activeProductCount:products,stockMovementCount:movements,orders:orderRows
  });
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


function platformRazorpayConfig() {
  const keyId = process.env.PLATFORM_RAZORPAY_KEY_ID?.trim() || "";
  const keySecret = process.env.PLATFORM_RAZORPAY_KEY_SECRET || "";
  if (!keyId || !keySecret) throw new Error("Platform subscription payments are not configured. Set PLATFORM_RAZORPAY_KEY_ID and PLATFORM_RAZORPAY_KEY_SECRET on the API server.");
  return { keyId, keySecret };
}

const defaultSubscriptionPrices = { MONTHLY: 249, YEARLY: 2490 } as const;
async function getSubscriptionPrices() {
  const settings = await prisma.platformPricing.findUnique({ where: { id: "default" } });
  return settings ? { MONTHLY: Number(settings.monthlyPrice), YEARLY: Number(settings.yearlyPrice) } : { ...defaultSubscriptionPrices };
}
async function platformOwnerAllowed(req: AuthedRequest, res: Response) {
  const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { id: true, email: true, role: true } });
  const ownerEmail = process.env.PLATFORM_OWNER_EMAIL?.trim().toLowerCase();
  if (!user || user.role !== "PLATFORM_OWNER" || !ownerEmail || user.email.toLowerCase() !== ownerEmail) {
    res.status(403).json({ error: "Platform owner access required." });
    return null;
  }
  return user;
}
router.get("/public/pricing", async (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json(await getSubscriptionPrices());
});
router.get("/platform/owner/businesses", requireAuth, authenticated(async (req, res) => {
  if (!await platformOwnerAllowed(req, res)) return;
  const businesses = await prisma.business.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      owner: { select: { email: true } },
      subscription: { include: { payments: { orderBy: { createdAt: "desc" }, take: 10 } } },
      _count: { select: { products: true, catalogues: true, orders: true } }
    }
  });
  const now = new Date();
  res.json(businesses.map(b => {
    const s = b.subscription;
    const graceEnd = s ? new Date(s.dueAt.getTime() + 86400000) : null;
    return {
      id: b.id, name: b.name, slug: b.slug, email: b.email, phone: b.phone, createdAt: b.createdAt,
      owner: b.owner, counts: { products: b._count.products, catalogues: b._count.catalogues, orders: b._count.orders },
      subscription: s ? { id: s.id, status: s.status, interval: s.interval, amount: s.amount.toString(), dueAt: s.dueAt, lastPaidAt: s.lastPaidAt, isLocked: s.status !== "ACTIVE" || !graceEnd || graceEnd < now } : null,
      recentPayments: s?.payments.map(p => ({ id:p.id, amount:p.amount.toString(), interval:p.interval, status:p.status, paidAt:p.paidAt, createdAt:p.createdAt, razorpayPaymentId:p.razorpayPaymentId, razorpayOrderId:p.razorpayOrderId })) || []
    };
  }));
}));
router.get("/platform/owner/payments", requireAuth, authenticated(async (req, res) => {
  if (!await platformOwnerAllowed(req, res)) return;
  const [payments, aggregate] = await Promise.all([
    prisma.platformSubscriptionPayment.findMany({
      include: {
        subscription: {
          include: {
            business: {
              select: {
                id: true,
                name: true,
                slug: true,
                owner: { select: { email: true } }
              }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.platformSubscriptionPayment.aggregate({ where: { status: "PAID" }, _sum: { amount: true }, _count: { _all: true } })
  ]);
  res.json({
    totalCollected: (aggregate._sum.amount || new Prisma.Decimal(0)).toString(),
    successfulPayments: aggregate._count._all,
    payments: payments.map(p => ({ id:p.id, businessId:p.subscription.business.id, businessName:p.subscription.business.name, businessSlug:p.subscription.business.slug, customerEmail:p.subscription.business.owner?.email || "", interval:p.interval, amount:p.amount.toString(), currency:p.currency, status:p.status, razorpayOrderId:p.razorpayOrderId, razorpayPaymentId:p.razorpayPaymentId, paidAt:p.paidAt, createdAt:p.createdAt }))
  });
}));

router.get("/platform/owner/audit", requireAuth, authenticated(async (req, res) => {
  if (!await platformOwnerAllowed(req, res)) return;
  const events = await prisma.platformAuditEvent.findMany({
    orderBy: { createdAt: "desc" }, take: 200,
    include: { subscription: { include: { business: { select: { name:true, slug:true } } } } }
  });
  res.json(events);
}));
router.patch("/platform/owner/businesses/:id/subscription", requireAuth, authenticated(async (req, res) => {
  const owner = await platformOwnerAllowed(req, res);
  if (!owner) return;
  const data = z.object({
    interval: z.enum(["MONTHLY", "YEARLY"]).optional(),
    status: z.enum(["ACTIVE", "LOCKED", "PENDING"]).optional(),
    dueAt: z.string().datetime().optional()
  }).refine(v => Object.keys(v).length > 0).parse(req.body);
  const business = await prisma.business.findUnique({ where: { id: String(req.params.id) }, select: { id:true } });
  if (!business) return res.status(404).json({ error:"Business not found." });
  const prices = await getSubscriptionPrices();
  const interval = data.interval || "MONTHLY";
  const subscription = await prisma.subscription.upsert({
    where: { businessId: business.id },
    create: { businessId:business.id, status:data.status || "ACTIVE", interval, amount:prices[interval], currency:"INR", currentPeriodStart:new Date(), currentPeriodEnd:data.dueAt ? new Date(data.dueAt) : new Date(Date.now()+30*86400000), dueAt:data.dueAt ? new Date(data.dueAt) : new Date(Date.now()+30*86400000) },
    update: { ...(data.interval ? { interval, amount:prices[interval] } : {}), ...(data.status ? { status:data.status === "LOCKED" ? "PAST_DUE" : data.status } : {}), ...(data.dueAt ? { dueAt:new Date(data.dueAt) } : {}) }
  });
  await prisma.platformAuditEvent.create({ data: { subscriptionId:subscription.id, actorUserId:owner.id, action:"SUBSCRIPTION_UPDATED", details:data } });
  res.json({ success:true });
}));
router.get("/platform/owner/pricing", requireAuth, authenticated(async (req, res) => {
  if (!await platformOwnerAllowed(req, res)) return;
  res.json(await getSubscriptionPrices());
}));
router.patch("/platform/owner/pricing", requireAuth, authenticated(async (req, res) => {
  const owner = await platformOwnerAllowed(req, res);
  if (!owner) return;
  const data = z.object({ MONTHLY: z.number().finite().min(1).max(1000000), YEARLY: z.number().finite().min(1).max(10000000) }).parse(req.body);
  const previous = await getSubscriptionPrices();
  const updated = await prisma.platformPricing.upsert({
    where: { id: "default" },
    create: { id: "default", monthlyPrice: data.MONTHLY, yearlyPrice: data.YEARLY, updatedBy: owner.id },
    update: { monthlyPrice: data.MONTHLY, yearlyPrice: data.YEARLY, updatedBy: owner.id }
  });
  await prisma.platformAuditEvent.create({ data: { actorUserId: owner.id, action: "SUBSCRIPTION_PRICING_UPDATED", details: { previous, next: data } } });
  res.json({ MONTHLY: Number(updated.monthlyPrice), YEARLY: Number(updated.yearlyPrice) });
}));

function subscriptionPeriod(interval: "MONTHLY" | "YEARLY", from = new Date()) {
  const end = new Date(from);
  if (interval === "YEARLY") end.setFullYear(end.getFullYear() + 1);
  else end.setMonth(end.getMonth() + 1);
  return end;
}

// Platform subscriptions always use Sellora's merchant credentials, never a tenant's gateway keys.
router.get("/workspace/subscription", requireAuth, authenticated(async (req,res) => {
  const business = await prisma.business.findFirst({ where: { ownerUserId: req.userId }, select: { id: true } });
  if (!business) return res.status(409).json({ error: "Complete business setup before subscribing." });
  const now = new Date();
  let subscription = await prisma.subscription.findUnique({ where: { businessId: business.id }, include: { payments: { orderBy: { createdAt: "desc" }, take: 10 } } });
  if (!subscription) {
    subscription = await prisma.subscription.create({ data: { businessId: business.id, status: "PENDING", interval: "MONTHLY", amount: (await getSubscriptionPrices()).MONTHLY, currency: "INR", currentPeriodStart: now, currentPeriodEnd: now, dueAt: now }, include: { payments: { orderBy: { createdAt: "desc" }, take: 10 } } });
  }
  let configured = true;
  try { platformRazorpayConfig(); } catch { configured = false; }
  const gracePeriodEndsAt = new Date(subscription.dueAt.getTime() + 24 * 60 * 60 * 1000);
  const isPastDue = subscription.dueAt.getTime() < now.getTime();
  const gracePeriodActive = subscription.status === "ACTIVE" && isPastDue && gracePeriodEndsAt.getTime() >= now.getTime();
  const locked = subscription.status !== "ACTIVE" || gracePeriodEndsAt.getTime() < now.getTime();
  res.json({
    id: subscription.id, status: subscription.status, interval: subscription.interval,
    amount: subscription.amount.toString(), currency: subscription.currency,
    currentPeriodStart: subscription.currentPeriodStart, currentPeriodEnd: subscription.currentPeriodEnd,
    dueAt: subscription.dueAt, lastPaidAt: subscription.lastPaidAt, isLocked: locked,
    isPastDue, gracePeriodActive, gracePeriodEndsAt,
    paymentConfigured: configured, prices: await getSubscriptionPrices(),
    recentPayments: subscription.payments.map(p => ({ id:p.id, interval:p.interval, amount:p.amount.toString(), status:p.status, createdAt:p.createdAt, paidAt:p.paidAt }))
  });
}));

router.post("/workspace/subscription/order", requireAuth, authenticated(async (req,res) => {
  const data = z.object({ interval: z.enum(["MONTHLY", "YEARLY"]) }).parse(req.body);
  const business = await prisma.business.findFirst({ where: { ownerUserId: req.userId }, select: { id:true, name:true, email:true } });
  if (!business) return res.status(409).json({ error: "Complete business setup before subscribing." });
  let gateway: {keyId:string;keySecret:string};
  try { gateway = platformRazorpayConfig(); } catch (e) { return res.status(503).json({ error: e instanceof Error ? e.message : "Platform payments are not configured." }); }
  const prices = await getSubscriptionPrices();
  const amount = prices[data.interval];
  const now = new Date();
  const subscription = await prisma.subscription.upsert({
    where: { businessId: business.id },
    create: { businessId: business.id, status:"PENDING", interval:data.interval, amount, currency:"INR", currentPeriodStart:now, currentPeriodEnd:now, dueAt:now },
    update: {}
  });
  const receipt = ("sub_" + business.id + "_" + Date.now()).slice(0, 40);
  try {
    const order = await razorpayRequest<{id:string;amount:number;currency:string}>(gateway.keyId,gateway.keySecret,"/orders",{
      method:"POST", body:JSON.stringify({ amount:amount*100, currency:"INR", receipt, notes:{ selloraSubscriptionId:subscription.id, businessId:business.id, interval:data.interval } })
    });
    await prisma.platformSubscriptionPayment.create({ data: { subscriptionId:subscription.id, interval:data.interval, amount, currency:"INR", razorpayOrderId:order.id, status:"CREATED" } });
    res.status(201).json({ keyId:gateway.keyId, orderId:order.id, amount:order.amount, currency:order.currency, interval:data.interval });
  } catch (e) {
    res.status(502).json({ error: e instanceof Error ? "Could not create Razorpay order: " + e.message : "Could not create subscription payment." });
  }
}));

router.post("/workspace/subscription/verify", requireAuth, authenticated(async (req,res) => {
  const data = z.object({ razorpay_order_id:z.string().min(1).max(100), razorpay_payment_id:z.string().min(1).max(100), razorpay_signature:z.string().min(1).max(200) }).parse(req.body);
  const business = await prisma.business.findFirst({ where: { ownerUserId:req.userId }, select:{id:true} });
  if (!business) return res.status(409).json({error:"Business workspace not found."});
  const payment = await prisma.platformSubscriptionPayment.findUnique({ where:{razorpayOrderId:data.razorpay_order_id}, include:{subscription:true} });
  if (!payment || payment.subscription.businessId !== business.id) return res.status(404).json({error:"Subscription payment order not found."});
  if (payment.status === "PAID") return res.json({success:true});
  let gateway:{keyId:string;keySecret:string};
  try { gateway=platformRazorpayConfig(); } catch(e) { return res.status(503).json({error:e instanceof Error?e.message:"Platform payment configuration is unavailable."}); }
  const expected=crypto.createHmac("sha256",gateway.keySecret).update(data.razorpay_order_id+"|"+data.razorpay_payment_id).digest();
  const supplied=Buffer.from(data.razorpay_signature,"hex");
  if(expected.length!==supplied.length || !crypto.timingSafeEqual(expected,supplied)) return res.status(400).json({error:"Razorpay payment signature verification failed."});
  try {
    const razorpayPayment=await razorpayRequest<{id:string;order_id:string;amount:number;currency:string;status:string}>(gateway.keyId,gateway.keySecret,"/payments/"+encodeURIComponent(data.razorpay_payment_id));
    const expectedAmount=Number(payment.amount)*100;
    if(razorpayPayment.order_id!==payment.razorpayOrderId || razorpayPayment.amount!==expectedAmount || razorpayPayment.currency!==payment.currency) return res.status(400).json({error:"Payment amount or currency does not match this subscription."});
    if(razorpayPayment.status!=="captured") return res.status(202).json({success:false,paymentStatus:razorpayPayment.status,message:"Payment is not captured yet. Please wait for confirmation."});
    const paidAt=new Date();
    const periodEnd=subscriptionPeriod(payment.interval as "MONTHLY"|"YEARLY",paidAt);
    await prisma.$transaction([
      prisma.platformSubscriptionPayment.update({where:{id:payment.id},data:{razorpayPaymentId:razorpayPayment.id,status:"PAID",paidAt}}),
      prisma.subscription.update({where:{id:payment.subscriptionId},data:{status:"ACTIVE",interval:payment.interval,amount:payment.amount,currency:payment.currency,currentPeriodStart:paidAt,currentPeriodEnd:periodEnd,dueAt:periodEnd,lastPaidAt:paidAt}})
    ]);
    res.json({success:true,message:"Payment verified and subscription activated."});
  } catch(e) {
    res.status(502).json({error:e instanceof Error?"Could not verify payment: "+e.message:"Could not verify subscription payment."});
  }
}));

export default router;
