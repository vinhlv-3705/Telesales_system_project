"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Filter, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
} from "recharts";

type AgentOption = { id: string; username: string };

type StatsResponse = {
  totals: { totalCalls: number; totalRevenue: number };
  perAgent: Array<{
    agentId: string | null;
    agentName: string;
    totalCalls: number;
    totalRevenue: number;
    totalClosed?: number;
    totalUpsell?: number;
    totalRejected?: number;
    totalCallback?: number;
  }>;
};

type AdminCallLogItem = {
  id: string;
  customerId: string;
  customerName: string;
  agentId: string | null;
  agentName: string;
  status: string;
  revenue: number;
  callbackDate: string;
  callbackTime: string;
  notes: string;
  timestamp: string;
};

const toCsvCell = (value: unknown) => {
  const raw = value == null ? "" : String(value);
  const escaped = raw.replace(/\r?\n/g, " ").replace(/"/g, '""');
  return `"${escaped}"`;
};

export default function AdminReportsPanel() {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const attr = document.documentElement.getAttribute("data-theme");
    const savedTheme = localStorage.getItem("expense-tracker-theme");
    const resolved = attr === "dark" || (attr !== "light" && savedTheme === "dark");
    const timeout = setTimeout(() => setIsDark(resolved), 0);
    return () => clearTimeout(timeout);
  }, []);
  const [agentOptions, setAgentOptions] = useState<AgentOption[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [agentNameFilter, setAgentNameFilter] = useState<string>("");
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

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const res = await fetch("/api/agents", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as AgentOption[];
        setAgentOptions(data);
      } catch {
        // ignore
      }
    };

    void fetchAgents();
  }, []);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (selectedAgentId) params.set("agentId", selectedAgentId);
    if (agentNameFilter.trim()) params.set("agentName", agentNameFilter.trim());
    const qs = params.toString();
    return qs ? `?${qs}` : "";
  }, [dateFrom, dateTo, selectedAgentId, agentNameFilter]);

  const statsQueryString = useMemo(() => {
    const params = new URLSearchParams();
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (selectedAgentId) params.set("agentId", selectedAgentId);
    if (agentNameFilter.trim()) params.set("agentName", agentNameFilter.trim());
    const qs = params.toString();
    return qs ? `?${qs}` : "";
  }, [dateFrom, dateTo, selectedAgentId, agentNameFilter]);

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, logsRes] = await Promise.all([
        fetch(`/api/admin/stats${statsQueryString}`, { cache: "no-store" }),
        fetch(`/api/admin/call-logs${queryString}`, { cache: "no-store" }),
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
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      void fetchAll();
    }, 0);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString, statsQueryString]);

  const perAgentRows = useMemo(() => {
    return [...(stats?.perAgent ?? [])].sort((a, b) => Number(b.totalRevenue || 0) - Number(a.totalRevenue || 0));
  }, [stats?.perAgent]);

  const pieColors = useMemo(
    () => [
      "#38bdf8",
      "#a78bfa",
      "#34d399",
      "#fbbf24",
      "#fb7185",
      "#22c55e",
      "#60a5fa",
      "#c084fc",
      "#f97316",
      "#2dd4bf",
    ],
    []
  );

  const pieData = useMemo(() => {
    return perAgentRows
      .filter((row) => Number(row.totalRevenue || 0) > 0)
      .map((row) => ({ name: row.agentName, value: Number(row.totalRevenue || 0) }));
  }, [perAgentRows]);

  const pieTotal = useMemo(() => pieData.reduce((acc, cur) => acc + Number(cur.value || 0), 0), [pieData]);

  const formatCompactVnd = (value: number) => {
    const v = Number(value || 0);
    if (v >= 1_000_000_000) return `${Math.round((v / 1_000_000_000) * 10) / 10}B`;
    if (v >= 1_000_000) return `${Math.round((v / 1_000_000) * 10) / 10}M`;
    if (v >= 1_000) return `${Math.round((v / 1_000) * 10) / 10}K`;
    return `${Math.round(v)}`;
  };

  const exportCsv = () => {
    const header = ["timestamp", "agentName", "customerName", "status", "revenue", "callbackDate", "callbackTime", "notes"];

    const rows = logs.map((item) => [
      toCsvCell(item.timestamp),
      toCsvCell(item.agentName),
      toCsvCell(item.customerName),
      toCsvCell(item.status),
      toCsvCell(item.revenue),
      toCsvCell(item.callbackDate),
      toCsvCell(item.callbackTime),
      toCsvCell(item.notes),
    ]);

    const csv = [header.map(toCsvCell).join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `call-logs_${dateFrom}${dateTo ? `_${dateTo}` : ""}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`backdrop-blur-2xl rounded-3xl border shadow-2xl p-6 ${
        isDark ? "bg-slate-900/60 border-white/10 text-slate-100" : "bg-white/60 border-white/20 text-slate-900"
      }`}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">Thống kê & Báo cáo</h1>
          <p className={`mt-1 text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>Bảng dữ liệu, lọc thông minh và xuất file.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchAll}
            className={`h-11 px-4 rounded-2xl border inline-flex items-center gap-2 text-sm font-bold transition ${
              isDark ? "bg-white/10 border-white/10 hover:bg-white/15" : "bg-white/50 border-white/30 hover:bg-white/70"
            }`}
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={exportCsv}
            disabled={logs.length === 0}
            className={`h-11 px-4 rounded-2xl border inline-flex items-center gap-2 text-sm font-bold transition disabled:opacity-60 ${
              isDark ? "bg-white/10 border-white/10 hover:bg-white/15" : "bg-white/50 border-white/30 hover:bg-white/70"
            }`}
            title="Export CSV"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 lg:grid-cols-4 gap-3">
        <div className="lg:col-span-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className={`text-sm font-semibold ${isDark ? "text-slate-200" : "text-slate-700"}`}>Từ ngày</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className={`mt-1 h-11 w-full px-3 rounded-2xl border bg-white/20 backdrop-blur-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 ${
                isDark ? "border-white/10 text-white" : "border-white/20 text-slate-900"
              }`}
            />
          </div>
          <div>
            <label className={`text-sm font-semibold ${isDark ? "text-slate-200" : "text-slate-700"}`}>Đến ngày</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className={`mt-1 h-11 w-full px-3 rounded-2xl border bg-white/20 backdrop-blur-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 ${
                isDark ? "border-white/10 text-white" : "border-white/20 text-slate-900"
              }`}
            />
          </div>
          <div>
            <label className={`text-sm font-semibold ${isDark ? "text-slate-200" : "text-slate-700"}`}>Nhân viên</label>
            <select
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(e.target.value)}
              className={`mt-1 h-11 w-full px-3 rounded-2xl border bg-white/20 backdrop-blur-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 ${
                isDark ? "border-white/10 text-white" : "border-white/20 text-slate-900"
              }`}
            >
              <option value="">Tất cả</option>
              {agentOptions.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.username}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={`text-sm font-semibold ${isDark ? "text-slate-200" : "text-slate-700"}`}>Lọc theo tên</label>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-60" />
              <input
                value={agentNameFilter}
                onChange={(e) => setAgentNameFilter(e.target.value)}
                placeholder="VD: user1"
                className={`mt-1 h-11 w-full pl-10 pr-3 rounded-2xl border bg-white/20 backdrop-blur-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 ${
                  isDark
                    ? "border-white/10 text-white placeholder:text-slate-400"
                    : "border-white/20 text-slate-900 placeholder:text-slate-500"
                }`}
              />
            </div>
          </div>
        </div>

        {error && <div className="lg:col-span-4 text-sm text-rose-500">{error}</div>}

        <div className={`lg:col-span-4 grid grid-cols-1 md:grid-cols-3 gap-3 ${loading ? "opacity-70" : ""}`}>
          <div className={`rounded-3xl border p-4 backdrop-blur-2xl ${isDark ? "bg-white/5 border-white/10" : "bg-white/35 border-white/20"}`}>
            <div className="text-xs opacity-70">Tổng số cuộc gọi</div>
            <div className="text-2xl font-black mt-1">{stats?.totals.totalCalls ?? 0}</div>
          </div>
          <div className={`rounded-3xl border p-4 backdrop-blur-2xl ${isDark ? "bg-white/5 border-white/10" : "bg-white/35 border-white/20"}`}>
            <div className="text-xs opacity-70">Tổng doanh thu</div>
            <div className="text-2xl font-black mt-1">{Number(stats?.totals.totalRevenue ?? 0).toLocaleString("vi-VN")} VND</div>
          </div>
          <div className={`rounded-3xl border p-4 backdrop-blur-2xl ${isDark ? "bg-white/5 border-white/10" : "bg-white/35 border-white/20"}`}>
            <div className="text-xs opacity-70">Số bản ghi lịch sử</div>
            <div className="text-2xl font-black mt-1">{logs.length}</div>
          </div>
        </div>

        <div className="lg:col-span-4 mt-2">
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-3">
            <div
              className={`xl:col-span-3 rounded-3xl border backdrop-blur-2xl overflow-hidden ${
                isDark ? "bg-white/5 border-white/10" : "bg-white/35 border-white/20"
              }`}
            >
              <div className="p-4 border-b border-white/10">
                <h2 className="text-lg font-extrabold">Tổng doanh thu theo nhân viên</h2>
              </div>
              <div className="p-4">
                <table className="w-full text-sm table-fixed">
                  <thead>
                    <tr className="text-left opacity-70">
                      <th className="py-2 w-[18%]">Nhân viên</th>
                      <th className="py-2 w-[12%]">Tổng gọi</th>
                      <th className="py-2 w-[14%]">Chốt</th>
                      <th className="py-2 w-[14%]">Upsell</th>
                      <th className="py-2 w-[14%]">Reject</th>
                      <th className="py-2 w-[14%]">CallBack</th>
                      <th className="py-2 w-[14%] text-right">Doanh thu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {perAgentRows.map((row) => (
                      <tr key={`${row.agentId ?? row.agentName}`} className="border-t border-white/10">
                        <td className="py-2 font-semibold">{row.agentName}</td>
                        <td className="py-2">{row.totalCalls}</td>
                        <td className="py-2">{Number(row.totalClosed || 0)}</td>
                        <td className="py-2">{Number(row.totalUpsell || 0)}</td>
                        <td className="py-2">{Number(row.totalRejected || 0)}</td>
                        <td className="py-2">{Number(row.totalCallback || 0)}</td>
                        <td className="py-2 font-bold text-right">{Number(row.totalRevenue).toLocaleString("vi-VN")} VND</td>
                      </tr>
                    ))}
                    {perAgentRows.length === 0 && (
                      <tr>
                        <td className="py-3 opacity-70" colSpan={7}>
                          Chưa có dữ liệu.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div
              className={`xl:col-span-2 rounded-3xl border backdrop-blur-2xl overflow-hidden ${
                isDark ? "bg-white/5 border-white/10" : "bg-white/35 border-white/20"
              }`}
            >
              <div className="p-4 border-b border-white/10">
                <h3 className="text-lg font-extrabold">Tỷ trọng doanh thu</h3>
              </div>
              <div className="p-4">
                <div className="h-96">
                  {pieData.length === 0 ? (
                    <div className="text-sm opacity-70">Chưa có dữ liệu doanh thu để vẽ biểu đồ.</div>
                  ) : (
                    <div className="grid grid-cols-1">
                      <div
                        className={`h-80 rounded-2xl border relative overflow-hidden ${
                          isDark ? "border-white/10 bg-white/5" : "border-white/20 bg-white/30"
                        }`}
                      >
                        <div
                          className="absolute inset-0 opacity-60"
                          style={{
                            background:
                              "radial-gradient(circle at 50% 45%, rgba(56, 189, 248, 0.22), transparent 55%), radial-gradient(circle at 30% 70%, rgba(167, 139, 250, 0.18), transparent 60%)",
                          }}
                        />
                        <div className="absolute inset-0 p-2">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={pieData}
                                dataKey="value"
                                nameKey="name"
                                innerRadius={70}
                                outerRadius={132}
                                paddingAngle={2}
                                stroke={isDark ? "rgba(255,255,255,0.14)" : "rgba(15,23,42,0.10)"}
                                strokeWidth={1}
                                labelLine={false}
                                label={(props: unknown) => {
                                  const p = props as {
                                    cx: number;
                                    cy: number;
                                    midAngle: number;
                                    innerRadius: number;
                                    outerRadius: number;
                                    percent: number;
                                    value: number;
                                    index: number;
                                  };
                                  const RADIAN = Math.PI / 180;
                                  const radius = (Number(p.innerRadius || 0) + Number(p.outerRadius || 0)) / 2;
                                  const x = p.cx + radius * Math.cos(-p.midAngle * RADIAN);
                                  const y = p.cy + radius * Math.sin(-p.midAngle * RADIAN);
                                  const percent = Math.round((p.percent || 0) * 1000) / 10;
                                  if (!Number.isFinite(percent) || percent <= 0) return null;
                                  const valueLabel = formatCompactVnd(Number(p.value || 0));
                                  const color = pieColors[(p.index ?? 0) % pieColors.length];
                                  const name = pieData[p.index ?? 0]?.name ?? "";
                                  return (
                                    <text
                                      x={x}
                                      y={y}
                                      textAnchor="middle"
                                      dominantBaseline="central"
                                      fill={color}
                                      stroke={isDark ? "rgba(2,6,23,0.55)" : "rgba(255,255,255,0.75)"}
                                      strokeWidth={3}
                                      paintOrder="stroke"
                                      fontSize={12}
                                      fontWeight={900}
                                    >
                                      {`${name}: ${valueLabel} (${percent}%)`}
                                    </text>
                                  );
                                }}
                              >
                                {pieData.map((_, index) => (
                                  <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                                ))}
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                        </div>

                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                          <div className="text-[11px] font-bold opacity-70">Tổng</div>
                          <div className="text-sm font-black tracking-tight">
                            {pieTotal.toLocaleString("vi-VN")} VND
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 mt-3">
          <div className={`rounded-3xl border backdrop-blur-2xl overflow-hidden ${isDark ? "bg-white/5 border-white/10" : "bg-white/35 border-white/20"}`}>
            <div className="p-4 border-b border-white/10">
              <h2 className="text-lg font-extrabold">Bảng lịch sử tổng</h2>
              <p className={`mt-1 text-xs ${isDark ? "text-slate-300" : "text-slate-600"}`}>Hiển thị tối đa 2000 bản ghi gần nhất theo bộ lọc.</p>
            </div>
            <div className="p-4 overflow-x-auto">
              <table className="min-w-[1100px] w-full text-sm">
                <thead>
                  <tr className="text-left opacity-70">
                    <th className="py-2">Thời gian</th>
                    <th className="py-2">Nhân viên</th>
                    <th className="py-2">Khách hàng</th>
                    <th className="py-2">Kết quả</th>
                    <th className="py-2">Doanh thu</th>
                    <th className="py-2">Hẹn</th>
                    <th className="py-2">Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((item) => (
                    <tr key={item.id} className="border-t border-white/10 align-top">
                      <td className="py-2 whitespace-nowrap">{item.timestamp ? new Date(item.timestamp).toLocaleString("vi-VN") : ""}</td>
                      <td className="py-2 font-semibold whitespace-nowrap">{item.agentName}</td>
                      <td className="py-2">{item.customerName}</td>
                      <td className="py-2 whitespace-nowrap">{item.status}</td>
                      <td className="py-2 font-bold whitespace-nowrap">{Number(item.revenue).toLocaleString("vi-VN")}</td>
                      <td className="py-2 whitespace-nowrap">{item.callbackDate ? `${item.callbackDate} ${item.callbackTime || ""}` : ""}</td>
                      <td className="py-2 max-w-[420px]">
                        <div className="line-clamp-2" title={item.notes}>
                          {item.notes}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr>
                      <td className="py-3 opacity-70" colSpan={7}>
                        Không có bản ghi nào.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
