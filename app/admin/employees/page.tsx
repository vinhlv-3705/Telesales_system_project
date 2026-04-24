"use client";

import { useEffect, useMemo, useState } from "react";
import { KeyRound, Lock, RefreshCw, ShieldCheck, ShieldOff, Users } from "lucide-react";
import { motion } from "framer-motion";

type Agent = { id: string; username: string; role?: string; isLocked?: boolean | null };

export default function AdminEmployeesPage() {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const attr = document.documentElement.getAttribute("data-theme");
    const savedTheme = localStorage.getItem("expense-tracker-theme");
    const resolved = attr === "dark" || (attr !== "light" && savedTheme === "dark");
    const timeout = setTimeout(() => setIsDark(resolved), 0);
    return () => clearTimeout(timeout);
  }, []);

  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);

  const fetchAgents = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/agents", { cache: "no-store" });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message || "Không tải được danh sách nhân viên.");
      }
      setAgents((await res.json()) as Agent[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => void fetchAgents(), 0);
    return () => clearTimeout(timeout);
  }, []);

  const rows = useMemo(() => {
    return [...agents].sort((a, b) => a.username.localeCompare(b.username));
  }, [agents]);

  const updateUser = async (payload: {
    userId: string;
    action: "SET_PASSWORD" | "RESET_PASSWORD" | "LOCK" | "UNLOCK";
    newPassword?: string;
  }) => {
    setActing(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users/update", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { message?: string } | null;
        throw new Error(data?.message || "Không thể cập nhật user.");
      }
      const data = (await res.json().catch(() => null)) as { password?: string } | null;
      if (payload.action === "RESET_PASSWORD" && data?.password) {
        if (typeof window !== "undefined") {
          window.alert(`Đã reset password về: ${data.password}`);
        }
      }
      await fetchAgents();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="px-1 py-1 md:px-2 md:py-2">
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className={`backdrop-blur-2xl rounded-3xl border shadow-2xl p-6 ${
          isDark ? "bg-slate-900/60 border-white/10 text-slate-100" : "bg-white/60 border-white/20 text-slate-900"
        }`}
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-2">
              <Users className="h-5 w-5 opacity-80" />
              Quản lý Nhân viên
            </h1>
            <p className={`mt-1 text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>Danh sách Agent đang hoạt động.</p>
          </div>
          <button
            type="button"
            onClick={fetchAgents}
            className={`h-11 px-4 rounded-2xl border inline-flex items-center gap-2 text-sm font-bold transition ${
              isDark ? "bg-white/10 border-white/10 hover:bg-white/15" : "bg-white/50 border-white/30 hover:bg-white/70"
            }`}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {error && <div className="mt-4 text-sm text-rose-500">{error}</div>}

        <div className={`mt-5 rounded-3xl border backdrop-blur-2xl overflow-hidden ${isDark ? "bg-white/5 border-white/10" : "bg-white/35 border-white/20"}`}>
          <div className="p-4 border-b border-white/10">
            <div className="text-sm font-extrabold">Agents</div>
          </div>
          <div className="p-4 overflow-x-auto">
            <table className="min-w-[520px] w-full text-sm">
              <thead>
                <tr className="text-left opacity-70">
                  <th className="py-2">Username</th>
                  <th className="py-2">Role</th>
                  <th className="py-2">Trạng thái</th>
                  <th className="py-2">Hành động</th>
                  <th className="py-2">AgentId</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((agent) => (
                  <tr key={agent.id} className="border-t border-white/10">
                    <td className="py-2 font-semibold whitespace-nowrap">{agent.username}</td>
                    <td className="py-2 whitespace-nowrap">{agent.role ?? "AGENT"}</td>
                    <td className="py-2 whitespace-nowrap">
                      {agent.isLocked ? (
                        <span className="inline-flex items-center gap-2 text-rose-400 font-bold">
                          <Lock className="h-4 w-4" />
                          Locked
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2 text-emerald-400 font-bold">
                          <ShieldCheck className="h-4 w-4" />
                          Active
                        </span>
                      )}
                    </td>
                    <td className="py-2 whitespace-nowrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          disabled={acting}
                          onClick={() =>
                            void updateUser({
                              userId: agent.id,
                              action: agent.isLocked ? "UNLOCK" : "LOCK",
                            })
                          }
                          className={`h-9 px-3 rounded-2xl border inline-flex items-center gap-2 text-xs font-bold transition disabled:opacity-60 ${
                            isDark
                              ? "bg-white/10 border-white/10 hover:bg-white/15"
                              : "bg-white/50 border-white/30 hover:bg-white/70"
                          }`}
                          title={agent.isLocked ? "Mở khóa user" : "Khóa user"}
                        >
                          {agent.isLocked ? <ShieldOff className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                          {agent.isLocked ? "Unlock" : "Lock"}
                        </button>

                        <button
                          type="button"
                          disabled={acting}
                          onClick={() => void updateUser({ userId: agent.id, action: "RESET_PASSWORD" })}
                          className={`h-9 px-3 rounded-2xl border inline-flex items-center gap-2 text-xs font-bold transition disabled:opacity-60 ${
                            isDark
                              ? "bg-white/10 border-white/10 hover:bg-white/15"
                              : "bg-white/50 border-white/30 hover:bg-white/70"
                          }`}
                          title="Khôi phục password mặc định"
                        >
                          <KeyRound className="h-4 w-4" />
                          Reset PW
                        </button>

                        <button
                          type="button"
                          disabled={acting}
                          onClick={() => {
                            if (typeof window === "undefined") return;
                            const pw = window.prompt(`Đặt password mới cho ${agent.username}:`, "");
                            if (!pw) return;
                            void updateUser({ userId: agent.id, action: "SET_PASSWORD", newPassword: pw });
                          }}
                          className={`h-9 px-3 rounded-2xl border inline-flex items-center gap-2 text-xs font-bold transition disabled:opacity-60 ${
                            isDark
                              ? "bg-white/10 border-white/10 hover:bg-white/15"
                              : "bg-white/50 border-white/30 hover:bg-white/70"
                          }`}
                          title="Đổi password"
                        >
                          <KeyRound className="h-4 w-4" />
                          Set PW
                        </button>
                      </div>
                    </td>
                    <td className="py-2 font-mono text-xs opacity-80 whitespace-nowrap">{agent.id}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td className="py-3 opacity-70" colSpan={5}>
                      Chưa có dữ liệu.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
