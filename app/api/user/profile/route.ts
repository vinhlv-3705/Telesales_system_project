import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("telesales_session")?.value;

    if (!session) {
      return NextResponse.json({ message: "Chưa đăng nhập." }, { status: 401 });
    }

    // Parse session to extract username (format: username:timestamp)
    const username = session.split(':')[0];

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

    return NextResponse.json(response);
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
    const session = cookieStore.get("telesales_session")?.value;

    if (!session) {
      return NextResponse.json({ message: "Chưa đăng nhập." }, { status: 401 });
    }

    // Parse session to extract username (format: username:timestamp)
    const username = session.split(':')[0];

    const body = await request.json();
    const { fullName, phoneNumber, email, avatarUrl, bio } = body;

    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
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

    const response = {
      ...updatedUser,
      stats: {
        totalCalls,
        closedDeals,
        closeRate,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("PATCH /api/user/profile error:", error);
    return NextResponse.json({ message: "Không thể cập nhật thông tin." }, { status: 500 });
  }
}
