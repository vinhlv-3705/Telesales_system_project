"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { BarChart3, LayoutDashboard, LogOut, ShieldCheck } from "lucide-react";

export default function AdminPage() {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen px-4 py-8 md:px-6 md:py-10">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          className="backdrop-blur-xl p-8 rounded-2xl border bg-white/40 border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
        >
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
                <ShieldCheck className="h-7 w-7 text-blue-700" />
                Admin Console
              </h1>
              <p className="mt-2 text-slate-600">Khu vực dành riêng cho role admin.</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-5 py-3 rounded-xl border border-white/60 backdrop-blur-xl bg-white/45 text-slate-700 flex items-center"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Đăng xuất
            </button>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => router.push("/admin/dashboard")}
              className="w-full px-5 py-4 rounded-2xl border border-white/60 backdrop-blur-xl bg-white/55 text-slate-800 flex items-center gap-3 font-bold hover:bg-white/70 transition"
            >
              <BarChart3 className="h-5 w-5 text-blue-700" />
              Thống kê & báo cáo
            </button>

            <button
              type="button"
              onClick={() => router.push("/")}
              className="w-full px-5 py-4 rounded-2xl border border-white/60 backdrop-blur-xl bg-white/45 text-slate-700 flex items-center gap-3 font-bold hover:bg-white/60 transition"
            >
              <LayoutDashboard className="h-5 w-5 text-slate-700" />
              Màn hình telesales
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
