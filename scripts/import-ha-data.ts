/* eslint-disable @typescript-eslint/no-require-imports */
const dotenv = require("dotenv") as typeof import("dotenv");
const fs = require("node:fs") as typeof import("node:fs");
const path = require("node:path") as typeof import("node:path");

dotenv.config({
  path: process.env.APP_ENV === "production" || process.env.NODE_ENV === "production" ? ".env.production" : ".env.local",
});

const { prisma } = require("../lib/prisma") as { prisma: typeof import("../lib/prisma").prisma };

type ParsedRow = {
  customerCode: string;
  fullName: string;
  address: string;
  district: string;
  area: string;
  partner: string;
  phoneRaw: string;
  bankAccount: string;
};

const stableHash = (input: string) => {
  // Simple deterministic hash (djb2) to build a stable synthetic customerCode.
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
};

const normalizeCell = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.toLowerCase() === "nan") return "";
  return trimmed;
};

const normalizePhone = (value: string) => {
  const raw = normalizeCell(value);
  if (!raw) return "";
  // keep digits only
  const digits = raw.replace(/\D+/g, "");
  return digits;
};

const splitMarkdownRow = (line: string) => {
  // Expect: | a | b | c |
  // Remove first/last pipe then split
  const trimmed = line.trim();
  const core = trimmed.replace(/^\|/, "").replace(/\|\s*$/, "");
  return core.split("|").map((c) => c.trim());
};

const isSeparatorRow = (line: string) => {
  const t = line.trim();
  if (!t.startsWith("|")) return false;
  // separator rows contain only pipes, colons, dashes and spaces
  return /^\|[\s:\-\|]+\|\s*$/.test(t);
};

const parseMarkdownTable = (markdown: string) => {
  const lines = markdown.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const tableLines = lines.filter((l) => l.trim().startsWith("|"));
  if (tableLines.length < 3) {
    throw new Error("Không tìm thấy markdown table hợp lệ (cần ít nhất header + separator + 1 row).");
  }

  const headerLine = tableLines[0];
  const headerCells = splitMarkdownRow(headerLine);
  const headerMap = new Map<string, number>();
  headerCells.forEach((cell, idx) => headerMap.set(cell, idx));

  const requiredColumns = ["Mã ĐT", "TÊN KHÁCH HÀNG", "Địa chỉ", "ĐỊA BÀN", "KHU VỰC", "Đối tác", "ĐT", "Tài khoản  ngân hàng"] as const;
  const missing = requiredColumns.filter((c) => !headerMap.has(c));
  if (missing.length > 0) {
    throw new Error(`Thiếu cột bắt buộc trong table: ${missing.join(", ")}`);
  }

  const idxCustomerCode = headerMap.get("Mã ĐT")!;
  const idxFullName = headerMap.get("TÊN KHÁCH HÀNG")!;
  const idxAddress = headerMap.get("Địa chỉ")!;
  const idxDistrict = headerMap.get("ĐỊA BÀN")!;
  const idxArea = headerMap.get("KHU VỰC")!;
  const idxPartner = headerMap.get("Đối tác")!;
  const idxPhone = headerMap.get("ĐT")!;
  const idxBank = headerMap.get("Tài khoản  ngân hàng")!;

  const rows: ParsedRow[] = [];

  for (let i = 1; i < tableLines.length; i += 1) {
    const line = tableLines[i];
    if (isSeparatorRow(line)) continue;

    const cells = splitMarkdownRow(line);
    const get = (idx: number) => (idx >= 0 && idx < cells.length ? cells[idx] : "");

    const customerCode = normalizeCell(get(idxCustomerCode));
    const fullName = normalizeCell(get(idxFullName));
    const address = normalizeCell(get(idxAddress));
    const district = normalizeCell(get(idxDistrict));
    const area = normalizeCell(get(idxArea));
    const partner = normalizeCell(get(idxPartner));
    const phoneRaw = normalizeCell(get(idxPhone));
    const bankAccount = normalizeCell(get(idxBank));

    if (!customerCode && !fullName && !phoneRaw) continue;

    rows.push({ customerCode, fullName, address, district, area, partner, phoneRaw, bankAccount });
  }

  return rows;
};

