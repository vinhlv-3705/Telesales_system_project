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

    type DbClient = {
      product: {
        update: (args: unknown) => Promise<{
          id: string;
          name: string;
          code: string | null;
          price: number;
          isActive: boolean;
          categoryId: string;
          category: { id: string; name: string };
          updatedAt: Date;
        }>;
      };
    };
    const db = prisma as unknown as DbClient;

    const body = (await request.json().catch(() => null)) as
      | {
          name?: string;
          code?: string | null;
          price?: number;
          categoryId?: string;
          isActive?: boolean;
        }
      | null;

    const data: { name?: string; code?: string | null; price?: number; categoryId?: string; isActive?: boolean } = {};

    if (typeof body?.name === "string") {
      const name = body.name.trim();
      if (!name) return NextResponse.json({ message: "Tên mặt hàng không hợp lệ." }, { status: 400 });
      data.name = name;
    }
    if (typeof body?.code === "string") {
      data.code = body.code.trim() || null;
    }
    if (typeof body?.price === "number" && Number.isFinite(body.price)) {
      data.price = Math.max(0, Math.round(body.price));
    }
    if (typeof body?.categoryId === "string") {
      const categoryId = body.categoryId.trim();
      if (!categoryId) return NextResponse.json({ message: "categoryId không hợp lệ." }, { status: 400 });
      data.categoryId = categoryId;
    }
    if (typeof body?.isActive === "boolean") {
      data.isActive = body.isActive;
    }

    const updated = await db.product.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        code: true,
        price: true,
        isActive: true,
        categoryId: true,
        category: { select: { id: true, name: true } },
        updatedAt: true,
      },
    });

    return NextResponse.json({ product: updated });
  } catch (error) {
    console.error("PATCH /api/admin/products/[id] error:", error);
    return NextResponse.json({ message: "Không cập nhật được mặt hàng." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = await ensureAdmin();
    if (!auth.ok) return auth.response;

    const { id } = await ctx.params;
    if (!id) return NextResponse.json({ message: "Thiếu id." }, { status: 400 });

    await prisma.product.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/admin/products/[id] error:", error);
    return NextResponse.json({ message: "Không xoá được mặt hàng." }, { status: 500 });
  }
}
