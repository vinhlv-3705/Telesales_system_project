'use client';

import { motion } from 'framer-motion';
import { CustomerCallLog } from './CustomerList';
import { PhoneOff, Phone } from 'lucide-react';

interface CurrentlyCallingProps {
  customer: CustomerCallLog | null;
  isDark?: boolean;
}

export default function CurrentlyCalling({ customer, isDark = false }: CurrentlyCallingProps) {
  if (!customer) {
    return (
      <div
        className={`backdrop-blur-xl p-8 rounded-2xl border text-center h-full flex items-center justify-center ${
          isDark
            ? 'bg-slate-900/45 border-slate-700/60'
            : 'bg-white/40 border-white/60'
        }`}
      >
        <div>
          <p className={`text-2xl font-bold mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            📞
          </p>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Không có cuộc gọi nào đang hoạt động
          </p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`backdrop-blur-xl p-6 rounded-2xl border ${
        isDark
          ? 'bg-gradient-to-br from-blue-900/40 to-slate-900/45 border-blue-700/60'
          : 'bg-gradient-to-br from-blue-100/60 to-white/40 border-blue-300/60'
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-lg font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
          Đang gọi
        </h3>
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
          className={`px-3 py-1 rounded-full text-xs font-semibold ${
            isDark
              ? 'bg-emerald-900/60 text-emerald-200'
              : 'bg-emerald-100 text-emerald-700'
          }`}
        >
          Đang hoạt động
        </motion.div>
      </div>

      <div className="space-y-3">
        <div>
          <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Tên khách hàng</p>
          <p className={`text-xl font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
            {customer.customerName}
          </p>
        </div>

        <div>
          <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Số điện thoại</p>
          <p className={`text-lg font-semibold font-mono ${isDark ? 'text-sky-300' : 'text-blue-600'}`}>
            {customer.phoneNumber}
          </p>
        </div>

        {customer.note && (
          <div>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Ghi chú trước</p>
            <p className={`text-sm italic ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              "{customer.note}"
            </p>
          </div>
        )}

        <div className="pt-4 flex gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`flex-1 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${
              isDark
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-emerald-500 hover:bg-emerald-600 text-white'
            }`}
          >
            <Phone className="h-4 w-4" />
            Tiếp tục
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`flex-1 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${
              isDark
                ? 'bg-red-700/60 hover:bg-red-600 text-white border border-red-600/60'
                : 'bg-red-500/20 hover:bg-red-500/30 text-red-700 border border-red-300'
            }`}
          >
            <PhoneOff className="h-4 w-4" />
            Kết thúc
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
