import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type UserRole = "admin" | "user";

export async function POST(request: Request) {
  const body = (await request.json()) as { username?: unknown; password?: unknown };
  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password.trim() : "";

  const credentials: Record<UserRole, { username: string; password: string }> = {
    admin: {
      username: process.env.AUTH_ADMIN_USERNAME ?? "admin",
      password: process.env.AUTH_ADMIN_PASSWORD ?? "admin123",
    },
    user: {
      username: process.env.AUTH_USER_USERNAME ?? "user",
      password: process.env.AUTH_USER_PASSWORD ?? "user123",
    },
  };

  let role: UserRole | null = null;

  try {
    type DbUser = { role: string; password: string; isLocked?: boolean | null };
    type DbClient = { user: { findUnique: (args: unknown) => Promise<DbUser | null> } };
    const db = prisma as unknown as DbClient;

    let dbUser: DbUser | null = null;
    try {
      dbUser = await db.user.findUnique({
        where: { username },
        select: { role: true, password: true, isLocked: true },
      });
    } catch {
      // Fallback khi DB chưa migrate cột isLocked.
      dbUser = await db.user.findUnique({
        where: { username },
        select: { role: true, password: true },
      });
    }

    if (dbUser?.isLocked) {
      return NextResponse.json({ message: "Tài khoản đang bị khóa." }, { status: 403 });
    }

    if (dbUser && typeof dbUser.password === "string" && dbUser.password === password) {
      role = dbUser.role === "ADMIN" ? "admin" : "user";
    }
  } catch {
    // ignore DB errors and fall back to env credentials
  }

  if (!role) {
    if (username === credentials.admin.username && password === credentials.admin.password) {
      role = "admin";
    } else if (username === credentials.user.username && password === credentials.user.password) {
      role = "user";
    }
  }

  if (!role) {
    return NextResponse.json({ message: "Sai tài khoản hoặc mật khẩu." }, { status: 401 });
  }

  const response = NextResponse.json({ success: true, role });
  response.cookies.set({
    name: "telesales_session",
    value: `${role}:${Date.now()}`,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  response.cookies.set({
    name: "telesales_role",
    value: role,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  response.cookies.set({
    name: "telesales_user",
    value: username,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });

  return response;
}
