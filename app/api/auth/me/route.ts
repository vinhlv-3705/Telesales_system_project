import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const cookieStore = await cookies();
  const session = cookieStore.get("telesales_session")?.value;

  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  type DbUser = { id: string; role?: string; username: string };
  type DbClient = { user: { findUnique: (args: unknown) => Promise<DbUser | null> } };
  const db = prisma as unknown as DbClient;

  const roleCookie = cookieStore.get("telesales_role")?.value ?? "user";
  const usernameCookie = cookieStore.get("telesales_user")?.value ?? "User";

  const dbUser = await db.user.findUnique({ where: { username: usernameCookie }, select: { id: true, role: true, username: true } });

  const normalizedRole = (() => {
    const fromDb = dbUser?.role;
    if (fromDb === "ADMIN" || fromDb === "AGENT") return fromDb;
    if (roleCookie === "admin" || roleCookie === "ADMIN") return "ADMIN";
    return "AGENT";
  })();

  return NextResponse.json({
    authenticated: true,
    username: dbUser?.username ?? usernameCookie,
    role: normalizedRole,
    userId: dbUser?.id ?? null,
  });
}
