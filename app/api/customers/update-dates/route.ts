import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    type DbClient = {
      customer: {
        update: (args: unknown) => Promise<{
          id: string;
          birthday: Date | null;
          contractSignedAt?: Date | null;
          zaloConnected?: boolean | null;
        }>;
      };
    };
    const db = prisma as unknown as DbClient;

    const cookieStore = await cookies();
    const session = cookieStore.get("telesales_session")?.value;

    if (!session) {
      return NextResponse.json({ message: "Chưa đăng nhập." }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as
      | { customerId?: string; birthday?: string; contractSignedAt?: string; zaloConnected?: boolean }
      | null;

    const customerId = (body?.customerId || "").trim();
    if (!customerId) {
      return NextResponse.json({ message: "Thiếu customerId." }, { status: 400 });
    }

    const birthdayRaw = (body?.birthday || "").trim();
    const contractRaw = (body?.contractSignedAt || "").trim();
    const zaloConnected = typeof body?.zaloConnected === "boolean" ? body.zaloConnected : null;

    const birthday = (() => {
      if (!birthdayRaw) return null;
      const d = new Date(birthdayRaw);
      if (Number.isNaN(d.getTime())) return null;
      return d;
    })();

    const contractSignedAt = (() => {
      if (!contractRaw) return null;
      const d = new Date(contractRaw);
      if (Number.isNaN(d.getTime())) return null;
      return d;
    })();

    const updated = await db.customer.update({
      where: { id: customerId },
      data: {
        birthday,
        contractSignedAt,
        ...(zaloConnected === null ? {} : { zaloConnected }),
      },
      select: {
        id: true,
        birthday: true,
        contractSignedAt: true,
        zaloConnected: true,
      },
    });

    return NextResponse.json({
      id: updated.id,
      birthday: updated.birthday ? updated.birthday.toISOString() : "",
      contractSignedAt: updated.contractSignedAt ? updated.contractSignedAt.toISOString() : "",
      zaloConnected: Boolean(updated.zaloConnected),
    });
  } catch (error) {
    console.error("POST /api/customers/update-dates error:", error);
    return NextResponse.json({ message: "Không thể cập nhật thông tin." }, { status: 500 });
  }
}
