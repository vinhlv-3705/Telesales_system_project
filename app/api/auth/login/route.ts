import { NextResponse } from "next/server";

type UserRole = "admin" | "user";

export async function POST(request: Request) {
  const { username, password } = await request.json();

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
  if (username === credentials.admin.username && password === credentials.admin.password) {
    role = "admin";
  } else if (username === credentials.user.username && password === credentials.user.password) {
    role = "user";
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

  return response;
}
