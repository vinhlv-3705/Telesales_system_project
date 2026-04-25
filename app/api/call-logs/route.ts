import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const toEnumStatus = (status: string) => {
  if (status === "Chốt đơn") return "CHOT_DON";
  if (status === "Từ chối") return "TU_CHOI";
  if (status === "Upsell" || status === "Upsale") return "UPSALE";
  if (status === "Hẹn gọi lại") return "HEN_GOI_LAI";
  return "MOI";
};

const fromEnumStatus = (status: string) => {
  if (status === "CHOT_DON") return "Chốt đơn";
  if (status === "TU_CHOI") return "Từ chối";
  if (status === "UPSALE") return "Upsell";
  if (status === "HEN_GOI_LAI") return "Hẹn gọi lại";
  return "Mới";
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get("customerId");

    if (!customerId) {
      return NextResponse.json({ message: "customerId is required." }, { status: 400 });
    }

    const logs = await prisma.callLog.findMany({
      where: { customerId },
      orderBy: { timestamp: "desc" },
      select: {
        id: true,
        customerId: true,
        customerName: true,
        agentName: true,
        callStatus: true,
        revenue: true,
        callbackDate: true,
        callbackTime: true,
        note: true,
        notes: true,
        timestamp: true,
      },
    });

    return NextResponse.json(
      logs.map((item) => ({
        id: item.id,
        customerId: item.customerId,
        customerName: item.customerName,
        agentName: item.agentName,
        status: fromEnumStatus(item.callStatus),
        revenue: item.revenue,
        callbackDate: item.callbackDate ? item.callbackDate.toISOString().slice(0, 10) : "",
        callbackTime: item.callbackTime ?? "",
        notes: item.notes ?? item.note ?? "",
        timestamp: item.timestamp.toISOString(),
      }))
    );
  } catch (error) {
    console.error("GET /api/call-logs error:", error);
    return NextResponse.json({ message: "Không tải được lịch sử cuộc gọi." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    type DbUser = { id: string };
    type DbClient = {
      user: { findUnique: (args: unknown) => Promise<DbUser | null> };
    };

    const db = prisma as unknown as DbClient;

    const body = await request.json();
    const { customerId, customerName, agentName, status, revenue, callbackDate, callbackTime, notes, productsPurchased } = body as {
      customerId?: string;
      customerName?: string;
      agentName?: string;
      status?: string;
      revenue?: number;
      callbackDate?: string;
      callbackTime?: string;
      notes?: string;
      productsPurchased?: string;
    };

    if (!customerId || !customerName || !agentName || !status || !notes?.trim()) {
      return NextResponse.json({ message: "Thiếu dữ liệu bắt buộc để lưu nhật ký." }, { status: 400 });
    }

    const cookieStore = await cookies();
    const username = cookieStore.get("telesales_user")?.value;
    const agent = username ? await db.user.findUnique({ where: { username }, select: { id: true } }) : null;

    const created = await prisma.$transaction(async (tx) => {
      const newCallLog = await tx.callLog.create({
        data: {
          customerId,
          customerName: customerName.trim(),
          agentId: agent?.id ?? null,
          agentName: agentName.trim(),
          callStatus: toEnumStatus(status) as never,
          revenue: Number(revenue || 0),
          callbackDate: callbackDate ? new Date(callbackDate) : null,
          callbackTime: callbackTime?.trim() || null,
          note: notes.trim(),
          notes: notes.trim(),
          callAt: new Date(),
          timestamp: new Date(),
        },
        select: {
          id: true,
          customerId: true,
          customerName: true,
          agentName: true,
          callStatus: true,
          revenue: true,
          callbackDate: true,
          callbackTime: true,
          note: true,
          notes: true,
          timestamp: true,
        },
      });

      await tx.customer.update({
        where: { id: customerId },
        data: {
          status: toEnumStatus(status.trim()),
          callbackTime: callbackTime?.trim() || null,
          lastOrderAt:
            status.trim() === "Chốt đơn" || status.trim() === "Upsell" ? new Date() : undefined,
          productsPurchased:
            status.trim() === "Chốt đơn" || status.trim() === "Upsell"
              ? (typeof productsPurchased === "string" ? productsPurchased.trim() : "") || null
              : undefined,
        } as unknown as never,
      });

      return newCallLog;
    });

    return NextResponse.json({
      id: created.id,
      customerId: created.customerId,
      customerName: created.customerName,
      agentName: created.agentName,
      status: fromEnumStatus(created.callStatus),
      revenue: created.revenue,
      callbackDate: created.callbackDate ? created.callbackDate.toISOString().slice(0, 10) : "",
      callbackTime: created.callbackTime ?? "",
      notes: created.notes ?? created.note ?? "",
      timestamp: created.timestamp.toISOString(),
    });
  } catch (error) {
    console.error("POST /api/call-logs error:", error);
    return NextResponse.json({ message: "Không thể lưu nhật ký cuộc gọi." }, { status: 500 });
  }
}
