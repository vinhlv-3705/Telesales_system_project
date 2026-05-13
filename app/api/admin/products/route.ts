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

export async function GET(request: Request) {
  try {
    const auth = await ensureAdmin();
    if (!auth.ok) return auth.response;

    type DbClient = {
      product: {
        findMany: (args: unknown) => Promise<
          Array<{
            id: string;
            name: string;
            code: string | null;
            price: number;
            isActive: boolean;
            categoryId: string;
            category: { id: string; name: string };
            updatedAt: Date;
          }>
        >;
        create: (args: unknown) => Promise<{
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

    const { searchParams } = new URL(request.url);
    const categoryId = (searchParams.get("categoryId") || "").trim();
    const q = (searchParams.get("q") || "").trim();

    const where: unknown = {
      isActive: true,
      ...(categoryId ? { categoryId } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" as const } },
              { code: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const products = await db.product.findMany({
      where: where as unknown,
      orderBy: [{ name: "asc" }],
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

    return NextResponse.json({ products });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("GET /api/admin/products error:", error);
    const message = process.env.NODE_ENV === "production" ? "Không tải được mặt hàng." : `Không tải được mặt hàng. ${detail}`;
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await ensureAdmin();
    if (!auth.ok) return auth.response;

    type DbClient = {
      product: {
        create: (args: unknown) => Promise<{
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

    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const code = typeof body?.code === "string" ? body.code.trim() : null;
    const price = typeof body?.price === "number" && Number.isFinite(body.price) ? Math.max(0, Math.round(body.price)) : 0;
    const categoryId = typeof body?.categoryId === "string" ? body.categoryId.trim() : "";
    const isActive = typeof body?.isActive === "boolean" ? body.isActive : true;

    if (!name) return NextResponse.json({ message: "Thiếu tên mặt hàng." }, { status: 400 });
    if (!categoryId) return NextResponse.json({ message: "Thiếu categoryId." }, { status: 400 });

    const created = await db.product.create({
      data: { name, code: code || null, price, categoryId, isActive },
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

    return NextResponse.json({ product: created });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("POST /api/admin/products error:", error);
    const message = process.env.NODE_ENV === "production" ? "Không tạo được mặt hàng." : `Không tạo được mặt hàng. ${detail}`;
    return NextResponse.json({ message }, { status: 500 });
  }
}
