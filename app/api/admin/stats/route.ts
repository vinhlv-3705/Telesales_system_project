import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    type DbCallLog = { agentId: string | null; agentName: string; revenue: number; timestamp: Date };
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

    const where: Record<string, unknown> = {};
    if (date) {
      const start = new Date(`${date}T00:00:00.000Z`);
      const end = new Date(`${date}T23:59:59.999Z`);
      where.timestamp = { gte: start, lte: end };
    }

    const logs = await db.callLog.findMany({
      where,
      select: {
        agentId: true,
        agentName: true,
        revenue: true,
        timestamp: true,
      },
    });

    const perAgent = new Map<string, { agentId: string | null; agentName: string; totalCalls: number; totalRevenue: number }>();

    for (const item of logs) {
      const key = item.agentId ?? `name:${item.agentName}`;
      const existing = perAgent.get(key);
      if (existing) {
        existing.totalCalls += 1;
        existing.totalRevenue += Number(item.revenue || 0);
      } else {
        perAgent.set(key, {
          agentId: item.agentId ?? null,
          agentName: item.agentName,
          totalCalls: 1,
          totalRevenue: Number(item.revenue || 0),
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
