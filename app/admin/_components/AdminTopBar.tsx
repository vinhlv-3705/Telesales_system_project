"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Home, LayoutDashboard, LineChart, Moon, Sun } from "lucide-react";

const THEME_KEY = "expense-tracker-theme";

type Crumb = { href: string; label: string };

const labelForSegment = (segment: string) => {
  if (segment === "admin") return "Admin";
  if (segment === "dashboard") return "Tổng quan";
  if (segment === "reports") return "Báo cáo";
  if (segment === "customers") return "Khách hàng";
  if (segment === "employees") return "Nhân viên";
  return segment;
};

export default function AdminTopBar() {
  const router = useRouter();
  const pathname = usePathname();

  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const attr = document.documentElement.getAttribute("data-theme");
    const fromAttr = attr === "dark" ? true : attr === "light" ? false : null;
    const saved = localStorage.getItem(THEME_KEY);
    const fromStorage = saved === "dark" ? true : saved === "light" ? false : null;

    const resolved = fromAttr ?? fromStorage ?? false;
    document.documentElement.setAttribute("data-theme", resolved ? "dark" : "light");
    const timeout = setTimeout(() => setIsDark(resolved), 0);
    return () => clearTimeout(timeout);
  }, []);

  const crumbs = useMemo<Crumb[]>(() => {
    const path = pathname || "/admin";
    const segments = path.split("/").filter(Boolean);
    const items: Crumb[] = [];

    let acc = "";
    for (const seg of segments) {
      acc += `/${seg}`;
      if (!acc.startsWith("/admin")) continue;
      items.push({ href: acc, label: labelForSegment(seg) });
    }

    if (items.length === 0) return [{ href: "/admin/dashboard", label: "Admin" }];
    return items;
  }, [pathname]);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    try {
      localStorage.setItem(THEME_KEY, next ? "dark" : "light");
    } catch {
      // ignore
    }

    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
    }

    // Các page hiện tại đọc theme từ localStorage khi mount.
    // Reload nhẹ để toàn bộ UI admin cập nhật đồng bộ mà không refactor logic dữ liệu.
    router.refresh();
    setTimeout(() => {
      if (typeof window !== "undefined") window.location.reload();
    }, 0);
  };

  const buttonClass = isDark
    ? "h-10 px-3 rounded-2xl border border-white/10 bg-slate-900/35 hover:bg-slate-900/45 transition inline-flex items-center gap-2 text-sm font-bold text-slate-100"
    : "h-10 px-3 rounded-2xl border border-white/70 bg-white/65 hover:bg-white/80 transition inline-flex items-center gap-2 text-sm font-bold text-slate-800";

  return (
    <div
      className={`mb-4 rounded-3xl border backdrop-blur-2xl shadow-2xl px-4 py-3 ${
        isDark ? "border-white/10 bg-white/5" : "border-white/60 bg-white/45"
      }`}
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <nav className={`flex items-center gap-1 text-sm min-w-0 ${isDark ? "text-slate-200/90" : "text-slate-700"}`}>
            {crumbs.map((c, idx) => (
              <div key={c.href} className="flex items-center gap-1 min-w-0">
                {idx > 0 && <ChevronRight className="h-4 w-4 opacity-60" />}
                <Link href={c.href} className="truncate hover:text-white transition">
                  {c.label}
                </Link>
              </div>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.push("/admin/dashboard")}
            className={buttonClass}
            title="Về Dashboard admin"
          >
            <Home className="h-4 w-4" />
            Home
          </button>

          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") window.open("/", "_blank", "noopener,noreferrer");
            }}
            className={buttonClass}
            title="Mở màn hình telesales (tab mới)"
          >
            <LineChart className="h-4 w-4" />
            Telesales
          </button>

          <button
            type="button"
            onClick={() => router.push("/admin/dashboard")}
            className={buttonClass}
            title="Về Dashboard admin"
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            className={buttonClass}
            title="Chuyển sáng/tối"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {isDark ? "Light" : "Dark"}
          </button>
        </div>
      </div>
    </div>
  );
}
