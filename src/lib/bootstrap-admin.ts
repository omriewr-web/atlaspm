import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export async function bootstrapAdmin() {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL;
  const username = process.env.BOOTSTRAP_ADMIN_USERNAME;
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;

  if (!email || !username || !password) {
    console.log("[bootstrap] Missing BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_USERNAME, or BOOTSTRAP_ADMIN_PASSWORD env vars. Skipping.");
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`[bootstrap] Admin user "${email}" already exists. Skipping.`);
    return;
  }

  const hash = await bcrypt.hash(password, 12);
  await prisma.user.create({
    data: {
      email,
      name: "Admin",
      username,
      passwordHash: hash,
      role: "ADMIN",
      active: true,
    },
  });
  console.log(`[bootstrap] Admin user "${username}" created successfully.`);
}

// Run as standalone script: npx tsx src/lib/bootstrap-admin.ts
if (require.main === module) {
  bootstrapAdmin()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("[bootstrap] Failed:", err);
      process.exit(1);
    });
}
