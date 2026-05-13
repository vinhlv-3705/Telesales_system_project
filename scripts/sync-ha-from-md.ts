import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
let prisma: import("@prisma/client").PrismaClient;
let db: any;

type MdCustomer = {
  customerCode: string;
  fullName: string;
  address: string;
  district: string;
  area: string;
  partner: string;
  phoneRaw: string;
  phone: string;
  bankAccount: string;
};

const normalizeCell = (v: string) => (v || "").replace(/\s+/g, " ").trim();
const normalizePhone = (v: string) => (v || "").replace(/\D+/g, "").trim();

const parseMarkdownTable = (md: string) => {
  const lines = md.split(/\r?\n/);

  const headerIdx = lines.findIndex((l) => l.trim().startsWith("|") && l.includes("Mã") && l.includes("ĐT"));
  if (headerIdx < 0) {
    return { header: [] as string[], rows: [] as string[][] };
  }

  const headerLine = lines[headerIdx];
  const header = headerLine
    .split("|")
    .slice(1, -1)
    .map((c) => c.trim());

  const expectedPipes = headerLine.split("|").length;

  const rawRows: string[] = [];
  let current = "";
  for (let i = headerIdx + 1; i < lines.length; i += 1) {
    const raw = lines[i];
    const trimmed = raw.trim();
    if (!trimmed) continue;

    const startsRow = trimmed.startsWith("|");

    const isSeparatorLine = (() => {
      if (!startsRow) return false;
      const cells = trimmed
        .split("|")
        .slice(1, -1)
        .map((c) => c.trim());
      return cells.length > 0 && cells.every((c) => /^:?-{2,}:?$/.test(c) || c === "");
    })();

    if (isSeparatorLine) continue;

    if (startsRow) {
      if (!current) {
        current = raw;
        continue;
      }

      const currentPipes = current.split("|").length;
      if (currentPipes >= expectedPipes) {
        rawRows.push(current);
        current = raw;
        continue;
      }

      current = `${current} ${trimmed}`;
      continue;
    }

    if (current) current = `${current} ${trimmed}`;
  }
  if (current) rawRows.push(current);

  const rows: string[][] = [];
  for (const line of rawRows) {
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim());

    const isEmptyRow = cells.every((c) => !c);
    if (isEmptyRow) continue;

    rows.push(cells);
  }

  return { header, rows };
};

const buildCustomersFromMd = (header: string[], rows: string[][]) => {
  const findIndex = (predicate: (h: string) => boolean) => header.findIndex((h) => predicate(h.toLowerCase()));

  const idxCustomerCode = findIndex((h) => h.includes("mã") && h.includes("đt"));
  const idxFullName = findIndex((h) => h.includes("tên") && h.includes("khách"));
  const idxAddress = findIndex((h) => h.includes("địa chỉ"));
  const idxDistrict = findIndex((h) => h.includes("địa bàn"));
  const idxArea = findIndex((h) => h.includes("khu vực"));
  const idxPartner = findIndex((h) => h.includes("đối tác"));
  const idxPhone = findIndex((h) => h === "đt" || h.includes("đt"));
  const idxBank = findIndex((h) => h.includes("tài khoản"));

  if (idxCustomerCode < 0 || idxFullName < 0) {
    throw new Error(`Không detect được cột bắt buộc. header=[${header.join(", ")}]`);
  }

  const coerceCell = (cells: string[], idx: number) => (idx >= 0 && idx < cells.length ? normalizeCell(cells[idx]) : "");

  const customers: MdCustomer[] = [];
  for (const cells of rows) {
    const customerCode = coerceCell(cells, idxCustomerCode);
    if (!customerCode || customerCode.toLowerCase() === "nan") continue;

    const phoneRaw = coerceCell(cells, idxPhone);
    const phone = normalizePhone(phoneRaw);

    customers.push({
      customerCode,
      fullName: coerceCell(cells, idxFullName),
      address: coerceCell(cells, idxAddress),
      district: coerceCell(cells, idxDistrict),
      area: coerceCell(cells, idxArea),
      partner: coerceCell(cells, idxPartner),
      phoneRaw,
      phone,
      bankAccount: coerceCell(cells, idxBank),
    });
  }

  return customers;
};

