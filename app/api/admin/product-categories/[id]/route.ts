import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const ensureAdmin = async () => {
  const cookieStore = await cookies();
  const session = cookieStore.get("telesales_session")?.value;
  const role = cookieStore.get("telesales_role")?.value;

  if (!session) {
    return { ok: false as const, response: NextResponse.json({ message: "Chưa đăng nhập." }, { status: 401 }) };
  }
  if (role !== "admin" && role !== "ADMIN") {
    return { ok: false as const, response: NextResponse.json({ message: "Không có quyền." }, { status: 403 }) };
  }
  return { ok: true as const };
};

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = await ensureAdmin();
    if (!auth.ok) return auth.response;

    const { id } = await ctx.params;
    if (!id) return NextResponse.json({ message: "Thiếu id." }, { status: 400 });

    const body = (await request.json().catch(() => null)) as
      | {
          name?: string;
          sortOrder?: number;
        }
      | null;

    const data: { name?: string; sortOrder?: number } = {};
    if (typeof body?.name === "string") {
      const name = body.name.trim();
      if (!name) return NextResponse.json({ message: "Tên category không hợp lệ." }, { status: 400 });
      data.name = name;
    }
    if (typeof body?.sortOrder === "number" && Number.isFinite(body.sortOrder)) {
      data.sortOrder = body.sortOrder;
    }

    const updated = await prisma.productCategory.update({
      where: { id },
      data,
      select: { id: true, name: true, sortOrder: true },
    });

    return NextResponse.json({ category: updated });
  } catch (error) {
    console.error("PATCH /api/admin/product-categories/[id] error:", error);
    return NextResponse.json({ message: "Không cập nhật được category." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = await ensureAdmin();
    if (!auth.ok) return auth.response;

    const { id } = await ctx.params;
    if (!id) return NextResponse.json({ message: "Thiếu id." }, { status: 400 });

    await prisma.productCategory.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/admin/product-categories/[id] error:", error);
    return NextResponse.json({ message: "Không xoá được category." }, { status: 500 });
  }
}
