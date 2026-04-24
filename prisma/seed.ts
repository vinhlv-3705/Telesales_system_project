/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs") as typeof import("node:fs");
const path = require("node:path") as typeof import("node:path");
const { prisma } = require("../lib/prisma") as { prisma: typeof import("../lib/prisma").prisma };

type CreatedUser = { id: string; username: string };

type CsvCustomerRow = {
  customerCode: string;
  fullName: string;
  address: string;
  area: string;
  taxCode: string;
  groupCode: string;
  partner: string;
  phone: string;
};

const parseCsvLine = (line: string) => {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
};

const normalizePhone = (value: string) => value.replace(/\s+/g, "").trim();

async function main() {
  const csvPath = path.join(process.cwd(), "danh_sach_khach_hang_full.csv");
  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV file not found: ${csvPath}`);
  }

  const raw = fs.readFileSync(csvPath, "utf8");
  const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) {
    throw new Error("CSV file is empty or missing data rows.");
  }

  // Clear existing data (avoid duplicates)
  await prisma.$transaction([
    prisma.callLog.deleteMany({}),
    prisma.customer.deleteMany({}),
    prisma.user.deleteMany({}),
  ]);

  // Create users
  const admin = await prisma.user.create({
    data: {
      username: "admin",
      password: "admin123",
      role: "ADMIN",
    },
    select: { id: true, username: true },
  });

  const agentAccounts = ["user1", "user2", "user3", "user4"];
  const agents: CreatedUser[] = await Promise.all(
    agentAccounts.map((username) =>
      prisma.user.create({
        data: {
          username,
          password: "password123",
          role: "AGENT",
        },
        select: { id: true, username: true },
      })
    )
  );

  // Parse CSV
  const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
  const expectedCols = 8;
  if (header.length < expectedCols) {
    throw new Error(`CSV header invalid: expected >= ${expectedCols} columns, got ${header.length}`);
  }

  const rows: CsvCustomerRow[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cells = parseCsvLine(lines[i]);
    if (cells.length < expectedCols) continue;
    const [customerCode, fullName, address, area, taxCode, groupCode, partner, phone] = cells;
    if (!customerCode?.trim() || !fullName?.trim() || !phone?.trim()) continue;
    rows.push({
      customerCode: customerCode.trim(),
      fullName: fullName.trim(),
      address: address?.trim() ?? "",
      area: area?.trim() ?? "",
      taxCode: taxCode?.trim() ?? "",
      groupCode: groupCode?.trim() ?? "",
      partner: partner?.trim() ?? "",
      phone: normalizePhone(phone),
    });
  }

  // Split evenly across 4 agents
  const createdCounts = new Map<string, number>(agents.map((agent) => [agent.username, 0]));

  const createInputs = rows.map((row, index) => {
    const agent = agents[index % agents.length];
    createdCounts.set(agent.username, (createdCounts.get(agent.username) ?? 0) + 1);
    return {
      customerCode: row.customerCode,
      fullName: row.fullName,
      phone: row.phone,
      address: row.address || null,
      area: row.area || null,
      taxCode: row.taxCode || null,
      groupCode: row.groupCode || null,
      partner: row.partner || null,
      status: "Mới",
      assignedToId: agent.id,
      assignedTo: agent.username,
      medicalRep: admin.username,
    };
  });

  // Batch insert to avoid SQLite parameter limits
  const batchSize = 500;
  for (let i = 0; i < createInputs.length; i += batchSize) {
    const batch = createInputs.slice(i, i + batchSize);
    await prisma.customer.createMany({ data: batch });
  }

  const totalCustomers = await prisma.customer.count();

  console.log("Seed report:");
  console.log(`- Admin created: ${admin.username}`);
  console.log(`- Agents created: ${agents.map((agent) => agent.username).join(", ")}`);
  console.log(`- Customers ingested: ${totalCustomers}`);
  for (const agent of agents) {
    console.log(`- Assigned to ${agent.username}: ${createdCounts.get(agent.username) ?? 0}`);
  }
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