const isMeaningful = (v: string) => {
  const x = normalizeCell(v);
  if (!x) return false;
  if (x.toLowerCase() === "nan") return false;
  return true;
};

async function main() {
  const args = process.argv.slice(2);
  const userArg = args.find((a) => a.startsWith("--user="));
  const username = userArg ? userArg.replace("--user=", "").trim() : "ha";
  const fileArg = args.find((a) => a.startsWith("--file="));
  const filePath = fileArg ? fileArg.replace("--file=", "").trim() : path.resolve(process.cwd(), "Du_lieu_Ha_.md");

  dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
  dotenv.config({ path: path.resolve(process.cwd(), ".env") });

  prisma = (require("../lib/prisma") as { prisma: import("@prisma/client").PrismaClient }).prisma;
  db = prisma as any;

  if (!fs.existsSync(filePath)) {
    throw new Error(`Không tìm thấy file: ${filePath}`);
  }

  const user = await prisma.user.findUnique({ where: { username }, select: { id: true, username: true } });
  if (!user) throw new Error(`Không tìm thấy user '${username}' trong DB.`);

  const md = fs.readFileSync(filePath, "utf8");
  const { header, rows } = parseMarkdownTable(md);
  const fileCustomers = buildCustomersFromMd(header, rows);

  const byCode = new Map<string, MdCustomer>();
  for (const c of fileCustomers) byCode.set(c.customerCode, c);

  const codes = Array.from(byCode.keys());
  const existing = await prisma.customer.findMany({
    where: { customerCode: { in: codes } },
    select: { id: true, customerCode: true, phone: true },
  });
  const existingByCode = new Map(existing.map((c) => [c.customerCode, c]));

  let created = 0;
  let updated = 0;

  for (const code of codes) {
    const row = byCode.get(code);
    if (!row) continue;

    const existingRow = existingByCode.get(code);
    const phoneFromFile = row.phone;
    const placeholderPhone = `NO_PHONE_${row.customerCode}`;

    const phoneToWrite = (() => {
      if (phoneFromFile) return phoneFromFile;
      if (existingRow?.phone && !existingRow.phone.startsWith("NO_PHONE_")) return existingRow.phone;
      return existingRow?.phone ?? placeholderPhone;
    })();

    const data: Record<string, unknown> = {
      assignedToId: user.id,
      assignedTo: user.username,
    };

    if (isMeaningful(row.fullName)) data.fullName = row.fullName;
    if (isMeaningful(row.address)) data.address = row.address;
    if (isMeaningful(row.district)) data.district = row.district;
    if (isMeaningful(row.area)) data.area = row.area;
    if (isMeaningful(row.partner)) data.partner = row.partner;
    if (isMeaningful(row.bankAccount)) data.bankAccount = row.bankAccount;

    data.phone = phoneToWrite;

    if (existingRow) {
      await prisma.customer.update({ where: { id: existingRow.id }, data });
      updated += 1;
    } else {
      await prisma.customer.create({
        data: {
          customerCode: row.customerCode,
          fullName: isMeaningful(row.fullName) ? row.fullName : row.customerCode,
          phone: phoneToWrite,
          address: isMeaningful(row.address) ? row.address : null,
          district: isMeaningful(row.district) ? row.district : null,
          area: isMeaningful(row.area) ? row.area : null,
          partner: isMeaningful(row.partner) ? row.partner : null,
          bankAccount: isMeaningful(row.bankAccount) ? row.bankAccount : null,
          status: "Mới",
          assignedToId: user.id,
          assignedTo: user.username,
        },
        select: { id: true },
      });
      created += 1;
    }
  }

  const affected = await prisma.customer.findMany({
    where: { customerCode: { in: codes }, assignedToId: user.id },
    select: { id: true },
  });

  const assignRows = affected.map((c) => ({ customerId: c.id, userId: user.id, isPrimary: true }));
  await db.customerAssignment.createMany({ data: assignRows, skipDuplicates: true });
  await db.customerAssignment.updateMany({
    where: { userId: user.id, customerId: { in: affected.map((c: any) => c.id) } },
    data: { isPrimary: true },
  });

  console.log({
    fileRowsTotal: rows.length,
    fileUniqueCodes: codes.length,
    created,
    updated,
    ensuredAssignments: assignRows.length,
    username: user.username,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma?.$disconnect();
  });
