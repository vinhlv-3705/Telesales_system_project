import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    type DbClient = {
      productCategory: {
        findMany: (args: unknown) => Promise<
          Array<{
            id: string;
            name: string;
            sortOrder: number;
            products: Array<{ id: string; name: string; code: string | null }>;
          }>
        >;
      };
    };
    const db = prisma as unknown as DbClient;

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim();

    const whereProduct = q
      ? {
          isActive: true,
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { code: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : { isActive: true };

    const categories = await db.productCategory.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        sortOrder: true,
        products: {
          where: whereProduct,
          orderBy: [{ name: "asc" }],
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    if (!Array.isArray(categories) || categories.length === 0) {
      return NextResponse.json({
        categories: [
          {
            id: "demo-cat-1",
            name: "Kháng sinh",
            sortOrder: 10,
            products: [
              { id: "demo-p-1", name: "Amoxicillin 500mg", code: "KS-AMOX-500" },
              { id: "demo-p-2", name: "Azithromycin 500mg", code: "KS-AZIT-500" },
              { id: "demo-p-3", name: "Cefixime 200mg", code: "KS-CEFI-200" },
            ],
          },
          {
            id: "demo-cat-2",
            name: "Giảm đau - Hạ sốt",
            sortOrder: 20,
            products: [
              { id: "demo-p-4", name: "Paracetamol 500mg", code: "GD-PARA-500" },
              { id: "demo-p-5", name: "Ibuprofen 400mg", code: "GD-IBU-400" },
            ],
          },
          {
            id: "demo-cat-3",
            name: "Vitamin",
            sortOrder: 30,
            products: [
              { id: "demo-p-6", name: "Vitamin C 1000mg", code: "VT-C-1000" },
              { id: "demo-p-7", name: "Vitamin D3 1000IU", code: "VT-D3-1000" },
              { id: "demo-p-8", name: "Kẽm (Zinc) 15mg", code: "VT-ZINC-15" },
            ],
          },
          {
            id: "demo-cat-4",
            name: "Tiêu hoá",
            sortOrder: 40,
            products: [
              { id: "demo-p-9", name: "Men vi sinh", code: "TH-PROBIO" },
              { id: "demo-p-10", name: "Omeprazole 20mg", code: "TH-OME-20" },
            ],
          },
        ],
      });
    }

    return NextResponse.json({ categories });
  } catch (error) {
    console.error("GET /api/master/products error:", error);
    return NextResponse.json({ message: "Không tải được danh mục mặt hàng." }, { status: 500 });
  }
}
