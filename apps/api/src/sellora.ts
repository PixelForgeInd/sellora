import { Router, Request, Response, NextFunction } from "express";
import { PrismaClient, Prisma } from "@prisma/client";
import { z } from "zod";
import crypto from "node:crypto";
import { promisify } from "node:util";

const router = Router();
const prisma = new PrismaClient();
const scrypt = promisify(crypto.scrypt);
const secret = process.env.AUTH_SECRET || "sellora-development-secret-change-before-deployment";
const tokenLifetimeSeconds = 60 * 60 * 24 * 7;

type AuthedRequest = Request & { userId?: string };
function tokenFor(userId: string) {
  const payload = Buffer.from(JSON.stringify({ sub: userId, exp: Math.floor(Date.now() / 1000) + tokenLifetimeSeconds })).toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}
function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
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
router.post("/workspace/business", requireAuth, authenticated(async (req,res) => {
  const data = z.object({
    name:z.string().trim().min(2).max(120), industry:z.string().trim().min(2).max(100),
    productCategory:z.enum(["yarn-textiles","clothing","furniture","electronics","other"]),
    businessModel:z.enum(["B2B","B2C","B2B2C"]), phone:z.string().trim().max(30).optional(),
    website:z.union([z.string().trim().url().max(200),z.literal("")]).optional(),
    brandColor:z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#599c56")
  }).parse(req.body);
  const existing = await prisma.business.findFirst({where:{ownerUserId:req.userId}});
  if (existing) return res.status(409).json({error:"This account already has a business workspace."});
  const base = slugify(data.name);
  let slug = base, suffix = 2;
  while (await prisma.business.findUnique({where:{slug}})) slug = `${base}-${suffix++}`;
  const fields = templates[data.productCategory] || templates.other;
  const business = await prisma.business.create({data:{
    ownerUserId:req.userId!, name:data.name, slug, industry:data.industry, productCategory:data.productCategory,
    businessModel:data.businessModel, phone:data.phone || null, website:data.website || null, brandColor:data.brandColor,
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
router.post("/workspace/products", requireAuth, authenticated(async (req,res) => {
  const data = z.object({
    name:z.string().trim().min(2).max(160), sku:z.string().trim().max(64).optional(),
    description:z.string().trim().max(2000).optional(), price:z.number().positive().optional(),
    currency:z.string().length(3).default("INR"), unit:z.string().trim().min(1).max(20).default("piece"),
    imageUrl:z.union([z.string().url().max(500),z.literal("")]).optional(),
    fields:z.record(z.string(),z.union([z.string().max(500),z.number(),z.boolean()])).default({})
  }).parse(req.body);
  const business = await prisma.business.findFirst({where:{ownerUserId:req.userId},select:{id:true}});
  if (!business) return res.status(409).json({error:"Complete business setup first."});
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
    imageUrl:z.union([z.string().url().max(500),z.literal("")]).nullable().optional(),
    fields:z.record(z.string(),z.union([z.string().max(500),z.number(),z.boolean()])).optional()
  }).parse(req.body);
  const business = await prisma.business.findFirst({where:{ownerUserId:req.userId},select:{id:true}});
  if (!business) return res.status(404).json({error:"Business not found."});
  const owned = await prisma.selloraProduct.findFirst({where:{id:req.params.id,businessId:business.id}});
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
  const result=await prisma.selloraProduct.deleteMany({where:{id:req.params.id,businessId:business.id}});
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
  const existing=await prisma.selloraCatalogue.findFirst({where:{id:req.params.id,businessId:business.id}});
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
