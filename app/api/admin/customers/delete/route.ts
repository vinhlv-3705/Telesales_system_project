import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
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

    const body = (await request.json().catch(() => null)) as { customerIds?: string[] } | null;
    const customerIds = Array.isArray(body?.customerIds) ? body?.customerIds.filter(Boolean) : [];

    if (customerIds.length === 0) {
      return NextResponse.json({ message: "Thiếu danh sách customerIds." }, { status: 400 });
    }

    const result = await prisma.customer.deleteMany({
      where: { id: { in: customerIds } },
    });

    return NextResponse.json({ deleted: result.count });
  } catch (error) {
    console.error("POST /api/admin/customers/delete error:", error);
    return NextResponse.json({ message: "Không thể xóa khách hàng." }, { status: 500 });
  }
}
