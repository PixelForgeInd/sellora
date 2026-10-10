import { Router, Request, Response, NextFunction } from "express";
import { PrismaClient, Prisma } from "@prisma/client";
import { z } from "zod";
import crypto from "node:crypto";
import { promisify } from "node:util";

const router = Router();
const prisma = new PrismaClient();
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
router.get("/auth/me", authenticated(async (req,res) => {
  const user = await prisma.user.findUnique({where:{id:req.userId},select:{id:true,email:true,createdAt:true}});
  if (!user) return res.status(401).json({error:"Account not found."});
  res.json(user);
}));

router.get("/workspace/business", requireAuth, authenticated(async (req,res) => {
  const business = await prisma.business.findFirst({
    where:{ownerUserId:req.userId},
    include:{catalogueFields:{orderBy:{sortOrder:"asc"}},_count:{select:{products:true,catalogues:true}}}
  });
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

router.patch("/workspace/business/settings", requireAuth, authenticated(async (req,res) => {
  const data = z.object({
    sellingMode: z.enum(["CATALOG_ONLY", "ONLINE_PAYMENTS"]).optional(),
    name: z.string().trim().min(2).max(120).optional(),
    industry: z.string().trim().min(2).max(100).optional(),
    productCategory: z.enum(["yarn-textiles","clothing","furniture","electronics","other"]).optional(),
    businessModel: z.enum(["B2B","B2C","B2B2C"]).optional(),
    phone: z.string().trim().max(30).nullable().optional(),
    website: z.union([z.string().trim().url().max(200),z.literal("")]).nullable().optional(),
    brandColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional()
  }).refine((value) => Object.values(value).some((item) => item !== undefined), { message: "Provide at least one setting to update." }).parse(req.body);
  const business = await prisma.business.findFirst({where:{ownerUserId:req.userId},select:{id:true}});
  if (!business) return res.status(404).json({error:"Business not found."});
  const updated = await prisma.business.update({
    where:{id:business.id},
    data:{...data,website:data.website === "" ? null : data.website},
    select:{
      id:true,name:true,slug:true,industry:true,productCategory:true,businessModel:true,phone:true,website:true,brandColor:true,sellingMode:true,paymentGatewayProvider:true,paymentGatewayStatus:true,updatedAt:true
    }
  });
  res.json({
    ...updated,
    checkoutReady: updated.sellingMode === "ONLINE_PAYMENTS" && updated.paymentGatewayStatus === "ACTIVE"
  });
}));

router.post("/workspace/business", requireAuth, authenticated(async (req,res) => {
  const data = z.object({
    name:z.string().trim().min(2).max(120), industry:z.string().trim().min(2).max(100),
    productCategory:z.enum(["yarn-textiles","clothing","furniture","electronics","other"]),
    businessModel:z.enum(["B2B","B2C","B2B2C"]), phone:z.string().trim().max(30).optional(),
    website:z.union([z.string().trim().url().max(200),z.literal("")]).optional(),
    brandColor:z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#599c56"),
    sellingMode:z.enum(["CATALOG_ONLY","ONLINE_PAYMENTS"]).default("ONLINE_PAYMENTS")
  }).parse(req.body);
  const existing = await prisma.business.findFirst({where:{ownerUserId:req.userId}});
  if (existing) return res.status(409).json({error:"This account already has a business workspace."});
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
function validateProductFields(fields: Record<string, string | number | boolean>, definitions: Array<{key:string;label:string;type:string;required:boolean;options:unknown}>) {
  for (const field of definitions) {
    const value = fields[field.key];
    const empty = value === undefined || value === null || value === "";
    if (field.required && empty) return `${field.label} is required.`;
    if (empty) continue;
    if (field.type === "number" && (typeof value !== "number" || !Number.isFinite(value) || value < 0)) return `${field.label} must be a valid non-negative number.`;
    if (["text", "textarea", "select"].includes(field.type) && typeof value !== "string") return `${field.label} must be text.`;
    if (field.type === "boolean" && typeof value !== "boolean") return `${field.label} must be true or false.`;
    if (field.type === "select" && Array.isArray(field.options) && !field.options.includes(value)) return `Choose a valid option for ${field.label}.`;
    if (field.type === "multiselect") {
      if (!Array.isArray(value) || value.some(v => typeof v !== "string")) return `${field.label} must contain a list of options.`;
      if (Array.isArray(field.options) && value.some(v => !field.options.includes(v))) return `Choose valid options for ${field.label}.`;
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
    fields:z.record(z.string(),z.union([z.string().max(500),z.number(),z.boolean()])).default({})
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
    fields:z.record(z.string(),z.union([z.string().max(500),z.number(),z.boolean()])).optional()
  }).parse(req.body);
  const business = await prisma.business.findFirst({where:{ownerUserId:req.userId},select:{id:true}});
  if (!business) return res.status(404).json({error:"Business not found."});
  if (data.fields) {
    const definitions = await prisma.catalogueField.findMany({where:{businessId:business.id},select:{key:true,label:true,type:true,required:true,options:true}});
    const currentFields = (await prisma.selloraProduct.findFirst({where:{id:String(req.params.id),businessId:business.id},select:{fields:true}}))?.fields;
    const mergedFields = {...(currentFields && typeof currentFields === "object" && !Array.isArray(currentFields) ? currentFields as Record<string,string|number|boolean> : {}), ...data.fields};
    const fieldError = validateProductFields(mergedFields, definitions);
    if (fieldError) return res.status(400).json({error:fieldError});
  }
  const owned = await prisma.selloraProduct.findFirst({where:{id:String(req.params.id),businessId:business.id}});
  if (!owned) return res.status(404).json({error:"Product not found."});
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
router.get("/public/catalogues/:slug", async (req,res) => {
  const catalogue=await prisma.selloraCatalogue.findFirst({
    where:{slug:req.params.slug,isPublished:true},
    include:{business:true,items:{where:{product:{isActive:true}},include:{product:true},orderBy:{sortOrder:"asc"}}}
  });
  if(!catalogue) return res.status(404).json({error:"This catalogue is not published or no longer available."});
  res.json({
    title:catalogue.title,description:catalogue.description,slug:catalogue.slug,
    business:{name:catalogue.business.name,industry:catalogue.business.industry,phone:catalogue.business.phone,website:catalogue.business.website,brandColor:catalogue.business.brandColor},
    products:catalogue.items.map(({product})=>({...product,price:product.price?.toString() ?? null}))
  });
});

export default router;
