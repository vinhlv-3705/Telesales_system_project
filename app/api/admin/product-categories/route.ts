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

export async function GET() {
  try {
    const auth = await ensureAdmin();
    if (!auth.ok) return auth.response;

    const categories = await prisma.productCategory.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        sortOrder: true,
        _count: { select: { products: true } },
      },
    });

    return NextResponse.json({ categories });
  } catch (error) {
    console.error("GET /api/admin/product-categories error:", error);
    return NextResponse.json({ message: "Không tải được category." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await ensureAdmin();
    if (!auth.ok) return auth.response;

    const body = (await request.json().catch(() => null)) as
      | {
          name?: string;
          sortOrder?: number;
        }
      | null;

    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const sortOrder = typeof body?.sortOrder === "number" && Number.isFinite(body.sortOrder) ? body.sortOrder : 0;

    if (!name) {
      return NextResponse.json({ message: "Thiếu tên category." }, { status: 400 });
    }

    const created = await prisma.productCategory.create({
      data: { name, sortOrder },
      select: { id: true, name: true, sortOrder: true },
    });

    return NextResponse.json({ category: created });
  } catch (error) {
    console.error("POST /api/admin/product-categories error:", error);
    return NextResponse.json({ message: "Không tạo được category." }, { status: 500 });
  }
}
