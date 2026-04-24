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

    const body = (await request.json().catch(() => null)) as
      | { customerIds?: string[]; assignedToId?: string | null }
      | null;

    const customerIds = Array.isArray(body?.customerIds) ? body?.customerIds.filter(Boolean) : [];
    const assignedToId = typeof body?.assignedToId === "string" ? body.assignedToId : "";

    if (customerIds.length === 0) {
      return NextResponse.json({ message: "Thiếu danh sách customerIds." }, { status: 400 });
    }
    if (!assignedToId) {
      return NextResponse.json({ message: "Thiếu assignedToId." }, { status: 400 });
    }

    const result = await prisma.customer.updateMany({
      where: { id: { in: customerIds } },
      data: { assignedToId },
    });

    return NextResponse.json({ updated: result.count });
  } catch (error) {
    console.error("POST /api/admin/customers/assign error:", error);
    return NextResponse.json({ message: "Không thể gán khách hàng." }, { status: 500 });
  }
}
