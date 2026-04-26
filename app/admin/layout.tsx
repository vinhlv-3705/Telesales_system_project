import Link from "next/link";
import { ReactNode } from "react";
import { BarChart3, ChevronDown, LayoutDashboard, LineChart, Users, UserCog } from "lucide-react";
import AdminTopBar from "./_components/AdminTopBar";

const NavLink = ({ href, title, icon }: { href: string; title: string; icon: ReactNode }) => {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-2xl px-3 py-2.5 border border-[color:var(--surface-border)] bg-[color:var(--surface)] hover:bg-white/35 transition"
    >
      <span className="text-sky-600/90 group-hover:text-sky-700 transition">{icon}</span>
      <span className="font-semibold text-[color:var(--foreground)] transition">{title}</span>
    </Link>
  );
};

const ExternalNavLink = ({ href, title, icon }: { href: string; title: string; icon: ReactNode }) => {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-3 rounded-2xl px-3 py-2.5 border border-[color:var(--surface-border)] bg-[color:var(--surface)] hover:bg-white/35 transition"
    >
      <span className="text-sky-600/90 group-hover:text-sky-700 transition">{icon}</span>
      <span className="font-semibold text-[color:var(--foreground)] transition">{title}</span>
    </Link>
  );
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-400 px-4 py-5 md:px-6 md:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
          <aside className="lg:sticky lg:top-6 h-fit">
            <div className="rounded-3xl border border-[color:var(--surface-border)] bg-[color:var(--surface)] backdrop-blur-2xl shadow-2xl p-4">
              <div className="px-2 py-2">
                <div className="text-xs font-bold tracking-widest opacity-80 text-[color:var(--foreground)]">TELESALES • ADMIN</div>
                <div className="mt-1 text-xl font-black text-[color:var(--foreground)]">Enterprise Console</div>
                <div className="mt-1 text-sm opacity-80 text-[color:var(--foreground)]">Dashboard & orchestration</div>
              </div>

              <div className="mt-4 space-y-2">
                <NavLink href="/admin/dashboard" title="Tổng quan Dashboard" icon={<LayoutDashboard className="h-4 w-4" />} />
                <ExternalNavLink href="/" title="Màn hình Telesales" icon={<LineChart className="h-4 w-4" />} />
                <NavLink href="/admin/reports" title="Thống kê & Báo cáo" icon={<BarChart3 className="h-4 w-4" />} />
                <details className="group">
                  <summary className="list-none cursor-pointer">
                    <div className="group flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5 border border-[color:var(--surface-border)] bg-[color:var(--surface)] hover:bg-white/35 transition">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-sky-600/90 group-hover:text-sky-700 transition">
                          <Users className="h-4 w-4" />
                        </span>
                        <span className="font-semibold text-[color:var(--foreground)] transition truncate">Quản lý Khách hàng</span>
                      </div>
                      <ChevronDown className="h-4 w-4 opacity-70 transition-transform group-open:rotate-180" />
                    </div>
                  </summary>

                  <div className="mt-2 pl-8 space-y-1">
                    <Link
                      href="/admin/customers?assigned=assigned"
                      className="group flex items-center justify-between gap-2 rounded-2xl px-3 py-2 border border-[color:var(--surface-border)] bg-[color:var(--surface)] hover:bg-white/35 transition"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="h-1.5 w-1.5 rounded-full bg-sky-600/80" />
                        <span className="text-sm font-semibold text-[color:var(--foreground)] transition truncate">Danh sách đã gán</span>
                      </div>
                    </Link>
                    <Link
                      href="/admin/customers?assigned=master"
                      className="group flex items-center justify-between gap-2 rounded-2xl px-3 py-2 border border-[color:var(--surface-border)] bg-[color:var(--surface)] hover:bg-white/35 transition"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500/80" />
                        <span className="text-sm font-semibold text-[color:var(--foreground)] transition truncate">Master khách hàng</span>
                      </div>
                    </Link>
                  </div>
                </details>
                <NavLink href="/admin/employees" title="Quản lý Nhân viên" icon={<UserCog className="h-4 w-4" />} />
              </div>

              <div className="mt-4 pt-4 border-t border-[color:var(--surface-border)] text-xs opacity-80 text-[color:var(--foreground)]">
                Tip: Dùng bộ lọc để khoanh vùng địa bàn và theo dõi hiệu suất theo ngày.
              </div>
            </div>
          </aside>

          <main className="min-w-0">
            <AdminTopBar />
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
