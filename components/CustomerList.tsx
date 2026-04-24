import { Clock3, PhoneCall } from "lucide-react";
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
}

interface CustomerListProps {
  customers: CustomerCallLog[];
  onCall: (callLog: CustomerCallLog) => void;
  activeCustomerId?: string;
  isDark?: boolean;
  showCallbackSchedule?: boolean;
}

export default function CustomerList({ customers, onCall, activeCustomerId, isDark = false, showCallbackSchedule = false }: CustomerListProps) {
  const [now, setNow] = useState(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);

  const ITEM_HEIGHT = 220;
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
  }, [customers.length, scrollTop, viewportHeight]);

  const visibleCustomers = useMemo(() => customers.slice(startIndex, endIndex), [customers, startIndex, endIndex]);

  return (
    <div
      className={`backdrop-blur-2xl p-5 rounded-3xl border h-full shadow-2xl ${
        isDark
          ? "bg-slate-900/60 border-white/10"
          : "bg-white/60 border-white/20"
      }`}
    >
      <div className="mb-3">
        <h2 className={`text-lg font-bold ${isDark ? "text-slate-100" : "text-[#1e293b]"}`}>Customer Queue</h2>
      </div>
      <div
        ref={scrollRef}
        className="h-[calc(100%-36px)] overflow-y-auto pr-1"
        onScroll={(event) => {
          setScrollTop((event.currentTarget as HTMLDivElement).scrollTop);
        }}
      >
        <div className="relative" style={{ height: totalHeight }}>
          {visibleCustomers.map((customer, localIndex) => {
            const index = startIndex + localIndex;
            const callbackEpoch = customer.callbackDate && customer.callbackTime
              ? new Date(`${customer.callbackDate}T${customer.callbackTime}`).getTime()
              : null;
            const isOverdue =
              customer.callStatus === "Hẹn gọi lại" &&
              typeof callbackEpoch === "number" &&
              callbackEpoch < now;

            return (
              <motion.div
                key={customer.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.12 }}
                onClick={() => {
                  const selectedText = typeof window !== "undefined" ? window.getSelection()?.toString() : "";
                  if (selectedText && selectedText.trim().length > 0) return;
                  onCall(customer);
                }}
                role="button"
                tabIndex={0}
                style={{ position: "absolute", top: index * ITEM_HEIGHT, left: 0, right: 0 }}
                className={`w-full text-left rounded-2xl border p-4 transition-all cursor-pointer select-text ${
                  customer.id === activeCustomerId
                    ? isDark
                      ? "bg-sky-500/15 border-sky-300/40 shadow-[0_14px_35px_rgba(56,189,248,0.20)]"
                      : "bg-sky-50/70 border-sky-300/60 shadow-[0_14px_35px_rgba(2,132,199,0.14)]"
                    : isDark
                      ? "bg-white/5 border-white/10 hover:bg-white/10"
                      : "bg-white/35 border-white/20 hover:bg-white/55"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className={`text-xs font-bold tracking-wide ${isDark ? "text-sky-200" : "text-blue-700"}`}>
                      {customer.customerCode}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onCall(customer);
                    }}
                    className={`shrink-0 z-10 inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-[11px] font-bold border shadow-sm transition ${
                      isDark
                        ? "bg-white/10 border-white/15 text-slate-100 hover:bg-white/15"
                        : "bg-white/50 border-white/40 text-slate-700 hover:bg-white/70"
                    }`}
                    title="Gọi khách hàng"
                  >
                    <PhoneCall className="h-3.5 w-3.5" />
                    <span>Call</span>
                  </button>
                </div>

                <div className="mt-1">
                  <div className={`font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{customer.customerName}</div>
                  {showCallbackSchedule && customer.callbackTime && (
                    <div
                      className={`text-xs mt-1 inline-flex items-center gap-1 ${
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
                <div className={`text-xs mt-2 space-y-1 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                  <div><span className="font-semibold">SĐT:</span> {customer.phoneNumber || "--"}</div>
                  <div><span className="font-semibold">Địa chỉ:</span> {customer.address || "--"}</div>
                  <div><span className="font-semibold">Địa bàn:</span> {customer.area || "--"}</div>
                  <div><span className="font-semibold">Mã nhóm:</span> {customer.groupCode || "--"}</div>
                  <div><span className="font-semibold">Đối tác:</span> {customer.partner || "--"}</div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
