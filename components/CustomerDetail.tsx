'use client';

import { motion } from 'framer-motion';
import { CustomerCallLog } from './CustomerList';
import { Edit, Trash2 } from 'lucide-react';

interface CustomerDetailProps {
  customer: CustomerCallLog | null;
  callHistory: CustomerCallLog[];
  onEdit: (customer: CustomerCallLog) => void;
  onDelete: (id: string) => void;
  isDark?: boolean;
}

const getStatusColor = (status: string, isDark: boolean) => {
  const colorMap: Record<string, { bg: string; text: string }> = {
    'Chốt đơn': {
      bg: isDark ? 'bg-emerald-900/40' : 'bg-emerald-100',
      text: isDark ? 'text-emerald-200' : 'text-emerald-700',
    },
    'Từ chối': {
      bg: isDark ? 'bg-rose-900/40' : 'bg-rose-100',
      text: isDark ? 'text-rose-200' : 'text-rose-700',
    },
    'Upsale': {
      bg: isDark ? 'bg-purple-900/40' : 'bg-purple-100',
      text: isDark ? 'text-purple-200' : 'text-purple-700',
    },
    'Mới': {
      bg: isDark ? 'bg-slate-700/40' : 'bg-slate-200',
      text: isDark ? 'text-slate-300' : 'text-slate-700',
    },
  };
  return colorMap[status] || colorMap['Mới'];
};

export default function CustomerDetail({
  customer,
  callHistory,
  onEdit,
  onDelete,
  isDark = false,
}: CustomerDetailProps) {
  if (!customer) {
    return (
      <div
        className={`backdrop-blur-xl p-8 rounded-2xl border text-center ${
          isDark
            ? 'bg-slate-900/45 border-slate-700/60'
            : 'bg-white/40 border-white/60'
        }`}
      >
        <p className={isDark ? 'text-slate-400' : 'text-slate-600'}>
          Chọn khách hàng để xem chi tiết
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`backdrop-blur-xl rounded-2xl border overflow-hidden ${
        isDark
          ? 'bg-slate-900/45 border-slate-700/60 shadow-[0_12px_35px_rgba(2,6,23,0.55)]'
          : 'bg-white/40 border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)]'
      }`}
    >
      {/* Header - Customer Info */}
      <div
        className={`p-6 border-b ${
          isDark ? 'bg-blue-900/30 border-slate-700/60' : 'bg-blue-100/40 border-white/60'
        }`}
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className={`text-xl font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              {customer.customerName}
            </h3>
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              {customer.phoneNumber}
            </p>
          </div>

          <div
            className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-semibold ${
              getStatusColor(customer.callStatus, isDark).bg
            } ${getStatusColor(customer.callStatus, isDark).text}`}
          >
            {customer.callStatus}
          </div>
        </div>

        {customer.note && (
          <p
            className={`text-sm mb-4 p-3 rounded-lg ${
              isDark
                ? 'bg-slate-800/50 text-slate-300'
                : 'bg-white/40 text-slate-700'
            }`}
          >
            <span className="font-semibold">Ghi chú: </span>
            {customer.note}
          </p>
        )}

        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onEdit(customer)}
            className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
              isDark
                ? 'bg-blue-600 hover:bg-blue-500 text-white'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            <Edit className="h-3 w-3" />
            Sửa
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onDelete(customer.id)}
            className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
              isDark
                ? 'bg-red-700/60 hover:bg-red-600/80 text-white'
                : 'bg-red-500 hover:bg-red-600 text-white'
            }`}
          >
            <Trash2 className="h-3 w-3" />
            Xóa
          </motion.button>
        </div>
      </div>

      {/* Call History */}
      <div className="p-6">
        <h4 className={`text-lg font-semibold mb-4 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
          Lịch sử cuộc gọi ({callHistory.length})
        </h4>

        {callHistory.length === 0 ? (
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Không có lịch sử cuộc gọi nào
          </p>
        ) : (
          <div className="space-y-3 max-h-48 overflow-y-auto">
            {callHistory.map((log, idx) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.05 }}
                className={`p-3 rounded-lg border ${
                  isDark
                    ? 'bg-slate-800/30 border-slate-700/40'
                    : 'bg-slate-100/40 border-slate-300/40'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1">
                    <p className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      {new Date(log.callbackDate).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded ${
                      getStatusColor(log.callStatus, isDark).bg
                    } ${getStatusColor(log.callStatus, isDark).text}`}
                  >
                    {log.callStatus}
                  </span>
                </div>
                {log.note && (
                  <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    {log.note}
                  </p>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
