import { Edit, Trash2 } from "lucide-react";
import { motion } from "framer-motion";

export interface CustomerCallLog {
  id: string;
  customerName: string;
  phoneNumber: string;
  callStatus: "Chốt đơn" | "Từ chối" | "Mới" | "Upsale";
  callbackDate: string;
  note: string;
}

interface CustomerListProps {
  customers: CustomerCallLog[];
  onDelete: (id: string) => void;
  onEdit: (callLog: CustomerCallLog) => void;
  isDark?: boolean;
}

const getReminderStatus = (callbackDate: string) => {
  const now = new Date();
  const target = new Date(callbackDate);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const callDay = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();

  if (callDay < today) return { label: "Quá hạn", classes: "bg-rose-100 text-rose-700" };
  if (callDay === today) return { label: "Nhắc hôm nay", classes: "bg-amber-100 text-amber-700" };
  return { label: "Đã hẹn", classes: "bg-emerald-100 text-emerald-700" };
};

export default function CustomerList({ customers, onDelete, onEdit, isDark = false }: CustomerListProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.6 }}
      className={`backdrop-blur-xl p-8 rounded-2xl border mt-8 ${
        isDark
          ? "bg-slate-900/45 border-slate-700/60 shadow-[0_12px_35px_rgba(2,6,23,0.55)]"
          : "bg-white/40 border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
      }`}
    >
      <div className="mb-6">
        <h2 className={`text-2xl font-bold ${isDark ? "text-slate-100" : "text-[#1e293b]"}`}>Danh sách khách hàng</h2>
        <div
          className={`w-12 h-1 mt-2 rounded-full ${
            isDark ? "bg-gradient-to-r from-sky-400 to-blue-500" : "bg-gradient-to-r from-blue-500 to-cyan-500"
          }`}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px]">
          <thead>
            <tr className={`text-left text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>
              <th className="pb-3 font-semibold">Tên KH</th>
              <th className="pb-3 font-semibold">SĐT</th>
              <th className="pb-3 font-semibold">Trạng thái nhắc hẹn</th>
              <th className="pb-3 font-semibold text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="space-y-3">
            {customers.map((customer, index) => {
              const reminder = getReminderStatus(customer.callbackDate);
              return (
                <motion.tr
                  key={customer.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.06 }}
                  className={`border-t ${isDark ? "border-slate-700/60" : "border-white/50"}`}
                >
                  <td className={`py-4 font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{customer.customerName}</td>
                  <td className={`py-4 ${isDark ? "text-slate-300" : "text-slate-700"}`}>{customer.phoneNumber}</td>
                  <td className="py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${reminder.classes}`}>
                      {reminder.label}
                    </span>
                  </td>
                  <td className="py-4">
                    <div className="flex justify-end items-center gap-2">
                      <button
                        onClick={() => onEdit(customer)}
                        className="p-2 rounded-lg text-blue-500 hover:text-blue-700 hover:bg-blue-50 transition-all"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onDelete(customer.id)}
                        className="p-2 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition-all"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
