import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function GET() {
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

    const rows = await prisma.customer.findMany({
      select: { area: true, district: true },
    });

    const provinces = new Set<string>();
    const districtsByProvince: Record<string, Set<string>> = {};

    for (const r of rows) {
      const province = (r.area || "").trim();
      const district = (r.district || "").trim();
      if (province) {
        provinces.add(province);
        districtsByProvince[province] = districtsByProvince[province] ?? new Set<string>();
        if (district) districtsByProvince[province].add(district);
      }
    }

    const provincesSorted = Array.from(provinces).sort((a, b) => a.localeCompare(b, "vi"));
    const districts = Object.fromEntries(
      Object.entries(districtsByProvince).map(([p, set]) => [p, Array.from(set).sort((a, b) => a.localeCompare(b, "vi"))])
    );

    return NextResponse.json({ provinces: provincesSorted, districtsByProvince: districts });
  } catch (error) {
    console.error("GET /api/admin/locations error:", error);
    return NextResponse.json({ message: "Không tải được danh sách khu vực." }, { status: 500 });
  }
}
