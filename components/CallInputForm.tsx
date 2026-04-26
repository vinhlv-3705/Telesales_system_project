'use client';

import { motion } from 'framer-motion';
import { CallFormData } from './CallLogForm';

interface CallInputFormProps {
  formData: CallFormData;
  setFormData: (data: CallFormData) => void;
  onSubmit: () => void;
  isDark?: boolean;
}

export default function CallInputForm({
  formData,
  setFormData,
  onSubmit,
  isDark = false,
}: CallInputFormProps) {
  const callStatuses: Array<Exclude<CallFormData["callStatus"], "">> = [
    "Chốt đơn",
    "Từ chối",
    "Mới",
    "Upsell",
    "Hẹn gọi lại",
  ];

  return (
    <div className="space-y-4">
      {/* Status Selection - Radio Buttons */}
      <div>
        <label className={`block text-sm font-semibold mb-3 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
          Kết quả cuộc gọi
        </label>
        <div className="grid grid-cols-2 gap-2">
          {callStatuses.map((status) => (
            <motion.label
              key={status}
              whileHover={{ scale: 1.02 }}
              className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
                formData.callStatus === status
                  ? isDark
                    ? 'bg-blue-600/40 border-blue-400'
                    : 'bg-blue-100/60 border-blue-400'
                  : isDark
                    ? 'bg-slate-800/30 border-slate-700/40 hover:bg-slate-800/50'
                    : 'bg-white/30 border-white/40 hover:bg-white/50'
              }`}
            >
              <input
                type="radio"
                name="callStatus"
                value={status}
                checked={formData.callStatus === status}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    callStatus: e.target.value as CallFormData["callStatus"],
                  })
                }
                className="w-4 h-4"
              />
              <span className={`ml-2 text-sm font-medium ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                {status}
              </span>
            </motion.label>
          ))}
        </div>
      </div>

      {/* Revenue Input */}
      <div>
        <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
          Doanh thu (VND)
        </label>
        <input
          type="number"
          min="0"
          value={formData.revenue}
          onChange={(e) => setFormData({ ...formData, revenue: e.target.value })}
          placeholder="0"
          className={`w-full px-4 py-2 rounded-lg border transition-all text-sm ${
            isDark
              ? 'bg-slate-800/50 border-slate-700/60 text-slate-100 placeholder-slate-500'
              : 'bg-white/50 border-white/60 text-slate-900 placeholder-slate-500'
          } focus:ring-2 focus:ring-blue-400`}
        />
      </div>

      {/* Callback Date */}
      <div>
        <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
          Hẹn gọi lại
        </label>
        <input
          type="date"
          value={formData.callbackDate}
          onChange={(e) => setFormData({ ...formData, callbackDate: e.target.value })}
          className={`w-full px-4 py-2 rounded-lg border transition-all text-sm ${
            isDark
              ? 'bg-slate-800/50 border-slate-700/60 text-slate-100'
              : 'bg-white/50 border-white/60 text-slate-900'
          } focus:ring-2 focus:ring-blue-400 cursor-pointer`}
        />
      </div>

      {/* Note */}
      <div>
        <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
          Ghi chú
        </label>
        <textarea
          rows={4}
          value={formData.note}
          onChange={(e) => setFormData({ ...formData, note: e.target.value })}
          placeholder="Ghi chú chi tiết từ cuộc gọi..."
          className={`w-full px-4 py-2 rounded-lg border transition-all text-sm resize-none ${
            isDark
              ? 'bg-slate-800/50 border-slate-700/60 text-slate-100 placeholder-slate-500'
              : 'bg-white/50 border-white/60 text-slate-900 placeholder-slate-500'
          } focus:ring-2 focus:ring-blue-400`}
        />
      </div>

      {/* Submit Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onSubmit}
        className={`w-full py-3 rounded-lg font-semibold text-white transition-all ${
          isDark
            ? 'bg-linear-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500'
            : 'bg-linear-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500'
        }`}
      >
        Lưu kết quả
      </motion.button>
    </div>
  );
}
