const { PrismaClient } = require("@prisma/client");
const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");

const dbUrl = process.env.DATABASE_URL || "file:./dev.db";
const adapter = new PrismaBetterSqlite3({ url: dbUrl });
const prisma = new PrismaClient({ adapter });

const shuffle = (items) => {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

async function main() {
  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: { role: "ADMIN" },
    create: { username: "admin", role: "ADMIN" },
  });

  const agentUsernames = ["Agent 1", "Agent 2", "Agent 3", "Agent 4"];
  const agents = await Promise.all(
    agentUsernames.map((username) =>
      prisma.user.upsert({
        where: { username },
        update: { role: "AGENT" },
        create: { username, role: "AGENT" },
      })
    )
  );

  const customers = await prisma.customer.findMany({ select: { id: true } });
  if (customers.length > 0) {
    const shuffled = shuffle(customers);
    const updates = shuffled.map((customer, index) => {
      const agent = agents[index % agents.length];
      return prisma.customer.update({
        where: { id: customer.id },
        data: {
          assignedToId: agent.id,
          assignedTo: agent.username,
        },
      });
    });

    await prisma.$transaction(updates);
  }

  for (const agent of agents) {
    await prisma.callLog.updateMany({
      where: { agentId: null, agentName: agent.username },
      data: { agentId: agent.id },
    });
  }

  await prisma.callLog.updateMany({
    where: { agentId: null },
    data: { agentId: admin.id },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
