import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    type DbCallLog = { agentId: string | null; agentName: string; callStatus: string; revenue: number; timestamp: Date };
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
    const date = searchParams.get("date");
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

    if (dateFrom || dateTo || date) {
      const resolvedFrom = dateFrom || date;
      const resolvedTo = dateTo || date;

      const start = resolvedFrom ? new Date(`${resolvedFrom}T00:00:00.000Z`) : new Date("1970-01-01T00:00:00.000Z");
      const end = resolvedTo ? new Date(`${resolvedTo}T23:59:59.999Z`) : new Date("9999-12-31T23:59:59.999Z");
      where.timestamp = { gte: start, lte: end };
    }

    const logs = await db.callLog.findMany({
      where,
      select: {
        agentId: true,
        agentName: true,
        callStatus: true,
        revenue: true,
        timestamp: true,
      },
    });

    const normalizeStatus = (status: string) => {
      const value = (status || "").trim();
      if (value === "CHOT_DON" || value === "Chốt đơn") return "CHOT_DON";
      if (value === "UPSALE" || value === "Upsell") return "UPSALE";
      if (value === "TU_CHOI" || value === "Từ chối") return "TU_CHOI";
      if (value === "HEN_GOI_LAI" || value === "Hẹn gọi lại") return "HEN_GOI_LAI";
      return "MOI";
    };

    const perAgent = new Map<
      string,
      {
        agentId: string | null;
        agentName: string;
        totalCalls: number;
        totalRevenue: number;
        totalClosed: number;
        totalUpsell: number;
        totalRejected: number;
        totalCallback: number;
      }
    >();

    for (const item of logs) {
      const key = item.agentId ?? `name:${item.agentName}`;
      const existing = perAgent.get(key);
      const normalized = normalizeStatus(item.callStatus);
      if (existing) {
        existing.totalCalls += 1;
        existing.totalRevenue += Number(item.revenue || 0);
        if (normalized === "CHOT_DON") existing.totalClosed += 1;
        if (normalized === "UPSALE") existing.totalUpsell += 1;
        if (normalized === "TU_CHOI") existing.totalRejected += 1;
        if (normalized === "HEN_GOI_LAI") existing.totalCallback += 1;
      } else {
        perAgent.set(key, {
          agentId: item.agentId ?? null,
          agentName: item.agentName,
          totalCalls: 1,
          totalRevenue: Number(item.revenue || 0),
          totalClosed: normalized === "CHOT_DON" ? 1 : 0,
          totalUpsell: normalized === "UPSALE" ? 1 : 0,
          totalRejected: normalized === "TU_CHOI" ? 1 : 0,
          totalCallback: normalized === "HEN_GOI_LAI" ? 1 : 0,
        });
      }
    }

    const summary = [...perAgent.values()].sort((a, b) => b.totalRevenue - a.totalRevenue);
    const totals = summary.reduce(
      (acc, cur) => ({ totalCalls: acc.totalCalls + cur.totalCalls, totalRevenue: acc.totalRevenue + cur.totalRevenue }),
      { totalCalls: 0, totalRevenue: 0 }
    );

    return NextResponse.json({ totals, perAgent: summary });
  } catch (error) {
    console.error("GET /api/admin/stats error:", error);
    return NextResponse.json({ message: "Không tải được thống kê." }, { status: 500 });
  }
}
