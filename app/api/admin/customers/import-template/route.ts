import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import * as XLSX from "xlsx";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("telesales_session")?.value;
    const role = cookieStore.get("telesales_role")?.value;

    if (!session) {
      return NextResponse.json({ message: "Chưa đăng nhập." }, { status: 401 });
    }
    if (role !== "admin" && role !== "ADMIN") {
      return NextResponse.json({ message: "Không có quyền." }, { status: 403 });
    }

    const headers = [
      "customerCode",
      "customerName",
      "phoneNumber",
      "birthday",
      "address",
      "area",
      "groupCode",
      "partner",
    ];

    const sampleRows = [
      Object.fromEntries(headers.map((h) => [h, ""])) as Record<string, string>,
      {
        customerCode: "KH001",
        customerName: "Nguyễn Văn A",
        phoneNumber: "0901234567",
        birthday: "1990-01-15",
        address: "123 Đường ABC",
        area: "Thủy Nguyên",
        groupCode: "NHOM1",
        partner: "PartnerX",
      } as Record<string, string>,
    ];

    const ws = XLSX.utils.json_to_sheet(sampleRows, { header: headers, skipHeader: false });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as ArrayBuffer | Buffer | Uint8Array;
    const body: Uint8Array = (() => {
      if (buffer instanceof ArrayBuffer) return new Uint8Array(buffer);
      if (buffer instanceof Uint8Array) return buffer;
      return new Uint8Array(buffer);
    })();

    const arrayBuffer = new Uint8Array(body).buffer;

    const filename = `customers_import_template.xlsx`;

    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "content-disposition": `attachment; filename=\"${filename}\"`,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    console.error("GET /api/admin/customers/import-template error:", error);
    return NextResponse.json({ message: "Không thể tạo template." }, { status: 500 });
  }
}
