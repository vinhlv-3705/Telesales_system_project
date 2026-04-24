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

export async function GET(request: Request) {
  try {
    type DbCallLog = {
      id: string;
      customerId: string;
      customerName: string;
      agentId: string | null;
      agentName: string;
      callStatus: string;
      revenue: number;
      callbackDate: Date | null;
      callbackTime: string | null;
      notes: string | null;
      note: string | null;
      timestamp: Date;
    };
    type DbClient = {
      callLog: {
        findMany: (args: unknown) => Promise<DbCallLog[]>;
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
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const agentId = searchParams.get("agentId");
    const agentName = searchParams.get("agentName");

    const where: Record<string, unknown> = {};

    if (agentId) {
      where.agentId = agentId;
    }

    if (agentName) {
      where.agentName = { contains: agentName };
    }

    if (dateFrom || dateTo) {
      const start = dateFrom ? new Date(`${dateFrom}T00:00:00.000Z`) : new Date("1970-01-01T00:00:00.000Z");
      const end = dateTo ? new Date(`${dateTo}T23:59:59.999Z`) : new Date("9999-12-31T23:59:59.999Z");
      where.timestamp = { gte: start, lte: end };
    }

    const logs = await db.callLog.findMany({
      where,
      orderBy: { timestamp: "desc" },
      take: 2000,
      select: {
        id: true,
        customerId: true,
        customerName: true,
        agentId: true,
        agentName: true,
        callStatus: true,
        revenue: true,
        callbackDate: true,
        callbackTime: true,
        notes: true,
        note: true,
        timestamp: true,
      },
    });

    return NextResponse.json(
      logs.map((item) => ({
        id: item.id,
        customerId: item.customerId,
        customerName: item.customerName,
        agentId: item.agentId ?? null,
        agentName: item.agentName,
        status: fromEnumStatus(item.callStatus),
        revenue: Number(item.revenue || 0),
        callbackDate: item.callbackDate ? item.callbackDate.toISOString().slice(0, 10) : "",
        callbackTime: item.callbackTime ?? "",
        notes: item.notes ?? item.note ?? "",
        timestamp: item.timestamp ? item.timestamp.toISOString() : "",
      }))
    );
  } catch (error) {
    console.error("GET /api/admin/call-logs error:", error);
    return NextResponse.json({ message: "Không tải được lịch sử cuộc gọi." }, { status: 500 });
  }
}
