"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowUpRight, CalendarClock, CheckCircle2, PhoneCall, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type StatsResponse = {
  totals: { totalCalls: number; totalRevenue: number };
  perAgent: Array<{ agentId: string | null; agentName: string; totalCalls: number; totalRevenue: number }>;
};

type AdminCallLogItem = {
  id: string;
  agentName: string;
  status: string;
  revenue: number;
  callbackDate: string;
  callbackTime: string;
  timestamp: string;
};

export default function AdminDashboardPage() {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const attr = document.documentElement.getAttribute("data-theme");
    const saved = localStorage.getItem("expense-tracker-theme");
    const resolved = attr === "dark" || (attr !== "light" && saved === "dark");
    const timeout = setTimeout(() => setIsDark(resolved), 0);
    return () => clearTimeout(timeout);
  }, []);
  const [dateFrom, setDateFrom] = useState<string>(() => {
    const now = new Date();
    const from = new Date(now);
    from.setMonth(from.getMonth() - 1);
    return from.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState<string>(() => new Date().toISOString().slice(0, 10));

  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [logs, setLogs] = useState<AdminCallLogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, logsRes] = await Promise.all([
        fetch(`/api/admin/stats?dateFrom=${encodeURIComponent(dateFrom)}&dateTo=${encodeURIComponent(dateTo)}`, { cache: "no-store" }),
        fetch(
          `/api/admin/call-logs?dateFrom=${encodeURIComponent(dateFrom)}&dateTo=${encodeURIComponent(dateTo)}`,
          { cache: "no-store" }
        ),
      ]);

      if (!statsRes.ok) {
        const payload = (await statsRes.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message || "Không tải được thống kê.");
      }
      if (!logsRes.ok) {
        const payload = (await logsRes.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message || "Không tải được lịch sử.");
      }

      setStats((await statsRes.json()) as StatsResponse);
      setLogs((await logsRes.json()) as AdminCallLogItem[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void fetchAll();
    }, 0);
    return () => clearTimeout(timeout);
  }, [fetchAll]);

  const { totalCalls, totalRevenue, closeRate, callbacksDue } = useMemo(() => {
    const calls = stats?.totals.totalCalls ?? 0;
    const revenue = Number(stats?.totals.totalRevenue ?? 0);
    const closes = logs.filter((l) => l.status === "Chốt đơn" || l.status === "Upsell").length;
    const rate = calls > 0 ? Math.round((closes / calls) * 1000) / 10 : 0;
    const due = logs.filter((l) => l.status === "Hẹn gọi lại").length;
    return { totalCalls: calls, totalRevenue: revenue, closeRate: rate, callbacksDue: due };
  }, [logs, stats?.totals.totalCalls, stats?.totals.totalRevenue]);

  const revenuePerAgent = useMemo(() => {
    return (stats?.perAgent ?? []).map((row) => ({
      name: row.agentName,
      revenue: Number(row.totalRevenue || 0),
      calls: row.totalCalls,
    }));
  }, [stats?.perAgent]);

  const weeklyTrend = useMemo(() => {
    const trend = new Map<string, { date: string; calls: number }>();
    for (const item of logs) {
      if (!item.timestamp) continue;
      const day = new Date(item.timestamp).toISOString().slice(0, 10);
      const existing = trend.get(day);
      if (existing) existing.calls += 1;
      else trend.set(day, { date: day, calls: 1 });
    }
    return [...trend.values()].sort((a, b) => a.date.localeCompare(b.date));
  }, [logs]);

  return (
    <div className="px-1 py-1 md:px-2 md:py-2">
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className={`ui-card p-6 ${isDark ? "text-slate-100" : "text-slate-900"}`}
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">Tổng quan Dashboard</h1>
            <p className={`mt-1 text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>Real-time snapshot theo ngày.</p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="ui-input cursor-pointer"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="ui-input cursor-pointer"
            />
            <button
              type="button"
              onClick={fetchAll}
              className="ui-btn"
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {error && <div className="mt-4 text-sm text-rose-500">{error}</div>}

        <div className={`mt-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 ${loading ? "opacity-70" : ""}`}>
          <div className="ui-card-soft p-4">
            <div className="flex items-center justify-between">
              <div className="text-xs opacity-70">Tổng cuộc gọi trong ngày</div>
              <PhoneCall className="h-4 w-4 opacity-70" />
            </div>
            <div className="text-3xl font-black mt-2">{totalCalls}</div>
          </div>

          <div className="ui-card-soft p-4">
            <div className="flex items-center justify-between">
              <div className="text-xs opacity-70">Tổng doanh thu</div>
              <ArrowUpRight className="h-4 w-4 opacity-70" />
            </div>
            <div className="text-3xl font-black mt-2">{totalRevenue.toLocaleString("vi-VN")} VND</div>
          </div>

          <div className="ui-card-soft p-4">
            <div className="flex items-center justify-between">
              <div className="text-xs opacity-70">Tỷ lệ chốt đơn</div>
              <CheckCircle2 className="h-4 w-4 opacity-70" />
            </div>
            <div className="text-3xl font-black mt-2">{closeRate}%</div>
          </div>

          <div className="ui-card-soft p-4">
            <div className="flex items-center justify-between">
              <div className="text-xs opacity-70">Khách cần gọi lại</div>
              <CalendarClock className="h-4 w-4 opacity-70" />
            </div>
            <div className="text-3xl font-black mt-2">{callbacksDue}</div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 xl:grid-cols-2 gap-3">
          <div className="ui-card-soft p-4">
            <div className="font-extrabold">Doanh thu theo nhân viên</div>
            <div className={`mt-1 text-xs ${isDark ? "text-slate-300" : "text-slate-600"}`}>Tổng doanh thu trong ngày theo user.</div>
            <div className="mt-3 h-70">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenuePerAgent} margin={{ left: 8, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="revenue" fill={isDark ? "#38bdf8" : "#0284c7"} radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="ui-card-soft p-4">
            <div className="font-extrabold">Xu hướng cuộc gọi</div>
            <div className={`mt-1 text-xs ${isDark ? "text-slate-300" : "text-slate-600"}`}>Call volume theo ngày (dữ liệu đang là snapshot theo bộ lọc).</div>
            <div className="mt-3 h-70">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyTrend} margin={{ left: 8, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="calls" stroke={isDark ? "#a78bfa" : "#7c3aed"} strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
