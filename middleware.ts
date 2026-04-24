import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/auth/logout"];
const ADMIN_ONLY_PREFIXES = ["/admin"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get("telesales_session")?.value);
  const role = request.cookies.get("telesales_role")?.value;
  const isPublic = PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  const isAdminOnlyRoute = ADMIN_ONLY_PREFIXES.some((path) => pathname === path || pathname.startsWith(`${path}/`));

  if (pathname === "/login" && hasSession) {
    const redirectPath = role === "admin" ? "/admin/dashboard" : "/";
    return NextResponse.redirect(new URL(redirectPath, request.url));
  }

  if (!isPublic && !hasSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isAdminOnlyRoute && role !== "admin") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
