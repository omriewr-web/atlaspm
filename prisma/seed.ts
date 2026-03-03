import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash("admin123", 12);

  await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      email: "admin@icer.com",
      name: "Administrator",
      username: "admin",
      passwordHash: hash,
      role: "ADMIN",
    },
  });

  console.log("Seed complete: admin/admin123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
