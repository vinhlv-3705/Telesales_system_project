import path from "path";
import dotenv from "dotenv";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const { prisma } = require("../lib/prisma") as { prisma: import("@prisma/client").PrismaClient };
const db = prisma as any;

async function main() {
  const users = await prisma.user.findMany({ select: { id: true, username: true } });
  const userById = new Set(users.map((u) => u.id));

  const customers = await prisma.customer.findMany({
    where: { assignedToId: { not: null } },
    select: { id: true, assignedToId: true },
  });

  const rows = customers
    .filter((c) => c.assignedToId && userById.has(c.assignedToId))
    .map((c) => ({
      customerId: c.id,
      userId: c.assignedToId as string,
      isPrimary: true,
    }));

  const result = await db.customerAssignment.createMany({
    data: rows,
    skipDuplicates: true,
  });

  console.log({
    customersWithAssignedToId: customers.length,
    rowsPrepared: rows.length,
    created: result.count,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
