import { Clock3, AlertTriangle, Pencil, User, Check, X, Save, LoaderCircle } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";

export interface CustomerCallLog {
  id: string;
  customerCode: string;
  customerName: string;
  phoneNumber: string;
  address: string;
  area: string;
  groupCode: string;
  partner: string;
  callStatus: "Chốt đơn" | "Từ chối" | "Mới" | "Upsell" | "Hẹn gọi lại";
  callbackDate: string;
  callbackTime?: string;
  note: string;
  birthday?: string;
  contractSignedAt?: string;
  lastOrderAt?: string;
  productsPurchased?: string;
  timestamp?: string;
  zaloConnected?: boolean;
  lastInteractionAt?: string;
  assignedToName?: string;
}

interface CustomerListProps {
  customers: CustomerCallLog[];
  onCall: (callLog: CustomerCallLog) => void;
  activeCustomerId?: string;
  isDark?: boolean;
  showCallbackSchedule?: boolean;
  onSaveQuickEdit?: (id: string, data: { callbackDate: string; note: string }) => Promise<void>;
}

export default function CustomerList({ customers, onCall, activeCustomerId, isDark = false, showCallbackSchedule = false, onSaveQuickEdit }: CustomerListProps) {
  const [now, setNow] = useState(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editNote, setEditNote] = useState("");
  const [isSavingInline, setIsSavingInline] = useState(false);

  // ITEM_HEIGHT được điều chỉnh để các block khít nhau hơn (giống tab Lịch sử cuộc gọi).
  // Tab Hẹn gọi lại: 175px (đủ cho thông tin và ô nhập liệu ghi chú).
  // Các tab khác: 145px.
  // Khoảng cách mb-3 (12px) tạo ra khe hở đồng nhất.
  const ITEM_HEIGHT = showCallbackSchedule ? 175 : 145;
  const OVERSCAN = 6;

  useEffect(() => {
    const timeout = setTimeout(() => setNow(Date.now()), 0);
    const interval = setInterval(() => setNow(Date.now()), 60_000);
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    const updateSize = () => setViewportHeight(element.clientHeight);
    updateSize();

    const observer = new ResizeObserver(() => updateSize());
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const { startIndex, endIndex, totalHeight } = useMemo(() => {
    const total = customers.length * ITEM_HEIGHT;
    if (viewportHeight <= 0) {
      return { startIndex: 0, endIndex: Math.min(customers.length, 20), totalHeight: total };
    }

    const start = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - OVERSCAN);
    const visibleCount = Math.ceil(viewportHeight / ITEM_HEIGHT) + OVERSCAN * 2;
    const end = Math.min(customers.length, start + visibleCount);
    return { startIndex: start, endIndex: end, totalHeight: total };
  }, [customers.length, scrollTop, viewportHeight, ITEM_HEIGHT]);

  const visibleCustomers = useMemo(() => customers.slice(startIndex, endIndex), [customers, startIndex, endIndex]);

  const handleStartEdit = (e: React.MouseEvent, customer: CustomerCallLog) => {
    e.stopPropagation();
    setEditingId(customer.id);
    setEditDate(customer.callbackDate || "");
    setEditNote(customer.note || "");
  };

  const handleCancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  const handleSaveInline = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!onSaveQuickEdit) return;
    setIsSavingInline(true);
    await onSaveQuickEdit(id, { callbackDate: editDate, note: editNote });
    setIsSavingInline(false);
    setEditingId(null);
  };

  return (
    <div
      className={`ui-card p-5 h-full ${isDark ? "text-slate-100" : "text-slate-900"}`}
    >
      <div className="mb-3">
        <h2 className={`text-lg font-bold ${isDark ? "text-slate-100" : "text-[#1e293b]"}`}>Customer Queue</h2>
      </div>
      <div
        ref={scrollRef}
        className="h-[calc(100%-36px)] overflow-y-auto ui-scrollbar pr-1"
        onScroll={(event) => {
          setScrollTop((event.currentTarget as HTMLDivElement).scrollTop);
        }}
      >
        <div className="relative" style={{ height: totalHeight }}>
          {visibleCustomers.map((customer, localIndex) => {
            const index = startIndex + localIndex;
            
            // Cải tiến logic tính toán: Nếu không có giờ, mặc định là 09:00 sáng
            const callbackTimeStr = (customer.callbackTime || "").trim() || "09:00";
            const callbackEpoch = customer.callbackDate
              ? new Date(`${customer.callbackDate}T${callbackTimeStr}`).getTime()
              : null;

            const isEditing = editingId === customer.id;

            const isOverdue = 
              !isEditing &&
              customer.callStatus === "Hẹn gọi lại" && 
              callbackEpoch !== null && 
              callbackEpoch < now;

            return (
              <motion.div
                key={customer.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  borderColor: isOverdue 
                    ? ["rgba(244, 63, 94, 0.4)", "rgba(244, 63, 94, 0.9)", "rgba(244, 63, 94, 0.4)"] 
                    : (customer.id === activeCustomerId 
                        ? (isDark ? "rgba(56, 189, 248, 0.4)" : "rgba(203, 213, 225, 1)")
                        : (isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(226, 232, 240, 1)")),
                  backgroundColor: isOverdue 
                    ? (isDark 
                        ? ["rgba(244, 63, 94, 0.08)", "rgba(244, 63, 94, 0.18)", "rgba(244, 63, 94, 0.08)"]
                        : ["rgba(255, 241, 242, 0.7)", "rgba(255, 228, 230, 1)", "rgba(255, 241, 242, 0.7)"])
                    : (customer.id === activeCustomerId
                        ? (isDark ? "rgba(14, 165, 233, 0.15)" : "rgba(239, 246, 255, 1)")
                        : (isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(255, 255, 255, 1)")),
                }}
                transition={{
                  opacity: { duration: 0.2 },
                  y: { duration: 0.2 },
                  borderColor: isOverdue ? { duration: 1.5, repeat: Infinity, ease: "easeInOut" } : { duration: 0.3 },
                  backgroundColor: isOverdue ? { duration: 1.5, repeat: Infinity, ease: "easeInOut" } : { duration: 0.3 },
                }}
                onClick={() => {
                  const selectedText = typeof window !== "undefined" ? window.getSelection()?.toString() : "";
                  if (selectedText && selectedText.trim().length > 0) return;
                  onCall(customer);
                }}
                role="button"
                tabIndex={0}
                style={{ position: "absolute", top: index * ITEM_HEIGHT, left: 0, right: 0 }}
                className={`w-full text-left rounded-2xl border border-b p-3 mb-3 transition-all cursor-pointer select-text ${
                  customer.id === activeCustomerId
                    ? isDark
                      ? "bg-sky-500/15 border-sky-300/40 shadow-[0_14px_35px_rgba(56,189,248,0.20)]"
                      : "bg-blue-50 border-slate-200 border-l-4 border-l-blue-600 shadow-[0_14px_35px_rgba(2,132,199,0.14)]"
                    : isOverdue
                      ? isDark ? "bg-rose-500/10 border-rose-500/40" : "bg-rose-50 border-rose-200 shadow-sm"
                      : isDark
                        ? "bg-white/5 border-white/10 hover:bg-white/10"
                        : "bg-white border-slate-200 shadow-sm hover:shadow hover:bg-slate-50"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className={`text-xs font-bold tracking-wide ${isDark ? "text-sky-200" : "text-blue-700"}`}>
                      {customer.customerCode}
                    </div>
                  </div>
                  {isOverdue && (
                    <div className="flex items-center gap-1 bg-rose-500 text-white px-2 py-0.5 rounded-full text-[10px] font-black animate-pulse">
                      <AlertTriangle className="h-3 w-3" />
                      QUÁ HẠN
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 shrink-0 z-10">
                    {showCallbackSchedule && onSaveQuickEdit && (
                      !isEditing ? (
                        <button
                          type="button"
                          onClick={(e) => handleStartEdit(e, customer)}
                          className={`inline-flex items-center justify-center rounded-xl h-8 w-8 border shadow-sm transition ${
                            isDark
                              ? "bg-amber-500/15 border-amber-400/25 text-amber-200 hover:bg-amber-500/20"
                              : "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
                          }`}
                          title="Sửa nhanh lịch hẹn"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      ) : (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={isSavingInline}
                            onClick={(e) => handleSaveInline(e, customer.id)}
                            className={`inline-flex items-center justify-center rounded-xl h-8 w-8 border shadow-sm transition bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50`}
                          >
                            {isSavingInline ? (
                              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Check className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            disabled={isSavingInline}
                            onClick={handleCancelEdit}
                            className={`inline-flex items-center justify-center rounded-xl h-8 w-8 border shadow-sm transition ${
                              isDark
                                ? "bg-white/10 border-white/10 text-slate-300"
                                : "bg-white border-slate-200 text-slate-500"
                            }`}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )
                    )}
                    {/* Nút Call đã được loại bỏ theo yêu cầu */}
                  </div>
                </div>

                <div className="mt-1">
                  <div className={`font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{customer.customerName}</div>
                  {showCallbackSchedule && customer.callbackTime && (
                    <div
                      className={`text-xs mt-0.5 inline-flex items-center gap-1 ${
                        isOverdue
                          ? "text-rose-500"
                          : isDark
                            ? "text-amber-300"
                            : "text-amber-700"
                      }`}
                      title={isOverdue ? "Đã quá giờ hẹn gọi lại" : "Lịch hẹn gọi lại"}
                    >
                      <Clock3 className={`h-3.5 w-3.5 ${isOverdue ? "animate-pulse" : ""}`} />
                      {customer.callbackDate} {customer.callbackTime}
                    </div>
                  )}
                </div>
                <div className={`text-xs mt-1.5 space-y-0.5 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                  <div><span className="font-semibold">SĐT:</span> {customer.phoneNumber || "--"}</div>
                  {showCallbackSchedule && (
                    <>
                      <div className="flex items-center gap-1">
                        <Clock3 className="h-3 w-3 text-amber-500" />
                        <span className="font-semibold text-amber-500">Hẹn lại:</span> 
                        {!isEditing ? (
                          <span>{customer.callbackDate || "--"}</span>
                        ) : (
                          <input 
                            type="date" 
                            value={editDate}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => setEditDate(e.target.value)}
                            className={`h-6 px-1 rounded border text-[11px] outline-none ${isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-300'}`}
                          />
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3 text-blue-500" />
                        <span className="font-bold text-blue-500">Người thực hiện:</span>
                        <span className="truncate font-medium">{customer.assignedToName || "Chưa xử lý"}</span>
                      </div>
                      {isEditing && (
                        <div className="flex items-center gap-1 mt-1">
                          <Pencil className="h-3 w-3 text-slate-400" />
                          <span className="font-semibold text-slate-400">Ghi chú:</span>
                          <input 
                            type="text" 
                            value={editNote}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => setEditNote(e.target.value)}
                            className={`flex-1 h-6 px-1 rounded border text-[11px] outline-none ${isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-300'}`}
                          />
                        </div>
                      )}
                    </>
                  )}
                  <div><span className="font-semibold">Khu vực:</span> {customer.area || "--"}</div>
                  <div><span className="font-semibold">Địa chỉ:</span> {customer.address || "--"}</div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
