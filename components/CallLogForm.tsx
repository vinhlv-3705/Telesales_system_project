import { CalendarClock, Phone, Plus, Save, UserRound } from "lucide-react";

export interface CallFormData {
  customerName: string;
  phoneNumber: string;
  callStatus: "Chốt đơn" | "Từ chối" | "Mới" | "Upsale";
  revenue: string;
  callbackDate: string;
  note: string;
}

interface CallLogFormProps {
  formData: CallFormData;
  setFormData: (data: CallFormData) => void;
  onSubmit: () => void;
  isEditing?: boolean;
  isDark?: boolean;
}

export default function CallLogForm({ formData, setFormData, onSubmit, isEditing = false, isDark = false }: CallLogFormProps) {
  const disabled =
    !formData.customerName.trim() || !formData.phoneNumber.trim() || !formData.callbackDate || Number(formData.revenue) < 0;

  const inputClasses = `mt-1 block w-full h-11 px-3 rounded-lg border backdrop-blur-md shadow-sm focus:ring-2 transition-all ${
    isDark
      ? "border-slate-600 bg-slate-900/35 text-slate-100 placeholder-slate-400 focus:ring-sky-400"
      : "border-white/50 bg-white/30 text-slate-900 placeholder-slate-500 focus:ring-indigo-400"
  }`;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={`text-sm font-semibold ${isDark ? "text-slate-300" : "text-slate-700"}`}>Tên khách hàng</label>
          <div className="relative">
            <UserRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={formData.customerName}
              onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
              className={`${inputClasses} pl-10`}
              placeholder="Nhập tên khách hàng"
            />
          </div>
        </div>
        <div>
          <label className={`text-sm font-semibold ${isDark ? "text-slate-300" : "text-slate-700"}`}>Số điện thoại</label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              className={`${inputClasses} pl-10`}
              placeholder="Ví dụ: 0901234567"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={`text-sm font-semibold ${isDark ? "text-slate-300" : "text-slate-700"}`}>Trạng thái cuộc gọi</label>
          <select
            value={formData.callStatus}
            onChange={(e) => setFormData({ ...formData, callStatus: e.target.value as CallFormData["callStatus"] })}
            className={inputClasses}
          >
            <option>Chốt đơn</option>
            <option>Từ chối</option>
            <option>Mới</option>
            <option>Upsale</option>
          </select>
        </div>
        <div>
          <label className={`text-sm font-semibold ${isDark ? "text-slate-300" : "text-slate-700"}`}>Doanh thu</label>
          <input
            type="number"
            value={formData.revenue}
            onChange={(e) => setFormData({ ...formData, revenue: e.target.value })}
            className={inputClasses}
            placeholder="Nhập doanh thu cuộc gọi"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={`text-sm font-semibold ${isDark ? "text-slate-300" : "text-slate-700"}`}>Ngày hẹn lại</label>
          <div className="relative">
            <CalendarClock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="date"
              value={formData.callbackDate}
              onChange={(e) => setFormData({ ...formData, callbackDate: e.target.value })}
              className={`${inputClasses} pl-10`}
            />
          </div>
        </div>
        <div>
          <label className={`text-sm font-semibold ${isDark ? "text-slate-300" : "text-slate-700"}`}>Ghi chú</label>
          <input
            value={formData.note}
            onChange={(e) => setFormData({ ...formData, note: e.target.value })}
            className={inputClasses}
            placeholder="Nội dung trao đổi"
          />
        </div>
      </div>

      <button
        onClick={onSubmit}
        disabled={disabled}
        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-4 rounded-lg hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 flex items-center justify-center disabled:bg-slate-400 disabled:cursor-not-allowed shadow-lg transition-all"
      >
        {isEditing ? <Save className="h-5 w-5 mr-2" /> : <Plus className="h-5 w-5 mr-2" />}
        {isEditing ? "Cập nhật cuộc gọi" : "Lưu nhật ký cuộc gọi"}
      </button>
    </div>
  );
}
