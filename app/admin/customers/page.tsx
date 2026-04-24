"use client";

import { useEffect, useMemo, useState } from "react";
import { Filter, RefreshCw, Search, Trash2, UserPlus, Users, X } from "lucide-react";
import { motion } from "framer-motion";

type CustomerRow = {
  id: string;
  customerCode: string;
  customerName: string;
  phoneNumber: string;
  address: string;
  area: string;
  groupCode: string;
  partner: string;
  callStatus: string;
  lastInteractionAt?: string;
  assignedToName?: string;
};

type CustomersResponse = {
  items: CustomerRow[];
  total: number;
  page: number;
  pageSize: number;
};

type Agent = { id: string; username: string };

export default function AdminCustomersPage() {
  const [isDark, setIsDark] = useState(false);
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const attr = document.documentElement.getAttribute("data-theme");
    const savedTheme = localStorage.getItem("expense-tracker-theme");
    const resolved = attr === "dark" || (attr !== "light" && savedTheme === "dark");
    const timeout = setTimeout(() => setIsDark(resolved), 0);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => setNow(Date.now()), 0);
    const interval = setInterval(() => setNow(Date.now()), 60_000);
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, []);

  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [area, setArea] = useState<string>("");
  const [q, setQ] = useState<string>("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});

  const [bulkAssignAgentId, setBulkAssignAgentId] = useState<string>("");
  const [bulkActing, setBulkActing] = useState(false);

  const [data, setData] = useState<CustomersResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createSaving, setCreateSaving] = useState(false);
  const [createForm, setCreateForm] = useState({
    customerCode: "",
    customerName: "",
    phoneNumber: "",
    address: "",
    area: "",
    groupCode: "",
    partner: "",
  });

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const res = await fetch("/api/agents", { cache: "no-store" });
        if (!res.ok) return;
        setAgents((await res.json()) as Agent[]);
      } catch {
        // ignore
      }
    };

    void fetchAgents();
  }, []);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    if (q.trim()) params.set("q", q.trim());
    if (selectedAgentId) params.set("assignedToId", selectedAgentId);
    if (status) params.set("status", status);
    if (area.trim()) params.set("area", area.trim());
    return params.toString();
  }, [area, page, pageSize, q, selectedAgentId, status]);

  const fetchCustomers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/customers?${queryString}`, { cache: "no-store" });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message || "Không tải được dữ liệu khách hàng.");
      }
      const payload = (await res.json()) as CustomersResponse;
      setData(payload);
      setSelectedIds({});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => void fetchCustomers(), 0);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString]);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const selectedList = useMemo(() => Object.keys(selectedIds).filter((id) => selectedIds[id]), [selectedIds]);

  const clearSelection = () => setSelectedIds({});

  const bulkAssign = async () => {
    if (selectedList.length === 0) return;
    if (!bulkAssignAgentId) {
      setError("Vui lòng chọn nhân viên để gán.");
      return;
    }
    setBulkActing(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/customers/assign", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ customerIds: selectedList, assignedToId: bulkAssignAgentId }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message || "Không thể gán khách hàng.");
      }
      await fetchCustomers();
      setBulkAssignAgentId("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setBulkActing(false);
    }
  };

  const bulkDelete = async () => {
    if (selectedList.length === 0) return;
    const ok = typeof window !== "undefined" && window.confirm(`Xóa ${selectedList.length} khách hàng đã chọn?`);
    if (!ok) return;
    setBulkActing(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/customers/delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ customerIds: selectedList }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message || "Không thể xóa khách hàng.");
      }
      await fetchCustomers();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setBulkActing(false);
    }
  };

  const toggleAllOnPage = (checked: boolean) => {
    const next: Record<string, boolean> = {};
    for (const row of items) next[row.id] = checked;
    setSelectedIds(next);
  };

  const resetCreateForm = () =>
    setCreateForm({
      customerCode: "",
      customerName: "",
      phoneNumber: "",
      address: "",
      area: "",
      groupCode: "",
      partner: "",
    });

  const submitCreateCustomer = async () => {
    const customerCode = createForm.customerCode.trim();
    const customerName = createForm.customerName.trim();
    const phoneNumber = createForm.phoneNumber.trim();

    if (!customerCode) {
      setError("Vui lòng nhập mã khách hàng.");
      return;
    }
    if (!customerName) {
      setError("Vui lòng nhập tên khách hàng.");
      return;
    }
    if (!phoneNumber) {
      setError("Vui lòng nhập số điện thoại.");
      return;
    }

    setCreateSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/customers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          customerCode,
          customerName,
          phoneNumber,
          address: createForm.address,
          area: createForm.area,
          groupCode: createForm.groupCode,
          partner: createForm.partner,
        }),
      });

      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message || "Không thể tạo khách hàng.");
      }

      const payload = (await res.json()) as { item: CustomerRow };
      const created = payload.item;

      setCreateOpen(false);
      resetCreateForm();
      setSelectedIds({});

      if (page === 1) {
        setData((prev) => {
          const prevItems = prev?.items ?? [];
          const nextItems = [created, ...prevItems].slice(0, pageSize);
          const prevTotal = prev?.total ?? 0;
          return { items: nextItems, total: prevTotal + 1, page: 1, pageSize };
        });
      } else {
        setPage(1);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setCreateSaving(false);
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
              Quản lý Khách hàng
            </h1>
            <p className={`mt-1 text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>Master data + phân trang để thao tác mượt.</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setError(null);
                setCreateOpen(true);
              }}
              className={`h-11 px-4 rounded-2xl border inline-flex items-center gap-2 text-sm font-bold transition ${
                isDark ? "bg-sky-500/15 border-sky-300/20 hover:bg-sky-500/20" : "bg-sky-500/10 border-sky-500/20 hover:bg-sky-500/15"
              }`}
            >
              <UserPlus className="h-4 w-4" />
              Thêm khách hàng
            </button>

            <button
              type="button"
              onClick={fetchCustomers}
              className={`h-11 px-4 rounded-2xl border inline-flex items-center gap-2 text-sm font-bold transition ${
                isDark ? "bg-white/10 border-white/10 hover:bg-white/15" : "bg-white/50 border-white/30 hover:bg-white/70"
              }`}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-3">
          <div className="lg:col-span-4">
            <label className={`text-sm font-semibold ${isDark ? "text-slate-200" : "text-slate-700"}`}>Tìm kiếm</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-60" />
              <input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                placeholder="Mã KH, Tên, SĐT..."
                className={`mt-1 h-11 w-full pl-10 pr-3 rounded-2xl border bg-white/20 backdrop-blur-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 ${
                  isDark
                    ? "border-white/10 text-white placeholder:text-slate-400"
                    : "border-white/20 text-slate-900 placeholder:text-slate-500"
                }`}
              />
            </div>
          </div>

          <div className="lg:col-span-3">
            <label className={`text-sm font-semibold ${isDark ? "text-slate-200" : "text-slate-700"}`}>Nhân viên</label>
            <select
              value={selectedAgentId}
              onChange={(e) => {
                setSelectedAgentId(e.target.value);
                setPage(1);
              }}
              className={`mt-1 h-11 w-full px-3 rounded-2xl border bg-white/20 backdrop-blur-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 ${
                isDark ? "border-white/10 text-white" : "border-white/20 text-slate-900"
              }`}
            >
              <option value="">Tất cả</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.username}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2">
            <label className={`text-sm font-semibold ${isDark ? "text-slate-200" : "text-slate-700"}`}>Trạng thái</label>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className={`mt-1 h-11 w-full px-3 rounded-2xl border bg-white/20 backdrop-blur-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 ${
                isDark ? "border-white/10 text-white" : "border-white/20 text-slate-900"
              }`}
            >
              <option value="">Tất cả</option>
              <option value="Mới">Mới</option>
              <option value="Hẹn gọi lại">Hẹn gọi lại</option>
              <option value="Chốt đơn">Chốt đơn</option>
              <option value="Từ chối">Từ chối</option>
              <option value="Upsell">Upsell</option>
            </select>
          </div>

          <div className="lg:col-span-3">
            <label className={`text-sm font-semibold ${isDark ? "text-slate-200" : "text-slate-700"}`}>Địa bàn</label>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-60" />
              <input
                value={area}
                onChange={(e) => {
                  setArea(e.target.value);
                  setPage(1);
                }}
                placeholder="VD: Thủy Nguyên"
                className={`mt-1 h-11 w-full pl-10 pr-3 rounded-2xl border bg-white/20 backdrop-blur-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 ${
                  isDark
                    ? "border-white/10 text-white placeholder:text-slate-400"
                    : "border-white/20 text-slate-900 placeholder:text-slate-500"
                }`}
              />
            </div>
          </div>
        </div>

        {error && <div className="mt-4 text-sm text-rose-500">{error}</div>}

        <div className="mt-5 flex items-center justify-between gap-3 flex-wrap">
          <div className={`text-sm ${isDark ? "text-slate-300" : "text-slate-700"}`}>
            Tổng: <span className="font-bold">{total.toLocaleString("vi-VN")}</span> • Trang {page}/{totalPages}
          </div>
          <div className="flex items-center gap-2">
            <label className={`text-sm ${isDark ? "text-slate-300" : "text-slate-700"}`}>Page size</label>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className={`h-10 px-3 rounded-2xl border bg-white/20 backdrop-blur-2xl text-sm ${
                isDark ? "border-white/10 text-white" : "border-white/20 text-slate-900"
              }`}
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        <div className={`mt-4 rounded-3xl border backdrop-blur-2xl overflow-hidden ${isDark ? "bg-white/5 border-white/10" : "bg-white/35 border-white/20"}`}>
          <div className="p-4 border-b border-white/10 flex items-center justify-between gap-3 flex-wrap">
            <div className="font-extrabold">Danh sách khách hàng</div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className={`text-xs ${isDark ? "text-slate-300" : "text-slate-600"}`}>Đã chọn: {selectedList.length}</div>
              {selectedList.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={bulkAssignAgentId}
                    onChange={(e) => setBulkAssignAgentId(e.target.value)}
                    className={`h-10 px-3 rounded-2xl border bg-white/20 backdrop-blur-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 ${
                      isDark ? "border-white/10 text-white" : "border-white/20 text-slate-900"
                    }`}
                  >
                    <option value="">Gán cho nhân viên...</option>
                    {agents.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.username}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    disabled={bulkActing}
                    onClick={bulkAssign}
                    className={`h-10 px-3 rounded-2xl border inline-flex items-center gap-2 text-sm font-bold transition disabled:opacity-60 ${
                      isDark ? "bg-white/10 border-white/10 hover:bg-white/15" : "bg-white/50 border-white/30 hover:bg-white/70"
                    }`}
                    title="Gán khách hàng đã chọn cho nhân viên"
                  >
                    <UserPlus className="h-4 w-4" />
                    Gán
                  </button>

                  <button
                    type="button"
                    disabled={bulkActing}
                    onClick={bulkDelete}
                    className={`h-10 px-3 rounded-2xl border inline-flex items-center gap-2 text-sm font-bold transition disabled:opacity-60 ${
                      isDark ? "bg-rose-500/20 border-rose-500/30 hover:bg-rose-500/25" : "bg-rose-500/10 border-rose-500/20 hover:bg-rose-500/15"
                    }`}
                    title="Xóa khách hàng đã chọn"
                  >
                    <Trash2 className="h-4 w-4" />
                    Xóa
                  </button>

                  <button
                    type="button"
                    disabled={bulkActing}
                    onClick={clearSelection}
                    className={`h-10 px-3 rounded-2xl border inline-flex items-center gap-2 text-sm font-bold transition disabled:opacity-60 ${
                      isDark ? "bg-white/10 border-white/10 hover:bg-white/15" : "bg-white/50 border-white/30 hover:bg-white/70"
                    }`}
                    title="Bỏ chọn"
                  >
                    <X className="h-4 w-4" />
                    Bỏ chọn
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="p-4 overflow-x-auto">
            <table className="min-w-[1100px] w-full text-sm">
              <thead>
                <tr className="text-left opacity-70">
                  <th className="py-2">
                    <input
                      type="checkbox"
                      onChange={(e) => toggleAllOnPage(e.target.checked)}
                      checked={items.length > 0 && items.every((r) => selectedIds[r.id])}
                    />
                  </th>
                  <th className="py-2">Mã KH</th>
                  <th className="py-2">Tên KH</th>
                  <th className="py-2">SĐT</th>
                  <th className="py-2">Địa bàn</th>
                  <th className="py-2">Trạng thái</th>
                  <th className="py-2">Lần cuối tương tác</th>
                  <th className="py-2">Assigned</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => {
                  const last = row.lastInteractionAt ? new Date(row.lastInteractionAt) : null;
                  const days = last ? Math.floor((now - last.getTime()) / (1000 * 60 * 60 * 24)) : null;
                  const stale = typeof days === "number" && days >= 30;

                  return (
                    <tr key={row.id} className={`border-t border-white/10 ${stale ? "bg-amber-500/10" : ""}`}>
                      <td className="py-2">
                        <input
                          type="checkbox"
                          checked={Boolean(selectedIds[row.id])}
                          onChange={(e) => setSelectedIds((prev) => ({ ...prev, [row.id]: e.target.checked }))}
                        />
                      </td>
                      <td className="py-2 font-semibold whitespace-nowrap">{row.customerCode}</td>
                      <td className="py-2">{row.customerName}</td>
                      <td className="py-2 whitespace-nowrap">{row.phoneNumber}</td>
                      <td className="py-2 whitespace-nowrap">{row.area}</td>
                      <td className="py-2 whitespace-nowrap">{row.callStatus}</td>
                      <td className="py-2 whitespace-nowrap">
                        {row.lastInteractionAt ? new Date(row.lastInteractionAt).toLocaleString("vi-VN") : "--"}
                      </td>
                      <td className="py-2 whitespace-nowrap">{row.assignedToName ?? "--"}</td>
                    </tr>
                  );
                })}

                {items.length === 0 && (
                  <tr>
                    <td className="py-3 opacity-70" colSpan={8}>
                      Không có dữ liệu.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className={`h-11 px-4 rounded-2xl border text-sm font-bold transition disabled:opacity-60 ${
                isDark ? "bg-white/10 border-white/10 hover:bg-white/15" : "bg-white/50 border-white/30 hover:bg-white/70"
              }`}
            >
              Prev
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className={`h-11 px-4 rounded-2xl border text-sm font-bold transition disabled:opacity-60 ${
                isDark ? "bg-white/10 border-white/10 hover:bg-white/15" : "bg-white/50 border-white/30 hover:bg-white/70"
              }`}
            >
              Next
            </button>
          </div>
          <div className={`text-xs ${isDark ? "text-slate-300" : "text-slate-600"}`}>
            Gợi ý: Trang này đang là UI/pagination. Bước tiếp theo: thêm API re-assign/auto-allocate theo địa bàn.
          </div>
        </div>

        {createOpen && (
          <div
            className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-10 md:pt-14 overflow-y-auto"
            role="dialog"
            aria-modal="true"
          >
            <div
              className="absolute inset-0 bg-black/40"
              onMouseDown={() => {
                setCreateOpen(false);
              }}
            />
            <div
              className={`relative w-full max-w-[720px] rounded-3xl border shadow-2xl backdrop-blur-2xl p-5 md:p-6 ${
                isDark ? "bg-slate-900/85 border-white/10 text-slate-100" : "bg-white/85 border-white/20 text-slate-900"
              }`}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xl font-black">Thêm khách hàng</div>
                  <div className={`mt-1 text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>Nhập thông tin và bấm Lưu để tạo mới.</div>
                </div>
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className={`h-10 w-10 rounded-2xl border inline-flex items-center justify-center transition ${
                    isDark ? "bg-white/10 border-white/10 hover:bg-white/15" : "bg-white/50 border-white/30 hover:bg-white/70"
                  }`}
                  title="Đóng"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className={`text-sm font-semibold ${isDark ? "text-slate-200" : "text-slate-700"}`}>Mã KH *</label>
                  <input
                    value={createForm.customerCode}
                    onChange={(e) => setCreateForm((p) => ({ ...p, customerCode: e.target.value }))}
                    className={`mt-1 h-11 w-full px-3 rounded-2xl border bg-white/20 backdrop-blur-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 ${
                      isDark ? "border-white/10 text-white placeholder:text-slate-400" : "border-white/20 text-slate-900 placeholder:text-slate-500"
                    }`}
                    placeholder="VD: KH0001"
                  />
                </div>

                <div>
                  <label className={`text-sm font-semibold ${isDark ? "text-slate-200" : "text-slate-700"}`}>SĐT *</label>
                  <input
                    value={createForm.phoneNumber}
                    onChange={(e) => setCreateForm((p) => ({ ...p, phoneNumber: e.target.value }))}
                    className={`mt-1 h-11 w-full px-3 rounded-2xl border bg-white/20 backdrop-blur-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 ${
                      isDark ? "border-white/10 text-white placeholder:text-slate-400" : "border-white/20 text-slate-900 placeholder:text-slate-500"
                    }`}
                    placeholder="VD: 090xxxxxxx"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className={`text-sm font-semibold ${isDark ? "text-slate-200" : "text-slate-700"}`}>Tên KH *</label>
                  <input
                    value={createForm.customerName}
                    onChange={(e) => setCreateForm((p) => ({ ...p, customerName: e.target.value }))}
                    className={`mt-1 h-11 w-full px-3 rounded-2xl border bg-white/20 backdrop-blur-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 ${
                      isDark ? "border-white/10 text-white placeholder:text-slate-400" : "border-white/20 text-slate-900 placeholder:text-slate-500"
                    }`}
                    placeholder="VD: Nguyễn Văn A"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className={`text-sm font-semibold ${isDark ? "text-slate-200" : "text-slate-700"}`}>Địa chỉ</label>
                  <input
                    value={createForm.address}
                    onChange={(e) => setCreateForm((p) => ({ ...p, address: e.target.value }))}
                    className={`mt-1 h-11 w-full px-3 rounded-2xl border bg-white/20 backdrop-blur-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 ${
                      isDark ? "border-white/10 text-white placeholder:text-slate-400" : "border-white/20 text-slate-900 placeholder:text-slate-500"
                    }`}
                    placeholder="VD: Hải Phòng"
                  />
                </div>

                <div>
                  <label className={`text-sm font-semibold ${isDark ? "text-slate-200" : "text-slate-700"}`}>Địa bàn</label>
                  <input
                    value={createForm.area}
                    onChange={(e) => setCreateForm((p) => ({ ...p, area: e.target.value }))}
                    className={`mt-1 h-11 w-full px-3 rounded-2xl border bg-white/20 backdrop-blur-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 ${
                      isDark ? "border-white/10 text-white placeholder:text-slate-400" : "border-white/20 text-slate-900 placeholder:text-slate-500"
                    }`}
                    placeholder="VD: Thủy Nguyên"
                  />
                </div>

                <div>
                  <label className={`text-sm font-semibold ${isDark ? "text-slate-200" : "text-slate-700"}`}>Mã nhóm</label>
                  <input
                    value={createForm.groupCode}
                    onChange={(e) => setCreateForm((p) => ({ ...p, groupCode: e.target.value }))}
                    className={`mt-1 h-11 w-full px-3 rounded-2xl border bg-white/20 backdrop-blur-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 ${
                      isDark ? "border-white/10 text-white placeholder:text-slate-400" : "border-white/20 text-slate-900 placeholder:text-slate-500"
                    }`}
                    placeholder="VD: N1"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className={`text-sm font-semibold ${isDark ? "text-slate-200" : "text-slate-700"}`}>Đối tác</label>
                  <input
                    value={createForm.partner}
                    onChange={(e) => setCreateForm((p) => ({ ...p, partner: e.target.value }))}
                    className={`mt-1 h-11 w-full px-3 rounded-2xl border bg-white/20 backdrop-blur-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 ${
                      isDark ? "border-white/10 text-white placeholder:text-slate-400" : "border-white/20 text-slate-900 placeholder:text-slate-500"
                    }`}
                    placeholder="VD: Partner A"
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={createSaving}
                  onClick={() => {
                    setCreateOpen(false);
                    resetCreateForm();
                  }}
                  className={`h-11 px-4 rounded-2xl border text-sm font-bold transition disabled:opacity-60 ${
                    isDark ? "bg-white/10 border-white/10 hover:bg-white/15" : "bg-white/50 border-white/30 hover:bg-white/70"
                  }`}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={createSaving}
                  onClick={submitCreateCustomer}
                  className={`h-11 px-4 rounded-2xl border text-sm font-bold transition disabled:opacity-60 ${
                    isDark ? "bg-emerald-500/20 border-emerald-500/30 hover:bg-emerald-500/25" : "bg-emerald-500/15 border-emerald-500/25 hover:bg-emerald-500/20"
                  }`}
                >
                  Lưu
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
