import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    type DbUser = { id: string; username: string; role?: string; isLocked?: boolean | null };
    type DbClient = {
      user: {
        findMany: (args: unknown) => Promise<DbUser[]>;
      };
    };

    const db = prisma as unknown as DbClient;
    const cookieStore = await cookies();
    const session = cookieStore.get("telesales_session")?.value;
    const roleCookie = cookieStore.get("telesales_role")?.value;

    if (!session) {
      return NextResponse.json({ message: "Chưa đăng nhập." }, { status: 401 });
    }

    const isAdmin = roleCookie === "admin" || roleCookie === "ADMIN";
    if (!isAdmin) {
      return NextResponse.json({ message: "Không có quyền." }, { status: 403 });
    }

    let agents: DbUser[] = [];
    try {
      agents = await db.user.findMany({
        where: { role: "AGENT" },
        orderBy: { username: "asc" },
        select: { id: true, username: true, role: true, isLocked: true },
      });
    } catch {
      // Fallback khi DB chưa migrate cột isLocked.
      agents = (await db.user.findMany({
        where: { role: "AGENT" },
        orderBy: { username: "asc" },
        select: { id: true, username: true, role: true },
      })) as DbUser[];

      agents = agents.map((a) => ({ ...a, isLocked: false }));
    }

    return NextResponse.json(agents);
  } catch (error) {
    console.error("GET /api/agents error:", error);
    return NextResponse.json({ message: "Không tải được danh sách nhân viên." }, { status: 500 });
  }
}
