import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("telesales_session")?.value;
    const role = cookieStore.get("telesales_role")?.value;

    if (!session) {
      return NextResponse.json({ message: "Chưa đăng nhập." }, { status: 401 });
    }
    if (role !== "admin" && role !== "ADMIN") {
      return NextResponse.json({ message: "Không có quyền." }, { status: 403 });
    }

    const body = (await request.json().catch(() => null)) as
      | {
          userId?: string;
          action?: "SET_PASSWORD" | "RESET_PASSWORD" | "LOCK" | "UNLOCK";
          newPassword?: string;
        }
      | null;

    const userId = typeof body?.userId === "string" ? body.userId : "";
    const action = body?.action;

    if (!userId) {
      return NextResponse.json({ message: "Thiếu userId." }, { status: 400 });
    }
    if (action !== "SET_PASSWORD" && action !== "RESET_PASSWORD" && action !== "LOCK" && action !== "UNLOCK") {
      return NextResponse.json({ message: "Action không hợp lệ." }, { status: 400 });
    }

    const DEFAULT_PASSWORD = process.env.AUTH_DEFAULT_PASSWORD ?? "password123";

    if (action === "SET_PASSWORD") {
      const newPassword = typeof body?.newPassword === "string" ? body.newPassword.trim() : "";
      if (!newPassword) {
        return NextResponse.json({ message: "Thiếu newPassword." }, { status: 400 });
      }
      await prisma.user.update({ where: { id: userId }, data: { password: newPassword } });
      return NextResponse.json({ success: true });
    }

    if (action === "RESET_PASSWORD") {
      await prisma.user.update({ where: { id: userId }, data: { password: DEFAULT_PASSWORD } });
      return NextResponse.json({ success: true, password: DEFAULT_PASSWORD });
    }

    if (action === "LOCK") {
      try {
        await prisma.user.update({ where: { id: userId }, data: { isLocked: true, lockedAt: new Date() } });
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        if (message.includes("Unknown argument `isLocked`") || message.includes("Unknown argument `lockedAt`")) {
          await prisma.$executeRaw`UPDATE user SET isLocked = ${1}, lockedAt = ${new Date()} WHERE id = ${userId}`;
        } else {
          throw e;
        }
      }
      return NextResponse.json({ success: true });
    }

    try {
      await prisma.user.update({ where: { id: userId }, data: { isLocked: false, lockedAt: null } });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      if (message.includes("Unknown argument `isLocked`") || message.includes("Unknown argument `lockedAt`")) {
        await prisma.$executeRaw`UPDATE user SET isLocked = ${0}, lockedAt = ${null} WHERE id = ${userId}`;
      } else {
        throw e;
      }
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("POST /api/admin/users/update error:", error);
    const message =
      process.env.NODE_ENV === "production" ? "Không thể cập nhật user." : `Không thể cập nhật user. ${detail}`;
    return NextResponse.json({ message }, { status: 500 });
  }
}
