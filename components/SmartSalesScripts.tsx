'use client';

import { motion } from 'framer-motion';
import { Lightbulb, TrendingUp, AlertCircle, Target } from 'lucide-react';

interface SmartSalesScriptsProps {
  callStatus: string;
  isDark?: boolean;
}

const scripts: Record<string, { icon: React.ComponentType<any>; title: string; content: string[] }> = {
  'Mới': {
    icon: Target,
    title: 'Tiếp cận Ban đầu',
    content: [
      '👋 Giới thiệu bản thân và công ty',
      '🎯 Xác định nhu cầu chính của khách',
      '🔍 Hỏi các câu hỏi mở để hiểu sâu',
      '📝 Tóm tắt các điểm chính',
      '📅 Hẹn follow-up tuần này',
    ],
  },
  'Từ chối': {
    icon: AlertCircle,
    title: 'Xử lý Từ chối',
    content: [
      '👂 Nghe và hiểu lý do từ chối',
      '💬 Xác nhận mối lo ngại của họ',
      '💡 Đề xuất giải pháp thay thế',
      '🎁 Nêu bật ưu đãi hoặc lợi ích mới',
      '📞 Hẹn gọi lại sau 2 tuần',
    ],
  },
  'Upsale': {
    icon: TrendingUp,
    title: 'Upsale/Cross-sell',
    content: [
      '🎉 Ghi nhận thành công hiện tại',
      '📦 Tìm hiểu về nhu cầu bổ sung',
      '⭐ Giới thiệu sản phẩm liên quan',
      '💰 Làm nổi bật giá trị bổ sung',
      '✅ Đóng thêm và xác nhận',
    ],
  },
  'Chốt đơn': {
    icon: Lightbulb,
    title: 'Chốt Đơn Thành Công',
    content: [
      '🎯 Xác nhận lại nhu cầu khách',
      '💎 Nhắc lại lợi ích chính',
      '💵 Trình bày giá cả & ưu đãi',
      '📋 Xin phê duyệt hợp đồng',
      '🙏 Cảm ơn và tạo lợi thế tiếp theo',
    ],
  },
};

export default function SmartSalesScripts({ callStatus, isDark = false }: SmartSalesScriptsProps) {
  const script = scripts[callStatus] || scripts['Mới'];
  const IconComponent = script.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`backdrop-blur-xl p-6 rounded-2xl border h-full flex flex-col overflow-hidden ${
        isDark
          ? 'bg-purple-900/30 border-purple-700/60 shadow-[0_8px_32px_rgba(139,92,246,0.1)]'
          : 'bg-purple-50/60 border-purple-300/60 shadow-[0_8px_32px_rgba(168,85,247,0.1)]'
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div
          className={`p-2 rounded-lg ${
            isDark
              ? 'bg-purple-700/60'
              : 'bg-purple-200/60'
          }`}
        >
          <IconComponent className={`h-5 w-5 ${isDark ? 'text-purple-200' : 'text-purple-600'}`} />
        </div>
        <div>
          <h3 className={`font-bold text-sm ${isDark ? 'text-purple-100' : 'text-purple-900'}`}>
            {script.title}
          </h3>
          <p className={`text-xs ${isDark ? 'text-purple-300' : 'text-purple-600'}`}>
            {callStatus === 'Từ chối' ? '💡 Chiến lược giữ liên hệ' : '💡 Hướng dẫn tối ưu'}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-2">
        {script.content.map((line, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, delay: idx * 0.05 }}
            className={`text-xs leading-relaxed p-2 rounded-lg ${
              isDark
                ? 'bg-slate-800/30 text-purple-200'
                : 'bg-white/60 text-purple-700'
            }`}
          >
            {line}
          </motion.div>
        ))}
      </div>

      {/* Footer Tip */}
      {callStatus === 'Từ chối' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className={`mt-4 pt-4 border-t ${
            isDark
              ? 'border-purple-700/40'
              : 'border-purple-200/60'
          }`}
        >
          <p className={`text-xs font-semibold ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
            💡 Gợi ý:
          </p>
          <p className={`text-xs mt-1 ${isDark ? 'text-purple-300' : 'text-purple-600'}`}>
            Đừng bỏ cuộc. Giữ liên hệ tốt, họ có thể quay lại.
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}
