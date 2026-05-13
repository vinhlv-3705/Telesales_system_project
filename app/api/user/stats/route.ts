import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("telesales_session")?.value;

    if (!session) {
      return NextResponse.json({ message: "Chưa đăng nhập." }, { status: 401 });
    }

    // Parse session to extract username (format: username:timestamp)
    const username = session.split(':')[0];

    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      return NextResponse.json({ message: "Không tìm thấy người dùng." }, { status: 404 });
    }

    const callLogs = await prisma.callLog.findMany({
      where: { agentId: user.id },
    });

    const totalCalls = callLogs.length;
    const closedDeals = callLogs.filter((log) => log.callStatus === "CHOT_DON").length;
    const closeRate = totalCalls > 0 ? (closedDeals / totalCalls) * 100 : 0;

    return NextResponse.json({
      totalCalls,
      closedDeals,
      closeRate,
    });
  } catch (error) {
    console.error("GET /api/user/stats error:", error);
    return NextResponse.json({ message: "Lỗi server." }, { status: 500 });
  }
}
