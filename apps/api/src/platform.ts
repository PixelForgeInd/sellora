import { Router, Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import crypto from "node:crypto";
import { z } from "zod";
import { requireAuth } from "./sellora.js";

const router = Router();
const prisma = new PrismaClient();
type AuthRequest = Request & { userId: string };
const MONTHLY_PRICE = 249;
const YEARLY_PRICE = 2490;

const asyncRoute = (handler: (req: AuthRequest, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => handler(req as AuthRequest, res, next).catch(next);

function ownerEmailMatches(email: string) {
  const configured = process.env.PLATFORM_OWNER_EMAIL?.trim().toLowerCase();
  return Boolean(configured && email.toLowerCase() === configured);
}
async function requirePlatformOwner(req: AuthRequest, res: Response) {
  const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { id: true, email: true, role: true } });
  if (!user || user.role !== "PLATFORM_OWNER" || !ownerEmailMatches(user.email)) {
    res.status(403).json({ error: "Platform Owner access is required." });
    return null;
  }
  return user;
}
function priceFor(interval: "MONTHLY" | "YEARLY") {
  return interval === "YEARLY" ? YEARLY_PRICE : MONTHLY_PRICE;
}
function indiaEndOfDay(base: Date, monthsToAdd: number) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(base);
  const get = (type: string) => Number(parts.find(part => part.type === type)?.value);
  const year = get("year");
  const month = get("month");
  const day = get("day");
  const targetMonthIndex = month - 1 + monthsToAdd;
  const targetYear = year + Math.floor(targetMonthIndex / 12);
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const targetDay = Math.min(day, lastDay);
  // 18:29:59.999 UTC is 23:59:59.999 in Asia/Kolkata.
  return new Date(Date.UTC(targetYear, targetMonth, targetDay, 18, 29, 59, 999));
}
function platformCredentials() {
  const keyId = process.env.PLATFORM_RAZORPAY_KEY_ID || "";
  const keySecret = process.env.PLATFORM_RAZORPAY_KEY_SECRET || "";
  if (!keyId || !keySecret) throw new Error("Platform subscription checkout is not configured. Set PLATFORM_RAZORPAY_KEY_ID and PLATFORM_RAZORPAY_KEY_SECRET on the API server.");
  return { keyId, keySecret };
}
async function razorpay<T>(path: string, keyId: string, keySecret: string, body?: unknown): Promise<T> {
  const response = await fetch("https://api.razorpay.com/v1" + path, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: "Basic " + Buffer.from(keyId + ":" + keySecret).toString("base64"),
      "Content-Type": "application/json"
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  const result = await response.json().catch(() => ({})) as T & { error?: { description?: string } };
  if (!response.ok) throw new Error(result.error?.description || "Platform payment provider request failed.");
  return result;
}
async function ensureSubscription(businessId: string) {
  const existing = await prisma.subscription.findUnique({ where: { businessId } });
  if (existing) return existing;
  const now = new Date();
  return prisma.subscription.create({
    data: {
      businessId,
      status: "ACTIVE",
      interval: "MONTHLY",
      amount: MONTHLY_PRICE,
      currentPeriodStart: now,
      currentPeriodEnd: indiaEndOfDay(now, 1),
      dueAt: indiaEndOfDay(now, 1)
    }
  });
}
function subscriptionPayload(subscription: any) {
  return {
    id: subscription.id,
    status: subscription.status,
    interval: subscription.interval,
    amount: subscription.amount.toString(),
    currency: subscription.currency,
    currentPeriodStart: subscription.currentPeriodStart,
    currentPeriodEnd: subscription.currentPeriodEnd,
    dueAt: subscription.dueAt,
    lastPaidAt: subscription.lastPaidAt,
    isLocked: subscription.status !== "ACTIVE" || subscription.dueAt.getTime() < Date.now()
  };
}

// The owner is verified against both the database role and the configured owner email.
router.get("/platform/owner/businesses", requireAuth, asyncRoute(async (req, res) => {
  const owner = await requirePlatformOwner(req, res);
  if (!owner) return;
  const businesses = await prisma.business.findMany({
    include: {
      owner: { select: { id: true, email: true } },
      subscription: { include: { payments: { orderBy: { createdAt: "desc" }, take: 5 } } },
      _count: { select: { products: true, catalogues: true, orders: true } }
    },
    orderBy: { createdAt: "desc" },
    take: 500
  });
  res.json(businesses.map(business => ({
    id: business.id, name: business.name, slug: business.slug, email: business.email,
    phone: business.phone, createdAt: business.createdAt,
    owner: business.owner,
    counts: business._count,
    subscription: business.subscription ? subscriptionPayload(business.subscription) : null,
    recentPayments: (business.subscription?.payments || []).map(payment => ({
      id: payment.id, amount: payment.amount.toString(), interval: payment.interval,
      status: payment.status, paidAt: payment.paidAt, createdAt: payment.createdAt,
      razorpayPaymentId: payment.razorpayPaymentId
    }))
  })));
}));

router.get("/platform/owner/audit", requireAuth, asyncRoute(async (req, res) => {
  const owner = await requirePlatformOwner(req, res);
  if (!owner) return;
  const events = await prisma.platformAuditEvent.findMany({
    include: { subscription: { include: { business: { select: { id: true, name: true, slug: true } } } } },
    orderBy: { createdAt: "desc" },
    take: 200
  });
  res.json(events);
}));

router.patch("/platform/owner/businesses/:businessId/subscription", requireAuth, asyncRoute(async (req, res) => {
  const owner = await requirePlatformOwner(req, res);
  if (!owner) return;
  const input = z.object({
    status: z.enum(["ACTIVE", "LOCKED"]).optional(),
    interval: z.enum(["MONTHLY", "YEARLY"]).optional(),
    dueAt: z.string().datetime().optional(),
  }).strict().refine(value => Object.keys(value).length > 0, "Provide at least one subscription field.").parse(req.body);
  const business = await prisma.business.findUnique({ where: { id: req.params.businessId }, select: { id: true, name: true } });
  if (!business) return res.status(404).json({ error: "Business not found." });
  const subscription = await ensureSubscription(business.id);
  const nextInterval = input.interval || subscription.interval as "MONTHLY" | "YEARLY";
  const next = await prisma.$transaction(async tx => {
    const updated = await tx.subscription.update({
      where: { id: subscription.id },
      data: {
        ...(input.status ? { status: input.status } : {}),
        ...(input.interval ? { interval: input.interval, amount: priceFor(nextInterval) } : {}),
        ...(input.dueAt ? { dueAt: new Date(input.dueAt), currentPeriodEnd: new Date(input.dueAt) } : {}),
      }
    });
    await tx.platformAuditEvent.create({
      data: {
        subscriptionId: subscription.id,
        actorUserId: owner.id,
        action: "SUBSCRIPTION_MANUAL_UPDATE",
        details: { businessId: business.id, businessName: business.name, before: { status: subscription.status, interval: subscription.interval, dueAt: subscription.dueAt.toISOString() }, after: input }
      }
    });
    return updated;
  });
  res.json(subscriptionPayload(next));
}));

router.get("/workspace/subscription", requireAuth, asyncRoute(async (req, res) => {
  const business = await prisma.business.findFirst({ where: { ownerUserId: req.userId }, select: { id: true } });
  if (!business) return res.status(409).json({ error: "Complete business setup first." });
  const subscription = await ensureSubscription(business.id);
  const recentPayments = await prisma.platformSubscriptionPayment.findMany({
    where: { subscriptionId: subscription.id }, orderBy: { createdAt: "desc" }, take: 10
  });
  res.json({
    ...subscriptionPayload(subscription),
    prices: { MONTHLY: MONTHLY_PRICE, YEARLY: YEARLY_PRICE },
    recentPayments: recentPayments.map(payment => ({
      id: payment.id, interval: payment.interval, amount: payment.amount.toString(),
      status: payment.status, createdAt: payment.createdAt, paidAt: payment.paidAt
    }))
  });
}));

router.post("/workspace/subscription/order", requireAuth, asyncRoute(async (req, res) => {
  const input = z.object({ interval: z.enum(["MONTHLY", "YEARLY"]) }).parse(req.body);
  const business = await prisma.business.findFirst({ where: { ownerUserId: req.userId }, select: { id: true } });
  if (!business) return res.status(409).json({ error: "Complete business setup first." });
  const subscription = await ensureSubscription(business.id);
  let credentials: ReturnType<typeof platformCredentials>;
  try { credentials = platformCredentials(); }
  catch (error) { return res.status(503).json({ error: error instanceof Error ? error.message : "Subscription checkout is unavailable." }); }
  const amount = priceFor(input.interval);
  const receipt = "sellora_" + crypto.randomUUID().replace(/-/g, "").slice(0, 24);
  const order = await razorpay<{ id: string; amount: number; currency: string }>(
    "/orders", credentials.keyId, credentials.keySecret,
    { amount: amount * 100, currency: "INR", receipt, notes: { businessId: business.id, subscriptionId: subscription.id, interval: input.interval } }
  );
  await prisma.platformSubscriptionPayment.create({
    data: { subscriptionId: subscription.id, interval: input.interval, amount, currency: "INR", razorpayOrderId: order.id, status: "CREATED" }
  });
  res.status(201).json({ orderId: order.id, amount: order.amount, currency: order.currency, keyId: credentials.keyId, interval: input.interval });
}));

router.post("/workspace/subscription/verify", requireAuth, asyncRoute(async (req, res) => {
  const input = z.object({
    razorpay_order_id: z.string().min(1),
    razorpay_payment_id: z.string().min(1),
    razorpay_signature: z.string().min(1),
  }).parse(req.body);
  const business = await prisma.business.findFirst({ where: { ownerUserId: req.userId }, select: { id: true } });
  if (!business) return res.status(409).json({ error: "Complete business setup first." });
  const payment = await prisma.platformSubscriptionPayment.findUnique({
    where: { razorpayOrderId: input.razorpay_order_id },
    include: { subscription: true }
  });
  if (!payment || payment.subscription.businessId !== business.id) return res.status(404).json({ error: "Subscription payment not found." });
  if (payment.status === "PAID") return res.json({ success: true, subscription: subscriptionPayload(payment.subscription) });
  const credentials = platformCredentials();
  const expected = crypto.createHmac("sha256", credentials.keySecret)
    .update(input.razorpay_order_id + "|" + input.razorpay_payment_id).digest("hex");
  const supplied = Buffer.from(input.razorpay_signature, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  if (supplied.length !== expectedBuffer.length || !crypto.timingSafeEqual(supplied, expectedBuffer)) {
    return res.status(400).json({ error: "Payment signature verification failed." });
  }
  const providerPayment = await razorpay<{ id: string; order_id: string; status: string; amount: number; currency: string }>(
    "/payments/" + encodeURIComponent(input.razorpay_payment_id), credentials.keyId, credentials.keySecret
  );
  if (providerPayment.order_id !== payment.razorpayOrderId || providerPayment.status !== "captured" ||
      providerPayment.amount !== Number(payment.amount) * 100 || providerPayment.currency !== payment.currency) {
    return res.status(409).json({ error: "The provider has not confirmed a matching captured payment. If money was deducted, contact support before retrying." });
  }
  const now = new Date();
  const paid = await prisma.$transaction(async tx => {
    const latest = await tx.platformSubscriptionPayment.findUnique({ where: { id: payment.id }, include: { subscription: true } });
    if (!latest) throw new Error("Subscription payment record disappeared.");
    if (latest.status === "PAID") return latest.subscription;
    const currentEnd = latest.subscription.dueAt.getTime() > now.getTime() ? latest.subscription.dueAt : now;
    const periodEnd = indiaEndOfDay(currentEnd, latest.interval === "YEARLY" ? 12 : 1);
    await tx.platformSubscriptionPayment.update({
      where: { id: latest.id },
      data: { status: "PAID", razorpayPaymentId: input.razorpay_payment_id, paidAt: now }
    });
    const updatedSubscription = await tx.subscription.update({
      where: { id: latest.subscriptionId },
      data: {
        status: "ACTIVE", interval: latest.interval, amount: latest.amount,
        currentPeriodStart: currentEnd, currentPeriodEnd: periodEnd, dueAt: periodEnd, lastPaidAt: now
      }
    });
    await tx.platformAuditEvent.create({
      data: { subscriptionId: latest.subscriptionId, actorUserId: req.userId, action: "SUBSCRIPTION_PAYMENT_CONFIRMED", details: { paymentId: latest.id, razorpayPaymentId: input.razorpay_payment_id, amount: latest.amount.toString(), interval: latest.interval } }
    });
    return updatedSubscription;
  });
  res.json({ success: true, subscription: subscriptionPayload(paid) });
}));

// This gate runs after the billing routes above, so locked tenants can still pay and regain access.
// Requests continue into the main workspace router only when the tenant is entitled.
router.use("/workspace", requireAuth, asyncRoute(async (req, res, next) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { role: true, email: true } });
  if (user?.role === "PLATFORM_OWNER" && ownerEmailMatches(user.email)) return next();
  const business = await prisma.business.findFirst({ where: { ownerUserId: req.userId }, select: { id: true } });
  if (!business) return next();
  const subscription = await prisma.subscription.findUnique({ where: { businessId: business.id }, select: { status: true, dueAt: true } });
  // Legacy tenants without a subscription row get a short active grace period on first access.
  if (!subscription) return next();
  if (subscription.status !== "ACTIVE" || subscription.dueAt.getTime() < Date.now()) {
    return res.status(402).json({ error: "Your Sellora subscription has expired. Renew your plan to unlock your workspace and public catalogue.", code: "SUBSCRIPTION_REQUIRED" });
  }
  next();
}));

export default router;
