import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("telesales_session")?.value;

    if (!session) {
      return NextResponse.json({ message: "Chưa đăng nhập." }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as
      | { customerId?: string; callbackDate?: string; note?: string; agentName?: string }
      | null;

    const customerId = (body?.customerId || "").trim();
    if (!customerId) {
      return NextResponse.json({ message: "Thiếu customerId." }, { status: 400 });
    }

    const callbackDate = (body?.callbackDate || "").trim();
    const note = (body?.note || "").trim();
    const agentName = (body?.agentName || "").trim();

    type DbClient = {
      callLog: {
        create: (args: unknown) => Promise<{
          id: string;
          customerId: string;
          callbackDate: Date | null;
          note: string | null;
          notes: string | null;
          timestamp: Date;
        }>;
      };
    };
    const db = prisma as unknown as DbClient;

    const callbackDateObj = callbackDate ? new Date(callbackDate) : null;

    const created = await db.callLog.create({
      data: {
        customerId,
        customerName: "",
        agentName: agentName || "System",
        callStatus: "HEN_GOI_LAI",
        revenue: 0,
        callbackDate: callbackDateObj,
        note: note || null,
        notes: note || null,
        callAt: new Date(),
        timestamp: new Date(),
      } as never,
      select: {
        id: true,
        customerId: true,
        callbackDate: true,
        note: true,
        notes: true,
        timestamp: true,
      },
    });

    return NextResponse.json({
      id: created.id,
      customerId: created.customerId,
      callbackDate: created.callbackDate ? created.callbackDate.toISOString().slice(0, 10) : "",
      note: created.notes ?? created.note ?? "",
      timestamp: created.timestamp.toISOString(),
    });
  } catch (error) {
    console.error("POST /api/customers/update-callback error:", error);
    return NextResponse.json({ message: "Không thể cập nhật lịch hẹn." }, { status: 500 });
  }
}
