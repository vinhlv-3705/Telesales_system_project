import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const toEnumStatus = (status: string) => {
  if (status === "Chốt đơn") return "CHOT_DON";
  if (status === "Từ chối") return "TU_CHOI";
  if (status === "Upsell" || status === "Upsale") return "UPSALE";
  if (status === "Hẹn gọi lại") return "HEN_GOI_LAI";
  return "MOI";
};

const fromEnumStatus = (status: string) => {
  if (status === "CHOT_DON") return "Chốt đơn";
  if (status === "TU_CHOI") return "Từ chối";
  if (status === "UPSALE") return "Upsell";
  if (status === "HEN_GOI_LAI") return "Hẹn gọi lại";
  return "Mới";
};

export async function GET(request: Request) {
  try {
    type DbCallLog = {
      id: string;
      customerId: string;
      customerName: string;
      agentName: string;
      callStatus: string;
      revenue: number;
      callbackDate: Date | null;
      callbackTime: string | null;
      productIds?: string[];
      productsPurchased?: string | null;
      note: string | null;
      notes: string | null;
      timestamp: Date;
    };
    type DbClient = {
      callLog: {
        findMany: (args: unknown) => Promise<DbCallLog[]>;
      };
    };
    const db = prisma as unknown as DbClient;

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get("customerId");

    if (!customerId) {
      return NextResponse.json({ message: "customerId is required." }, { status: 400 });
    }

    const logs = await db.callLog.findMany({
      where: { customerId },
      orderBy: { timestamp: "desc" },
      select: {
        id: true,
        customerId: true,
        customerName: true,
        agentName: true,
        callStatus: true,
        revenue: true,
        callbackDate: true,
        callbackTime: true,
        productsPurchased: true,
        note: true,
        notes: true,
        timestamp: true,
      },
    });

    return NextResponse.json(
      logs.map((item) => ({
        id: item.id,
        customerId: item.customerId,
        customerName: item.customerName,
        agentName: item.agentName,
        status: fromEnumStatus(item.callStatus),
        revenue: item.revenue,
        callbackDate: item.callbackDate ? item.callbackDate.toISOString().slice(0, 10) : "",
        callbackTime: item.callbackTime ?? "",
        productIds: Array.isArray(item.productIds) ? item.productIds : [],
        productsPurchased: item.productsPurchased ?? "",
        notes: item.notes ?? item.note ?? "",
        timestamp: item.timestamp.toISOString(),
      }))
    );
  } catch (error) {
    console.error("GET /api/call-logs error:", error);
    return NextResponse.json({ message: "Không tải được lịch sử cuộc gọi." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    type DbUser = { id: string };
    type DbCreatedLog = {
      id: string;
      customerId: string;
      customerName: string;
      agentName: string;
      callStatus: string;
      revenue: number;
      callbackDate: Date | null;
      callbackTime: string | null;
      productIds?: string[];
      productsPurchased?: string | null;
      note: string | null;
      notes: string | null;
      timestamp: Date;
    };
    type DbClient = {
      user: { findUnique: (args: unknown) => Promise<DbUser | null> };
      $transaction: <T>(fn: (tx: unknown) => Promise<T>) => Promise<T>;
    };

    const db = prisma as unknown as DbClient;

    const body = await request.json();
    const { customerId, customerName, agentName, status, revenue, callbackDate, callbackTime, notes, productsPurchased, productIds } = body as {
      customerId?: string;
      customerName?: string;
      agentName?: string;
      status?: string;
      revenue?: number;
      callbackDate?: string;
      callbackTime?: string;
      notes?: string;
      productsPurchased?: string;
      productIds?: string[];
    };

    if (!customerId || !customerName || !agentName || !status || !notes?.trim()) {
      return NextResponse.json({ message: "Thiếu dữ liệu bắt buộc để lưu nhật ký." }, { status: 400 });
    }

    const cookieStore = await cookies();
    const username = cookieStore.get("telesales_user")?.value;
    const agent = username ? await db.user.findUnique({ where: { username }, select: { id: true } }) : null;

    const created = await db.$transaction(async (tx) => {
      const callLogModel = (tx as unknown as { callLog: { create: (args: unknown) => Promise<DbCreatedLog> } }).callLog;
      const customerModel = (tx as unknown as { customer: { update: (args: unknown) => Promise<unknown> } }).customer;
      const productModel = (tx as unknown as {
        product: { findMany: (args: unknown) => Promise<Array<{ id: string; name: string }>> };
      }).product;

      const trimmedStatus = status.trim();
      const canAttachProducts = trimmedStatus === "Chốt đơn" || trimmedStatus === "Upsell";
      const normalizedProductIds = Array.isArray(productIds) ? productIds.filter((v) => typeof v === "string" && v.trim()).map((v) => v.trim()) : [];

      const productsSnapshot = await (async () => {
        if (!canAttachProducts) return { ids: [] as string[], snapshot: null as string | null };
        if (normalizedProductIds.length === 0) {
          const raw = typeof productsPurchased === "string" ? productsPurchased.trim() : "";
          return { ids: [] as string[], snapshot: raw ? raw : null };
        }
        const dbProducts = await productModel.findMany({
          where: { id: { in: normalizedProductIds } },
          select: { id: true, name: true },
        });
        const byId = new Map(dbProducts.map((p) => [p.id, p.name] as const));
        const orderedNames = normalizedProductIds.map((id) => byId.get(id)).filter(Boolean) as string[];
        return {
          ids: normalizedProductIds,
          snapshot: orderedNames.length > 0 ? orderedNames.join(", ") : null,
        };
      })();

      const newCallLog = await callLogModel.create({
        data: {
          customerId,
          customerName: customerName.trim(),
          agentId: agent?.id ?? null,
          agentName: agentName.trim(),
          callStatus: toEnumStatus(trimmedStatus) as never,
          revenue: Number(revenue || 0),
          callbackDate: callbackDate ? new Date(callbackDate) : null,
          callbackTime: callbackTime?.trim() || null,
          productIds: productsSnapshot.ids,
          productsPurchased: productsSnapshot.snapshot,
          note: notes.trim(),
          notes: notes.trim(),
          callAt: new Date(),
          timestamp: new Date(),
        },
        select: {
          id: true,
          customerId: true,
          customerName: true,
          agentName: true,
          callStatus: true,
          revenue: true,
          callbackDate: true,
          callbackTime: true,
          productIds: true,
          productsPurchased: true,
          note: true,
          notes: true,
          timestamp: true,
        },
      });

      await customerModel.update({
        where: { id: customerId },
        data: {
          status: toEnumStatus(status.trim()),
          callbackTime: callbackTime?.trim() || null,
          lastOrderAt:
            status.trim() === "Chốt đơn" || status.trim() === "Upsell" ? new Date() : undefined,
          productsPurchased:
            status.trim() === "Chốt đơn" || status.trim() === "Upsell"
              ? (typeof productsPurchased === "string" ? productsPurchased.trim() : "") || null
              : undefined,
        } as unknown as never,
      });

      return newCallLog;
    });

    return NextResponse.json({
      id: created.id,
      customerId: created.customerId,
      customerName: created.customerName,
      agentName: created.agentName,
      status: fromEnumStatus(created.callStatus),
      revenue: created.revenue,
      callbackDate: created.callbackDate ? created.callbackDate.toISOString().slice(0, 10) : "",
      callbackTime: created.callbackTime ?? "",
      productIds: Array.isArray(created.productIds) ? created.productIds : [],
      productsPurchased: created.productsPurchased ?? "",
      notes: created.notes ?? created.note ?? "",
      timestamp: created.timestamp.toISOString(),
    });
  } catch (error) {
    console.error("POST /api/call-logs error:", error);
    return NextResponse.json({ message: "Không thể lưu nhật ký cuộc gọi." }, { status: 500 });
  }
}
