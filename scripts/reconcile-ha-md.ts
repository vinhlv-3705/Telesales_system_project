import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { createRequire } from "module";

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
  key: string;
};

const require = createRequire(import.meta.url);
let prisma: import("@prisma/client").PrismaClient;

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
    const pipeCount = raw.split("|").length;

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

      // Still completing the previous row; treat this as a hard-wrapped continuation.
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

    const isSeparator = cells.every((c) => /^:?-{2,}:?$/.test(c) || c === "");
    if (isSeparator) continue;

    const isEmptyRow = cells.every((c) => !c);
    if (isEmptyRow) continue;

    rows.push(cells);
  }

  return { header, rows };
};

const pickIndex = (header: string[], candidates: string[]) => {
  const normalized = header.map((h) => h.toLowerCase());
  for (const c of candidates) {
    const idx = normalized.indexOf(c.toLowerCase());
    if (idx >= 0) return idx;
  }
  return -1;
};

const coerceCell = (cells: string[], idx: number) => {
  if (idx < 0) return "";
  return (cells[idx] || "").trim();
};

const buildCustomersFromMd = (header: string[], rows: string[][]) => {
  const idxCustomerCode = pickIndex(header, ["Mã ĐT", "Mã", "Mã KH", "customerCode"]);
  const idxFullName = pickIndex(header, ["TÊN KHÁCH HÀNG", "Tên khách hàng", "Tên KH", "fullName"]);
  const idxAddress = pickIndex(header, ["Địa chỉ", "ĐỊA CHỈ", "address"]);
  const idxDistrict = pickIndex(header, ["ĐỊA BÀN", "Địa bàn", "district"]);
  const idxArea = pickIndex(header, ["KHU VỰC", "Khu vực", "area"]);
  const idxPartner = pickIndex(header, ["Đối tác", "ĐỐI TÁC", "partner"]);
  const idxPhone = pickIndex(header, ["ĐT", "SĐT", "Điện thoại", "phone"]);
  const idxBank = pickIndex(header, ["Tài khoản  ngân hàng", "Tài khoản ngân hàng", "bankAccount"]);

  if (idxCustomerCode < 0 || idxFullName < 0 || idxPhone < 0) {
    throw new Error(
      `Không detect được cột bắt buộc. header=[${header.join(", ")}], idxCustomerCode=${idxCustomerCode}, idxFullName=${idxFullName}, idxPhone=${idxPhone}`
    );
  }

  const customers: MdCustomer[] = [];
  for (const cells of rows) {
    const phoneRaw = coerceCell(cells, idxPhone);
    const phone = normalizePhone(phoneRaw);

    const customerCode = coerceCell(cells, idxCustomerCode);
    if (!customerCode || customerCode.toLowerCase() === "nan") continue;
    const key = `CODE:${customerCode}`;

    customers.push({
      customerCode: coerceCell(cells, idxCustomerCode),
      fullName: coerceCell(cells, idxFullName),
      address: coerceCell(cells, idxAddress),
      district: coerceCell(cells, idxDistrict),
      area: coerceCell(cells, idxArea),
      partner: coerceCell(cells, idxPartner),
      phoneRaw,
      phone,
      bankAccount: coerceCell(cells, idxBank),
      key,
    });
  }

  return customers;
};

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const fileArg = args.find((a) => a.startsWith("--file="));
  const filePath = fileArg ? fileArg.replace("--file=", "").trim() : path.resolve(process.cwd(), "Du_lieu_Ha_.md");

  dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
  dotenv.config({ path: path.resolve(process.cwd(), ".env") });

  prisma = (require("../lib/prisma") as { prisma: import("@prisma/client").PrismaClient }).prisma;

  if (!fs.existsSync(filePath)) {
    throw new Error(`Không tìm thấy file: ${filePath}`);
  }

  const md = fs.readFileSync(filePath, "utf8");
  const { header, rows } = parseMarkdownTable(md);
  const fileCustomers = buildCustomersFromMd(header, rows);

  const fileRowsTotal = rows.length;
  const fileRowsWithPhone = fileCustomers.filter((c) => c.phone).length;
  const fileRowsWithoutPhone = fileCustomers.filter((c) => !c.phone).length;

  const fileCodeSet = new Set(fileCustomers.map((c) => c.customerCode));
  const filePhoneSet = new Set(fileCustomers.filter((c) => c.phone).map((c) => c.phone));

  const ha = await prisma.user.findUnique({ where: { username: "ha" }, select: { id: true, username: true } });
  if (!ha) throw new Error("Không tìm thấy user 'ha' trong DB.");

  const assigned = await prisma.customer.findMany({
    where: { assignedToId: ha.id },
    select: { id: true, phone: true, customerCode: true },
  });

  const assignedCodeSet = new Set(assigned.map((c) => c.customerCode).filter(Boolean));

  const missingCodes: string[] = [];
  for (const code of fileCodeSet) {
    if (!assignedCodeSet.has(code)) missingCodes.push(code);
  }

  const missingPhones: string[] = [];
  // Only used for printing; reconciliation is by customerCode.
  for (const code of missingCodes) {
    const row = fileCustomers.find((c) => c.customerCode === code);
    if (row?.phone) missingPhones.push(row.phone);
  }

  const candidates = await prisma.customer.findMany({
    where: {
      OR: [
        ...(missingCodes.length ? [{ customerCode: { in: missingCodes } }] : []),
      ],
    },
    select: { id: true, phone: true, customerCode: true, assignedToId: true },
  });

  const candidateByCode = new Map(candidates.map((c) => [c.customerCode, c]));

  let willCreate = 0;
  let willReassign = 0;
  const plan: Array<{ action: "create" | "reassign"; customerCode: string }> = [];

  for (const mdRow of fileCustomers) {
    if (!missingCodes.includes(mdRow.customerCode)) continue;

    const existing = candidateByCode.get(mdRow.customerCode);
    if (existing) {
      willReassign += 1;
      plan.push({ action: "reassign", customerCode: mdRow.customerCode });
    } else {
      willCreate += 1;
      plan.push({ action: "create", customerCode: mdRow.customerCode });
    }
  }

  console.log("\n== RECONCILIATION REPORT (DRY RUN) ==");
  console.log({
    fileRowsTotal,
    fileRowsKept: fileCustomers.length,
    fileRowsWithPhone,
    fileRowsWithoutPhone,
    fileUniquePhones: filePhoneSet.size,
    fileUniqueCodes: fileCodeSet.size,
    dbAssignedToHa: assigned.length,
    missingUniquePhones: new Set(missingPhones).size,
    missingUniqueCodes: missingCodes.length,
    willCreate,
    willReassign,
    apply,
    haId: ha.id,
  });

  if (missingPhones.length) {
    console.log("\n-- Missing phones (first 50) --");
    console.log(missingPhones.slice(0, 50));
  }

  if (!apply) {
    console.log("\nChưa ghi DB. Nếu muốn apply, chạy lại với: --apply");
    return;
  }

  const fileByCode = new Map(fileCustomers.map((c) => [c.customerCode, c]));

  const plannedCodes = Array.from(new Set(plan.map((p) => p.customerCode)));

  const existing = await prisma.customer.findMany({
    where: { customerCode: { in: plannedCodes } },
    select: { customerCode: true },
  });

  const existingSet = new Set(existing.map((c) => c.customerCode));
  const toReassign = plannedCodes.filter((c) => existingSet.has(c));
  const toCreate = plannedCodes.filter((c) => !existingSet.has(c));

  const createData = toCreate
    .map((code) => {
      const mdRow = fileByCode.get(code);
      if (!mdRow) return null;
      const placeholderPhone = mdRow.phone ? mdRow.phone : `NO_PHONE_${mdRow.customerCode}`;
      return {
        customerCode: mdRow.customerCode,
        fullName: mdRow.fullName || mdRow.customerCode,
        phone: placeholderPhone,
        address: mdRow.address || null,
        district: mdRow.district || null,
        area: mdRow.area || null,
        partner: mdRow.partner || null,
        bankAccount: mdRow.bankAccount || null,
        status: "Mới",
        assignedToId: ha.id,
        assignedTo: ha.username,
      };
    })
    .filter(Boolean) as Array<{
    customerCode: string;
    fullName: string;
    phone: string;
    address: string | null;
    district: string | null;
    area: string | null;
    partner: string | null;
    bankAccount: string | null;
    status: string;
    assignedToId: string;
    assignedTo: string;
  }>;

  const [reassignRes, createRes] = await prisma.$transaction([
    toReassign.length
      ? prisma.customer.updateMany({
          where: { customerCode: { in: toReassign } },
          data: { assignedToId: ha.id, assignedTo: ha.username },
        })
      : prisma.customer.updateMany({ where: { id: "__noop__" }, data: { assignedTo: ha.username } }),
    createData.length
      ? prisma.customer.createMany({ data: createData, skipDuplicates: true })
      : prisma.customer.createMany({ data: [], skipDuplicates: true }),
  ]);

  const result = {
    reassigned: reassignRes.count,
    created: createRes.count,
  };

  const after = await prisma.customer.count({ where: { assignedToId: ha.id } });

  console.log("\n== APPLY RESULT ==");
  console.log({
    importedCreated: result.created,
    importedReassigned: result.reassigned,
    dbAssignedToHaAfter: after,
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
