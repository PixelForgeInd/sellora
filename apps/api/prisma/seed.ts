import { PrismaClient } from "@prisma/client";
import crypto from "node:crypto";
import { promisify } from "node:util";

const prisma = new PrismaClient();
const scrypt = promisify(crypto.scrypt);

async function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = await scrypt(password, salt, 64) as Buffer;
  return `${salt}:${hash.toString("hex")}`;
}

async function main() {
  const counts = ["20s OE", "2/20s", "2/40s", "10s", "18s", "24s"];
  const types = ["Recycled OE", "Kora CP", "Modal", "Excel"];
  for (const label of counts) await prisma.yarnCount.upsert({ where: { label }, update: {}, create: { label } });
  for (const name of types) await prisma.yarnType.upsert({ where: { name }, update: {}, create: { name } });

  // Platform-owner bootstrap is explicit and never uses a hard-coded email or password.
  const ownerEmail = process.env.PLATFORM_OWNER_EMAIL?.trim().toLowerCase();
  const ownerPassword = process.env.PLATFORM_OWNER_PASSWORD;
  if (!ownerEmail || !ownerPassword || ownerPassword.length < 12) {
    throw new Error("Set PLATFORM_OWNER_EMAIL and PLATFORM_OWNER_PASSWORD (minimum 12 characters) before running db:seed.");
  }

  const existingOwner = await prisma.user.findUnique({ where: { email: ownerEmail } });
  if (existingOwner && existingOwner.role !== "PLATFORM_OWNER") {
    throw new Error("The configured owner email already belongs to a non-owner account. Do not promote it automatically; use a verified owner account or update the role through a trusted database-admin procedure.");
  }
  const owner = existingOwner || await prisma.user.create({
    data: { email: ownerEmail, passwordHash: await hashPassword(ownerPassword), role: "PLATFORM_OWNER" },
  });

  await prisma.business.upsert({
    where: { slug: "pixelforge" },
    update: { name: "PixelForge", industry: "Software / SaaS", productCategory: "other", businessModel: "B2B", ownerUserId: owner.id },
    create: { name: "PixelForge", slug: "pixelforge", industry: "Software / SaaS", productCategory: "other", businessModel: "B2B", email: ownerEmail, ownerUserId: owner.id },
  });

  console.log("Seeded yarn reference data and PixelForge platform owner.");
  console.log("Existing owner password is preserved.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
}).finally(async () => prisma.$disconnect());
