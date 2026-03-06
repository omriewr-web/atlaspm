import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== Tenant Data Reset ===\n");

  const steps: { label: string; fn: () => Promise<{ count: number }> }[] = [
    { label: "ImportFeedback",    fn: () => prisma.importFeedback.deleteMany() },
    { label: "ImportProfile",     fn: () => prisma.importProfile.deleteMany() },
    { label: "ImportRun",         fn: () => prisma.importRun.deleteMany() },
    { label: "LegalImportQueue",  fn: () => prisma.legalImportQueue.deleteMany() },
    { label: "ImportRow",         fn: () => prisma.importRow.deleteMany() },
    { label: "ImportBatch",       fn: () => prisma.importBatch.deleteMany() },
    { label: "BalanceSnapshot",   fn: () => prisma.balanceSnapshot.deleteMany() },
    { label: "RecurringCharge",   fn: () => prisma.recurringCharge.deleteMany() },
    { label: "Lease",             fn: () => prisma.lease.deleteMany() },
    { label: "VacancyInfo",       fn: () => prisma.vacancyInfo.deleteMany() },
    { label: "Tenant",            fn: () => prisma.tenant.deleteMany() },
    { label: "Unit",              fn: () => prisma.unit.deleteMany() },
  ];

  for (const step of steps) {
    const result = await step.fn();
    console.log(`  ${step.label.padEnd(20)} ${result.count} deleted`);
  }

  console.log("\nDone.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