async function main() {
  const mdPath = path.join(process.cwd(), "Du_lieu_Ha_.md");
  if (!fs.existsSync(mdPath)) {
    throw new Error(`Không tìm thấy file: ${mdPath}`);
  }

  const raw = fs.readFileSync(mdPath, "utf8");
  const parsed = parseMarkdownTable(raw);

  const username = "ha";
  const user = await prisma.user.findUnique({ where: { username }, select: { id: true, username: true } });
  if (!user) {
    throw new Error(`Không tìm thấy user với username='${username}'.`);
  }

  let totalFound = parsed.length;
  let inserted = 0;
  let duplicates = 0;
  let updatedAssigned = 0;
  let skippedInvalid = 0;
  let missingPhone = 0;
  let missingCustomerCode = 0;

  // If file contains duplicate phone numbers, avoid double-processing
  const seenPhones = new Set<string>();
  const seenCodes = new Set<string>();

  for (const row of parsed) {
    const customerCodeRaw = row.customerCode;
    const fullName = row.fullName;
    const phone = normalizePhone(row.phoneRaw);

    if (!phone) missingPhone += 1;

    const syntheticKeySource = [fullName, row.address, row.district, row.area, row.partner, row.bankAccount]
      .map((v) => (v || "").trim())
      .join("|")
      .toLowerCase();

    const customerCode = customerCodeRaw
      ? customerCodeRaw
      : syntheticKeySource.trim()
        ? `HA_SYN_${stableHash(syntheticKeySource)}`
        : `HA_SYN_${Date.now()}_${Math.random().toString(16).slice(2)}`;

    if (!customerCodeRaw) missingCustomerCode += 1;

    if (phone && seenPhones.has(phone)) {
      duplicates += 1;
      continue;
    }
    if (customerCode && seenCodes.has(customerCode)) {
      duplicates += 1;
      continue;
    }

    if (phone) seenPhones.add(phone);
    if (customerCode) seenCodes.add(customerCode);

    // Prefer dedupe by phone when available, otherwise by customerCode
    const existing = await prisma.customer.findFirst({
      where: phone
        ? { phone }
        : customerCode
          ? { customerCode }
          : undefined,
      select: { id: true, assignedToId: true, assignedTo: true },
    });

    if (existing) {
      const alreadyAssigned = existing.assignedToId === user.id && (existing.assignedTo || "").trim().toLowerCase() === user.username.toLowerCase();
      if (!alreadyAssigned) {
        await prisma.customer.update({
          where: { id: existing.id },
          data: { assignedToId: user.id, assignedTo: user.username },
        });
        updatedAssigned += 1;
      } else {
        duplicates += 1;
      }
      continue;
    }

    try {
      await prisma.customer.create({
        data: {
          customerCode,
          fullName: fullName || "(Chưa có tên)",
          phone: phone || "",
          address: row.address || null,
          district: row.district || null,
          area: row.area || null,
          partner: row.partner || null,
          bankAccount: row.bankAccount || null,
          assignedTo: user.username,
          assignedToId: user.id,
          status: "Mới",
          medicalRep: "Admin",
        },
      });
      inserted += 1;
    } catch (err) {
      // Most likely unique constraint on customerCode; treat as duplicate
      duplicates += 1;
    }
  }

  console.log("\n[import-ha] Report");
  console.log("Total rows in file:", totalFound);
  console.log("Inserted:", inserted);
  console.log("Re-assigned to ha:", updatedAssigned);
  console.log("Duplicates:", duplicates);
  console.log("Skipped (invalid/no key):", skippedInvalid);
  console.log("Rows missing phone:", missingPhone);
  console.log("Rows missing customerCode:", missingCustomerCode);
}

main()
  .catch((err) => {
    console.error("\n[import-ha] FAILED:", err && (err as { message?: string }).message ? (err as { message?: string }).message : err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => undefined);
  });

export {};
