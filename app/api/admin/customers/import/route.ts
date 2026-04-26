import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

type ImportResult = {
  created: number;
  updated: number;
  skipped: number;
  invalid: number;
  errors: Array<{ row: number; message: string; customerCode?: string }>;
};

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_SHEETS = 3;
const MAX_ROWS = 10_000;
const MAX_COLS = 40;
const MAX_TOTAL_CELLS = MAX_ROWS * MAX_COLS;
const MAX_PROCESSING_MS = 12_000;

const cleanString = (value: unknown) => {
  if (value == null) return "";
  return String(value).trim();
};

const pickNonEmpty = <T extends Record<string, unknown>>(input: T, allowedKeys: Array<keyof T>) => {
  const out: Record<string, unknown> = {};
  for (const key of allowedKeys) {
    const raw = input[key];
    if (raw == null) continue;
    if (typeof raw === "string") {
      const v = raw.trim();
      if (!v) continue;
      out[String(key)] = v;
      continue;
    }
    out[String(key)] = raw;
  }
  return out;
};

const parseBirthday = (value: unknown) => {
  const raw = cleanString(value);
  if (!raw) return undefined;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return undefined;
  return d;
};

export async function POST(request: Request) {
  try {
    const startTime = Date.now();
    const cookieStore = await cookies();
    const session = cookieStore.get("telesales_session")?.value;
    const role = cookieStore.get("telesales_role")?.value;

    if (!session) {
      return NextResponse.json({ message: "Chưa đăng nhập." }, { status: 401 });
    }
    if (role !== "admin" && role !== "ADMIN") {
      return NextResponse.json({ message: "Không có quyền." }, { status: 403 });
    }

    const form = await request.formData().catch(() => null);
    if (!form) {
      return NextResponse.json({ message: "Thiếu form data." }, { status: 400 });
    }

    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ message: "Thiếu file .xlsx." }, { status: 400 });
    }

    const fileName = (file.name || "").toLowerCase();
    if (!fileName.endsWith(".xlsx")) {
      return NextResponse.json({ message: "Chỉ hỗ trợ file Excel .xlsx." }, { status: 400 });
    }
    if (typeof file.size === "number" && file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ message: `File quá lớn. Giới hạn ${Math.round(MAX_FILE_BYTES / 1024 / 1024)}MB.` }, { status: 413 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buf, {
      type: "buffer",
      dense: true,
      cellFormula: false,
      cellHTML: false,
      cellNF: false,
      cellStyles: false,
    });
    if (wb.SheetNames.length === 0) {
      return NextResponse.json({ message: "File không có sheet." }, { status: 400 });
    }
    if (wb.SheetNames.length > MAX_SHEETS) {
      return NextResponse.json({ message: `File có quá nhiều sheet. Tối đa ${MAX_SHEETS} sheet.` }, { status: 400 });
    }
    const sheetName = wb.SheetNames[0];
    if (!sheetName) return NextResponse.json({ message: "File không có sheet." }, { status: 400 });

    const sheet = wb.Sheets[sheetName];
    const ref = typeof sheet?.["!ref"] === "string" ? sheet["!ref"] : "";
    if (!ref) {
      return NextResponse.json({ message: "Sheet rỗng." }, { status: 400 });
    }
    const range = XLSX.utils.decode_range(ref);
    const rowCount = range.e.r - range.s.r + 1;
    const colCount = range.e.c - range.s.c + 1;
    if (rowCount > MAX_ROWS + 1) {
      return NextResponse.json({ message: `File quá nhiều dòng. Tối đa ${MAX_ROWS} dòng dữ liệu.` }, { status: 400 });
    }
    if (colCount > MAX_COLS) {
      return NextResponse.json({ message: `File quá nhiều cột. Tối đa ${MAX_COLS} cột.` }, { status: 400 });
    }
    if (rowCount * colCount > MAX_TOTAL_CELLS) {
      return NextResponse.json({ message: "File quá lớn (quá nhiều cell)." }, { status: 400 });
    }

    const boundedRange = {
      s: { r: range.s.r, c: range.s.c },
      e: { r: Math.min(range.e.r, range.s.r + MAX_ROWS), c: Math.min(range.e.c, range.s.c + MAX_COLS - 1) },
    };

    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: "",
      raw: false,
      range: boundedRange,
    });

    const result: ImportResult = { created: 0, updated: 0, skipped: 0, invalid: 0, errors: [] };

    const allowedUpdateKeys = [
      "customerName",
      "phoneNumber",
      "birthday",
      "address",
      "area",
      "groupCode",
      "partner",
    ] as const;

    for (let i = 0; i < rows.length; i += 1) {
      if (Date.now() - startTime > MAX_PROCESSING_MS) {
        return NextResponse.json({ message: "Import mất quá nhiều thời gian. Vui lòng chia nhỏ file." }, { status: 408 });
      }
      const rowIndex = i + 2; // header is row 1
      const r = rows[i] ?? {};

      const customerCode = cleanString((r as Record<string, unknown>)["customerCode"] ?? (r as Record<string, unknown>)["Mã KH"]);
      if (!customerCode) {
        result.invalid += 1;
        result.errors.push({ row: rowIndex, message: "Thiếu mã khách hàng (customerCode / Mã KH)." });
        continue;
      }

      const customerName = cleanString((r as Record<string, unknown>)["customerName"] ?? (r as Record<string, unknown>)["Tên KH"]);
      const phoneNumber = cleanString((r as Record<string, unknown>)["phoneNumber"] ?? (r as Record<string, unknown>)["SĐT"]);

      const mapped = {
        customerName,
        phoneNumber,
        birthday: cleanString((r as Record<string, unknown>)["birthday"] ?? (r as Record<string, unknown>)["Sinh nhật"]),
        address: cleanString((r as Record<string, unknown>)["address"] ?? (r as Record<string, unknown>)["Địa chỉ"]),
        area: cleanString((r as Record<string, unknown>)["area"] ?? (r as Record<string, unknown>)["Địa bàn"]),
        groupCode: cleanString((r as Record<string, unknown>)["groupCode"] ?? (r as Record<string, unknown>)["Nhóm"]),
        partner: cleanString((r as Record<string, unknown>)["partner"] ?? (r as Record<string, unknown>)["Đối tác"]),
      };

      if (!customerName && !phoneNumber) {
        result.skipped += 1;
        result.errors.push({ row: rowIndex, customerCode, message: "Thiếu tối thiểu Tên KH hoặc SĐT. Bỏ qua." });
        continue;
      }

      const updateData: Record<string, unknown> = {};
      const nonEmpty = pickNonEmpty(mapped, [...allowedUpdateKeys]);

      if (typeof nonEmpty.customerName === "string") updateData.fullName = nonEmpty.customerName;
      if (typeof nonEmpty.phoneNumber === "string") updateData.phone = nonEmpty.phoneNumber;
      if (typeof nonEmpty.address === "string") updateData.address = nonEmpty.address;
      if (typeof nonEmpty.area === "string") updateData.area = nonEmpty.area;
      if (typeof nonEmpty.groupCode === "string") updateData.groupCode = nonEmpty.groupCode;
      if (typeof nonEmpty.partner === "string") updateData.partner = nonEmpty.partner;

      const birthday = parseBirthday(nonEmpty.birthday);
      if (birthday) updateData.birthday = birthday;

      try {
        const existing = await prisma.customer.findUnique({ where: { customerCode }, select: { id: true } });
        if (existing) {
          if (Object.keys(updateData).length === 0) {
            result.skipped += 1;
            continue;
          }
          await prisma.customer.update({ where: { customerCode }, data: updateData });
          result.updated += 1;
        } else {
          if (!customerName || !phoneNumber) {
            result.invalid += 1;
            result.errors.push({ row: rowIndex, customerCode, message: "Tạo mới cần đủ Tên KH và SĐT." });
            continue;
          }
          await prisma.customer.create({
            data: {
              customerCode,
              fullName: customerName,
              phone: phoneNumber,
              birthday: parseBirthday(mapped.birthday) ?? null,
              address: mapped.address || null,
              area: mapped.area || null,
              groupCode: mapped.groupCode || null,
              partner: mapped.partner || null,
              status: "MOI",
              assignedTo: "Admin",
              assignedToId: null,
            },
            select: { id: true },
          });
          result.created += 1;
        }
      } catch (e) {
        result.invalid += 1;
        result.errors.push({
          row: rowIndex,
          customerCode,
          message: e instanceof Error ? e.message : "Có lỗi khi upsert khách hàng",
        });
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/admin/customers/import error:", error);
    return NextResponse.json({ message: "Không thể import file." }, { status: 500 });
  }
}
