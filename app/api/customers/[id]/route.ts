import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const normalizeStatusLabel = (status: string) => {
  const trimmed = (status || "").trim();
  if (!trimmed) return "Mới";
  if (trimmed === "Mới") return "Mới";
  if (trimmed === "Hẹn gọi lại") return "Hẹn gọi lại";
  if (trimmed === "Chốt đơn") return "Chốt đơn";
  if (trimmed === "Từ chối") return "Từ chối";
  if (trimmed === "Upsell") return "Upsell";
  return "Mới";
};

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
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

    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ message: "Thiếu id." }, { status: 400 });
    }

    const body = (await request.json().catch(() => null)) as
      | {
          customerName?: string;
          phoneNumber?: string;
          district?: string;
          area?: string;
          status?: string;
          assignedToId?: string | null;
        }
      | null;

    const customerName = (body?.customerName || "").trim();
    const phoneNumber = (body?.phoneNumber || "").trim();
    const district = (body?.district || "").trim();
    const area = (body?.area || "").trim();
    const status = normalizeStatusLabel(body?.status || "");
    const assignedToIdRaw = typeof body?.assignedToId === "string" ? body?.assignedToId.trim() : body?.assignedToId;

    const updateData: Record<string, unknown> = {
      status,
    };

    if (customerName) updateData.fullName = customerName;
    if (typeof body?.phoneNumber === "string") updateData.phone = phoneNumber;
    if (typeof body?.district === "string") updateData.district = district || null;
    if (typeof body?.area === "string") updateData.area = area || null;

    if (assignedToIdRaw === null || assignedToIdRaw === "") {
      updateData.assignedToId = null;
      updateData.assignedTo = "";
    } else if (typeof assignedToIdRaw === "string" && assignedToIdRaw) {
      const assignedUser = await prisma.user.findUnique({ where: { id: assignedToIdRaw }, select: { id: true, username: true } });
      if (!assignedUser) {
        return NextResponse.json({ message: "Không tìm thấy nhân viên được gán." }, { status: 400 });
      }
      updateData.assignedToId = assignedUser.id;
      updateData.assignedTo = assignedUser.username;
    }

    const updated = await prisma.customer.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        customerCode: true,
        fullName: true,
        phone: true,
        address: true,
        district: true,
        area: true,
        status: true,
        assignedToUser: { select: { username: true } },
      },
    });

    return NextResponse.json({
      item: {
        id: updated.id,
        customerCode: updated.customerCode,
        customerName: updated.fullName,
        phoneNumber: updated.phone,
        address: updated.address ?? "",
        district: updated.district ?? "",
        area: updated.area ?? "",
        callStatus: normalizeStatusLabel(updated.status),
        assignedToName: updated.assignedToUser?.username ?? "",
      },
    });
  } catch (error) {
    console.error("PATCH /api/customers/[id] error:", error);
    const detailedMessage =
      process.env.NODE_ENV === "production"
        ? "Không thể cập nhật khách hàng."
        : `Không thể cập nhật khách hàng: ${error instanceof Error ? error.message : String(error)}`;
    return NextResponse.json({ message: detailedMessage }, { status: 500 });
  }
}
