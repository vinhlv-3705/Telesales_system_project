'use client';

import { motion } from 'framer-motion';

interface ScriptTemplateProps {
  callStatus: string;
  isDark?: boolean;
}

const scriptTemplates: Record<string, { title: string; content: string[] }> = {
  'Chốt đơn': {
    title: 'Kịch bản Chốt đơn',
    content: [
      '✓ Xác nhận lại nhu cầu khách hàng',
      '✓ Giới thiệu các lợi ích chính của sản phẩm',
      '✓ Trình bày giá cả & ưu đãi hiện tại',
      '✓ Xin phê duyệt và hoàn tất hợp đồng',
      '✓ Cảm ơn và hẹn gặp lại',
    ],
  },
  'Từ chối': {
    title: 'Kịch bản Xử lý Từ chối',
    content: [
      '✗ Hiểu lý do từ chối của khách',
      '✗ Khắc phục các mối lo ngại chính',
      '✗ Giới thiệu các giải pháp thay thế',
      '✗ Đề xuất follow-up vào thời điểm tốt hơn',
      '✗ Kết thúc lịch sự và giữ mối quan hệ',
    ],
  },
  'Mới': {
    title: 'Kịch bản Tiếp cận Ban đầu',
    content: [
      '→ Giới thiệu bản thân và công ty',
      '→ Xác định nhu cầu của khách',
      '→ Hỏi các câu hỏi mở để hiểu sâu hơn',
      '→ Tóm tắt những điểm chính',
      '→ Hẹn follow-up trong tuần này',
    ],
  },
  'Upsale': {
    title: 'Kịch bản Upsale/Cross-sell',
    content: [
      '↑ Ghi nhận thành công hiện tại',
      '↑ Tìm hiểu về các nhu cầu bổ sung',
      '↑ Giới thiệu sản phẩm/dịch vụ bổ sung',
      '↑ Làm nổi bật giá trị bổ sung',
      '↑ Thương lượng và đóng thêm',
    ],
  },
};

export default function ScriptTemplate({ callStatus, isDark = false }: ScriptTemplateProps) {
  const template = scriptTemplates[callStatus];

  if (!template) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`backdrop-blur-xl p-6 rounded-xl border overflow-hidden ${
        isDark
          ? 'bg-white/10 border-white/20 shadow-[0_8px_20px_rgba(0,0,0,0.3)]'
          : 'bg-white/40 border-white/60 shadow-[0_4px_15px_rgb(0,0,0,0.05)]'
      }`}
    >
      <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-sky-200' : 'text-blue-700'}`}>
        {template.title}
      </h3>

      <div className="space-y-2">
        {template.content.map((line, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, delay: idx * 0.05 }}
            className={`text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}
          >
            {line}
          </motion.div>
        ))}
      </div>

      {callStatus === 'Từ chối' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className={`mt-4 pt-4 border-t ${
            isDark ? 'border-slate-600' : 'border-slate-200'
          }`}
        >
          <p className={`text-xs font-semibold mb-2 ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
            💡 Gợi ý:
          </p>
          <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
            Đừng vội bỏ cuộc. Hẹn gọi lại sau 2 tuần khi khách có cơ hội suy nghĩ lại.
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}
