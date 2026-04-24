import { ArrowUpRight, CalendarClock, CheckCircle2, Clock3, LoaderCircle, Plus, Repeat, Save, XCircle } from "lucide-react";

export interface CallFormData {
  customerName: string;
  phoneNumber: string;
  callStatus: '' | "Chốt đơn" | "Từ chối" | "Upsell" | "Hẹn gọi lại" | "Mới";
  revenue: string;
  callbackDate: string;
  callbackTime: string;
  assignedTo: string;
  note: string;
}

interface CallLogFormProps {
  formData: CallFormData;
  setFormData: (data: CallFormData) => void;
  onSubmit: () => void;
  onValidationError?: (message: string) => void;
  isEditing?: boolean;
  isDark?: boolean;
  compact?: boolean;
  isSaving?: boolean;
  saveSucceeded?: boolean;
}

export default function CallLogForm({
  formData,
  setFormData,
  onSubmit,
  onValidationError,
  isEditing = false,
  isDark = false,
  compact = false,
  isSaving = false,
  saveSucceeded = false,
}: CallLogFormProps) {
  const isCallbackStatus = formData.callStatus === "Hẹn gọi lại";
  const showsRevenue = formData.callStatus === "Chốt đơn" || formData.callStatus === "Upsell";
  const isOutcomeSelected = formData.callStatus && formData.callStatus !== "Mới";

  const attemptedSubmit = (formData as unknown as { __attemptedSubmit?: boolean }).__attemptedSubmit === true;

  const outcomeError = attemptedSubmit && !isOutcomeSelected;
  const callbackError = attemptedSubmit && isCallbackStatus && (!formData.callbackDate || !formData.callbackTime);
  const noteError = attemptedSubmit && !formData.note.trim();
  const revenueValue = Number((formData.revenue || "0").replace(/\./g, ""));
  const revenueError = attemptedSubmit && showsRevenue && (formData.revenue.trim() === "" || revenueValue < 0);

  const inputClasses = `mt-1 block w-full h-11 px-3 rounded-2xl border bg-white/20 text-sm shadow-sm backdrop-blur-2xl transition focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 ${
    isDark ? "border-white/10 text-white placeholder-slate-400" : "border-white/20 text-slate-900 placeholder-slate-500"
  }`;

  const inputErrorClasses = "border-rose-400/70 focus:ring-rose-400";

  const validateAndSubmit = () => {
    const validOutcomes = ["Chốt đơn", "Từ chối", "Upsell", "Hẹn gọi lại"] as const;

    setFormData({
      ...formData,
      __attemptedSubmit: true as unknown as never,
    } as unknown as CallFormData);

    if (!validOutcomes.includes(formData.callStatus as (typeof validOutcomes)[number])) {
      onValidationError?.("Vui lòng chọn Kết quả cuộc gọi trước khi lưu.");
      return;
    }

    if (!formData.note.trim()) {
      onValidationError?.("Vui lòng nhập Ghi chú trước khi lưu.");
      return;
    }

    if (showsRevenue && (formData.revenue.trim() === "" || revenueValue < 0)) {
      onValidationError?.("Vui lòng nhập Doanh thu hợp lệ cho Success/UpSale.");
      return;
    }

    if (isCallbackStatus && (!formData.callbackDate || !formData.callbackTime)) {
      onValidationError?.("Vui lòng chọn đầy đủ ngày và giờ hẹn gọi lại.");
      return;
    }

    onSubmit();
  };

  const statusButtons = [
    {
      label: "Success",
      value: "Chốt đơn" as CallFormData["callStatus"],
      icon: CheckCircle2,
      classes: "from-emerald-600 to-green-600",
    },
    {
      label: "Rejected",
      value: "Từ chối" as CallFormData["callStatus"],
      icon: XCircle,
      classes: "from-rose-600 to-red-600",
    },
    {
      label: "Upsale",
      value: "Upsell" as CallFormData["callStatus"],
      icon: ArrowUpRight,
      classes: "from-violet-600 to-purple-600",
    },
    {
      label: "CallBack",
      value: "Hẹn gọi lại" as CallFormData["callStatus"],
      icon: Repeat,
      classes: "from-amber-600 to-orange-600",
    },
  ];

  const formatCurrency = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (!digits) return "";
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      <div>
        <label className={`text-sm font-semibold ${isDark ? "text-slate-200" : "text-slate-700"}`}>
          Kết quả cuộc gọi
          <span className="text-rose-500">*</span>
        </label>
        <div
          className={`mt-3 flex items-stretch gap-2 ${outcomeError ? "ring-1 ring-rose-400/70 rounded-2xl p-1" : ""}`}
        >
          {statusButtons.map((status) => {
            const Icon = status.icon;
            const selected = formData.callStatus === status.value;
            return (
              <button
                key={status.value}
                type="button"
                onClick={() =>
                  setFormData({
                    ...formData,
                    callStatus: status.value,
                    revenue: status.value === "Từ chối" ? "0" : formData.revenue,
                    callbackTime: status.value === "Hẹn gọi lại" ? formData.callbackTime : "",
                  })
                }
                aria-pressed={selected}
                title={status.label}
                className={`h-10 flex-1 rounded-2xl border px-2 text-[11px] font-semibold transition-all flex items-center justify-center gap-1 min-w-0 ${
                  selected
                    ? `bg-linear-to-r ${status.classes} text-white shadow-[0_12px_30px_rgba(0,0,0,0.18)] border-transparent ring-2 ring-white/40`
                    : `bg-white/20 ${isDark ? "text-slate-100 bg-white/10 border-white/10" : "text-slate-700 border-white/20"} hover:bg-white/30`
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{status.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        {!isCallbackStatus && (
          <div>
            <label className={`text-sm font-semibold ${isDark ? "text-slate-200" : "text-slate-700"}`}>Trạng thái chi tiết</label>
            <input value={formData.callStatus || "Chưa chọn"} readOnly className={inputClasses} />
          </div>
        )}

        {!isCallbackStatus && showsRevenue && (
          <div>
            <label className={`text-sm font-semibold ${isDark ? "text-slate-200" : "text-slate-700"}`}>
              Doanh thu
              <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={formData.revenue}
              onChange={(e) => setFormData({ ...formData, revenue: formatCurrency(e.target.value) })}
              className={`${inputClasses} ${revenueError ? inputErrorClasses : ""}`}
              placeholder="VD: 1.000.000"
            />
          </div>
        )}

        {isCallbackStatus && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={`text-sm font-semibold ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                Ngày hẹn lại
                <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <CalendarClock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="date"
                  value={formData.callbackDate}
                  onChange={(e) => setFormData({ ...formData, callbackDate: e.target.value })}
                  className={`${inputClasses} pl-10 ${callbackError ? inputErrorClasses : ""}`}
                />
              </div>
            </div>
            <div>
              <label className={`text-sm font-semibold ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                Giờ hẹn lại
                <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Clock3 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="time"
                  value={formData.callbackTime}
                  onChange={(e) => setFormData({ ...formData, callbackTime: e.target.value })}
                  className={`${inputClasses} pl-10 ${callbackError ? inputErrorClasses : ""}`}
                />
              </div>
            </div>
          </div>
        )}

        <div>
          <label className={`text-sm font-semibold ${isDark ? "text-slate-200" : "text-slate-700"}`}>
            Tên người phụ trách
            <span className="text-rose-500">*</span>
          </label>
          <input
            value={formData.assignedTo}
            readOnly
            className={inputClasses}
            placeholder="Tự động điền theo user đăng nhập"
          />
        </div>

        <div>
          <label className={`text-sm font-semibold ${isDark ? "text-slate-200" : "text-slate-700"}`}>
            Ghi chú
            <span className="text-rose-500">*</span>
          </label>
          <textarea
            rows={3}
            value={formData.note}
            onChange={(e) => setFormData({ ...formData, note: e.target.value })}
            className={`${inputClasses} min-h-24 resize-none py-2 ${noteError ? inputErrorClasses : ""}`}
            placeholder="Nội dung trao đổi"
          />
        </div>
      </div>

      <button
        onClick={validateAndSubmit}
        disabled={isSaving}
        className={`w-full bg-linear-to-r from-indigo-600 to-purple-600 text-white ${compact ? "py-2.5" : "py-3"} px-4 rounded-2xl hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-0 flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed shadow-[0_16px_40px_rgba(99,102,241,0.35)] transition-all`}
      >
        {isSaving ? (
          <LoaderCircle className="h-5 w-5 mr-2 animate-spin" />
        ) : saveSucceeded ? (
          <CheckCircle2 className="h-5 w-5 mr-2" />
        ) : isEditing ? (
          <Save className="h-5 w-5 mr-2" />
        ) : (
          <Plus className="h-5 w-5 mr-2" />
        )}
        {isSaving ? "Đang lưu..." : isEditing ? "Cập nhật cuộc gọi" : "Lưu nhật ký cuộc gọi"}
      </button>
    </div>
  );
}
