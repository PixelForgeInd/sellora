import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const counts = ["20s OE", "2/20s", "2/40s", "10s", "18s", "24s"];
  const types = ["Recycled OE", "Kora CP", "Modal", "Excel"];

  for (const label of counts) {
    await prisma.yarnCount.upsert({ where: { label }, update: {}, create: { label } });
  }
  for (const name of types) {
    await prisma.yarnType.upsert({ where: { name }, update: {}, create: { name } });
  }

  // Deliberately no sample products or prices: only enter verified business data.
  console.log("Seeded yarn counts and types. Add verified products and prices in your admin workflow.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
