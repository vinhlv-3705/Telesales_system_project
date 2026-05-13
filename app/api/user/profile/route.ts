import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const username = cookieStore.get("telesales_user")?.value;

    console.log("GET Profile - Extracted username from telesales_user cookie:", username);

    if (!username) {
      return NextResponse.json({ message: "Chưa đăng nhập." }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        fullName: true,
        phoneNumber: true,
        email: true,
        avatarUrl: true,
        bio: true,
        role: true,
      },
    });

    console.log("GET Profile - Found user:", user);

    if (!user) {
      return NextResponse.json({
        id: "",
        username: username,
        fullName: null,
        phoneNumber: null,
        email: null,
        avatarUrl: null,
        bio: null,
        role: "AGENT",
        stats: {
          totalCalls: 0,
          closedDeals: 0,
          closeRate: 0,
        },
      });
    }

    // Fetch stats from CallLog
    const callLogs = await prisma.callLog.findMany({
      where: { agentId: user.id },
    });

    const totalCalls = callLogs.length;
    const closedDeals = callLogs.filter((log) => log.callStatus === "CHOT_DON").length;
    const closeRate = totalCalls > 0 ? (closedDeals / totalCalls) * 100 : 0;

    console.log("GET Profile - Stats for user", user.id, ":", { totalCalls, closedDeals, closeRate });

    const response = {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
      email: user.email,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      role: user.role,
      stats: {
        totalCalls,
        closedDeals,
        closeRate,
      },
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    console.error("GET /api/user/profile error:", error);
    return NextResponse.json({
      id: "",
      username: "",
      fullName: null,
      phoneNumber: null,
      email: null,
      avatarUrl: null,
      bio: null,
      role: "AGENT",
      stats: {
        totalCalls: 0,
        closedDeals: 0,
        closeRate: 0,
      },
    });
  }
}

export async function PATCH(request: Request) {
  try {
    const cookieStore = await cookies();
    const username = cookieStore.get("telesales_user")?.value;

    console.log("PATCH Profile - Extracted username from telesales_user cookie:", username);

    if (!username) {
      return NextResponse.json({ message: "Chưa đăng nhập." }, { status: 401 });
    }

    const body = await request.json();
    const { fullName, phoneNumber, email, avatarUrl, bio } = body;
    console.log("PATCH Profile - Request body:", { fullName, phoneNumber, email, avatarUrl, bio });

    const user = await prisma.user.findUnique({
      where: { username },
    });

    console.log("PATCH Profile - Found user:", user);

    if (!user) {
      console.error("PATCH Profile - User not found for username:", username);
      return NextResponse.json({ message: "Không tìm thấy người dùng." }, { status: 404 });
    }

    const updateData: {
      fullName?: string | null;
      phoneNumber?: string | null;
      email?: string | null;
      avatarUrl?: string | null;
      bio?: string | null;
    } = {};
    if (fullName !== undefined) updateData.fullName = fullName;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
    if (email !== undefined) updateData.email = email;
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
    if (bio !== undefined) updateData.bio = bio;

    console.log("PATCH Profile - Update data:", updateData);

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: {
        id: true,
        username: true,
        fullName: true,
        phoneNumber: true,
        email: true,
        avatarUrl: true,
        bio: true,
        role: true,
      },
    });

    // Fetch updated stats
    const callLogs = await prisma.callLog.findMany({
      where: { agentId: user.id },
    });

    const totalCalls = callLogs.length;
    const closedDeals = callLogs.filter((log) => log.callStatus === "CHOT_DON").length;
    const closeRate = totalCalls > 0 ? (closedDeals / totalCalls) * 100 : 0;

    console.log("PATCH Profile - Updated stats for user", user.id, ":", { totalCalls, closedDeals, closeRate });

    const response = {
      ...updatedUser,
      stats: {
        totalCalls,
        closedDeals,
        closeRate,
      },
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    console.error("PATCH /api/user/profile error:", error);
    return NextResponse.json({ message: "Không thể cập nhật thông tin." }, { status: 500 });
  }
}
