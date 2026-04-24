import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const fromEnumStatus = (status: string) => {
  if (status === "CHOT_DON") return "Chốt đơn";
  if (status === "TU_CHOI") return "Từ chối";
  if (status === "UPSALE") return "Upsell";
  if (status === "HEN_GOI_LAI") return "Hẹn gọi lại";
  return "Mới";
};

const normalizeStatusLabel = (status: string) => {
  const trimmed = (status || "").trim();
  if (!trimmed) return "Mới";
  if (trimmed === "Mới") return "Mới";
  if (trimmed === "Hẹn gọi lại") return "Hẹn gọi lại";
  if (trimmed === "Chốt đơn") return "Chốt đơn";
  if (trimmed === "Từ chối") return "Từ chối";
  if (trimmed === "Upsell") return "Upsell";
  return fromEnumStatus(trimmed);
};

export async function GET(request: Request) {
  try {
    type DbAssignedUser = { username: string };
    type DbCallLog = { callStatus: string; timestamp: Date | null };
    type DbCustomer = {
      id: string;
      customerCode: string;
      fullName: string;
      phone: string;
      address: string | null;
      area: string | null;
      groupCode: string | null;
      partner: string | null;
      status: string;
      assignedToUser?: DbAssignedUser | null;
      callLogs?: DbCallLog[];
    };

    type DbClient = {
      customer: {
        findMany: (args: unknown) => Promise<DbCustomer[]>;
        count: (args: unknown) => Promise<number>;
      };
    };

    const db = prisma as unknown as DbClient;

    const cookieStore = await cookies();
    const session = cookieStore.get("telesales_session")?.value;
    const role = cookieStore.get("telesales_role")?.value;

    if (!session) {
      return NextResponse.json({ message: "Chưa đăng nhập." }, { status: 401 });
    }
    if (role !== "admin" && role !== "ADMIN") {
      return NextResponse.json({ message: "Không có quyền." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);

    const page = Math.max(1, Number(searchParams.get("page") || "1") || 1);
    const pageSizeRaw = Number(searchParams.get("pageSize") || "50") || 50;
    const pageSize = Math.min(200, Math.max(10, pageSizeRaw));

    const q = (searchParams.get("q") || "").trim();
    const assignedToId = (searchParams.get("assignedToId") || "").trim();
    const status = (searchParams.get("status") || "").trim();
    const area = (searchParams.get("area") || "").trim();

    const where: Record<string, unknown> = {};

    if (assignedToId) where.assignedToId = assignedToId;

    if (status) {
      const enumMap: Record<string, string> = {
        "Mới": "MOI",
        "Hẹn gọi lại": "HEN_GOI_LAI",
        "Chốt đơn": "CHOT_DON",
        "Từ chối": "TU_CHOI",
        "Upsell": "UPSALE",
      };

      // DB có thể đang lưu status theo dạng tiếng Việt ("Chốt đơn") hoặc dạng enum code ("CHOT_DON").
      // Để filter luôn đúng, match cả 2 format.
      const enumValue = enumMap[status];
      if (enumValue) {
        where.status = { in: [status, enumValue] };
      } else {
        where.status = status;
      }
    }

    if (area) {
      where.area = { contains: area };
    }

    if (q) {
      where.OR = [
        { customerCode: { contains: q } },
        { fullName: { contains: q } },
        { phone: { contains: q } },
      ];
    }

    const [total, rows] = await Promise.all([
      db.customer.count({ where }),
      db.customer.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          customerCode: true,
          fullName: true,
          phone: true,
          address: true,
          area: true,
          groupCode: true,
          partner: true,
          status: true,
          assignedToUser: { select: { username: true } },
          callLogs: {
            orderBy: { timestamp: "desc" },
            take: 1,
            select: { callStatus: true, timestamp: true },
          },
        },
      }),
    ]);

    const items = rows.map((c) => {
      const latest = c.callLogs?.[0];
      const callStatus = latest?.callStatus ? fromEnumStatus(latest.callStatus) : normalizeStatusLabel(c.status);
      return {
        id: c.id,
        customerCode: c.customerCode,
        customerName: c.fullName,
        phoneNumber: c.phone,
        address: c.address ?? "",
        area: c.area ?? "",
        groupCode: c.groupCode ?? "",
        partner: c.partner ?? "",
        callStatus,
        lastInteractionAt: latest?.timestamp ? latest.timestamp.toISOString() : "",
        assignedToName: c.assignedToUser?.username ?? "",
      };
    });

    return NextResponse.json({ items, total, page, pageSize });
  } catch (error) {
    console.error("GET /api/admin/customers error:", error);
    return NextResponse.json({ message: "Không tải được dữ liệu khách hàng." }, { status: 500 });
  }
}
