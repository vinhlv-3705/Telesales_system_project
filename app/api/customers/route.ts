import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const fromEnumStatus = (status: string | null | undefined) => {
  if (status === "CHOT_DON") return "Chốt đơn";
  if (status === "TU_CHOI") return "Từ chối";
  if (status === "UPSALE") return "Upsell";
  if (status === "HEN_GOI_LAI") return "Hẹn gọi lại";
  return "Mới";
};

export async function GET(request: Request) {
  try {
    type DbUser = { id: string; role?: string };
    type DbCustomer = {
      id: string;
      customerCode: string;
      fullName: string;
      birthday?: Date | null;
      contractSignedAt?: Date | null;
      phone: string;
      address: string | null;
      area: string | null;
      groupCode: string | null;
      partner: string | null;
      notes: string | null;
      status: string;
      callbackTime: string | null;
      lastOrderAt?: Date | null;
      productsPurchased?: string | null;
      zaloConnected?: boolean | null;
    };
    type DbCallLog = {
      customerId: string;
      callStatus: string;
      callbackDate: Date | null;
      callbackTime: string | null;
      note: string | null;
      notes: string | null;
      timestamp: Date;
    };
    type DbClient = {
      user: {
        findUnique: (args: unknown) => Promise<DbUser | null>;
      };
      customer: {
        findMany: (args: unknown) => Promise<DbCustomer[]>;
      };
      callLog: {
        findMany: (args: unknown) => Promise<DbCallLog[]>;
      };
    };

    const db = prisma as unknown as DbClient;
    const cookieStore = await cookies();
    const session = cookieStore.get("telesales_session")?.value;
    const roleCookie = cookieStore.get("telesales_role")?.value;
    const username = cookieStore.get("telesales_user")?.value;

    if (!session) {
      return NextResponse.json({ message: "Chưa đăng nhập." }, { status: 401 });
    }

    const isAdmin = roleCookie === "admin" || roleCookie === "ADMIN";

    const userModel = (db as unknown as { user?: { findUnique?: (args: unknown) => Promise<DbUser | null> } }).user;
    if (!userModel?.findUnique) {
      return NextResponse.json(
        {
          message:
            "Hệ thống chưa được migrate schema phân quyền (thiếu bảng User). Vui lòng chạy prisma migrate dev + db seed trước.",
        },
        { status: 500 }
      );
    }

    const user = username
      ? await userModel.findUnique({ where: { username }, select: { id: true, role: true } })
      : null;

    const { searchParams } = new URL(request.url);
    const assignedToId = searchParams.get("assignedToId");

    const whereFilter =
      isAdmin
        ? assignedToId
          ? { assignedToId }
          : undefined
        : user?.id
          ? { assignedToId: user.id }
          : { assignedToId: "__NO_USER__" };

    const customers = await (async () => {
      try {
        return await db.customer.findMany({
          where: whereFilter,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            customerCode: true,
            fullName: true,
            birthday: true,
            contractSignedAt: true,
            phone: true,
            address: true,
            area: true,
            groupCode: true,
            partner: true,
            notes: true,
            status: true,
            callbackTime: true,
            lastOrderAt: true,
            productsPurchased: true,
            zaloConnected: true,
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!message.includes("Unknown field `zaloConnected`")) {
          throw error;
        }

        return await db.customer.findMany({
          where: whereFilter,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            customerCode: true,
            fullName: true,
            birthday: true,
            contractSignedAt: true,
            phone: true,
            address: true,
            area: true,
            groupCode: true,
            partner: true,
            notes: true,
            status: true,
            callbackTime: true,
            lastOrderAt: true,
            productsPurchased: true,
          },
        });
      }
    })();

    const customerIds = customers.map((customer) => customer.id);
    const latestByCustomerId = new Map<string, DbCallLog>();
    const batchSize = 800;

    for (let i = 0; i < customerIds.length; i += batchSize) {
      const batch = customerIds.slice(i, i + batchSize);
      const logs = await db.callLog.findMany({
        where: { customerId: { in: batch } },
        orderBy: { timestamp: "desc" },
        select: {
          customerId: true,
          callStatus: true,
          callbackDate: true,
          callbackTime: true,
          note: true,
          notes: true,
          timestamp: true,
        },
      });

      for (const log of logs) {
        if (!latestByCustomerId.has(log.customerId)) {
          latestByCustomerId.set(log.customerId, log);
        }
      }
    }

    const today = new Date().toISOString().slice(0, 10);
    const data = customers.map((customer: DbCustomer) => {
      const latest = latestByCustomerId.get(customer.id);
      return {
        id: customer.id,
        customerCode: customer.customerCode,
        customerName: customer.fullName,
        phoneNumber: customer.phone,
        address: customer.address ?? "",
        area: customer.area ?? "",
        groupCode: customer.groupCode ?? "",
        partner: customer.partner ?? "",
        birthday: customer.birthday ? customer.birthday.toISOString() : "",
        contractSignedAt: customer.contractSignedAt ? customer.contractSignedAt.toISOString() : "",
        lastOrderAt: customer.lastOrderAt ? customer.lastOrderAt.toISOString() : "",
        productsPurchased: customer.productsPurchased ?? "",
        zaloConnected: Boolean(customer.zaloConnected),
        callStatus: latest?.callStatus ? fromEnumStatus(latest.callStatus) : fromEnumStatus(customer.status),
        callbackDate: latest?.callbackDate ? latest.callbackDate.toISOString().slice(0, 10) : today,
        callbackTime: latest?.callbackTime ?? customer.callbackTime ?? "",
        note: latest?.notes ?? latest?.note ?? customer.notes ?? "",
        lastInteractionAt: latest?.timestamp ? latest.timestamp.toISOString() : "",
      };
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/customers error:", error);
    const detailedMessage =
      process.env.NODE_ENV === "production"
        ? "Không tải được dữ liệu khách hàng."
        : `Không tải được dữ liệu khách hàng: ${error instanceof Error ? error.message : String(error)}`;
    return NextResponse.json({ message: detailedMessage }, { status: 500 });
  }
}
