import { TrendingUp, TrendingDown } from 'lucide-react';
import { motion } from 'framer-motion';
import CountUp from 'react-countup';

interface SummaryCardsProps {
  totalCalls: number;
  successfulOrders: number;
  isDark?: boolean;
}

export default function SummaryCards({ totalCalls, successfulOrders, isDark = false }: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      {/* Total Calls Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        whileHover={{ scale: 1.02, y: -4, transition: { duration: 0.25 } }}
        className={`relative backdrop-blur-xl p-8 rounded-2xl border overflow-hidden ${isDark ? 'bg-slate-900/45 border-slate-700/60 shadow-[0_12px_35px_rgba(2,6,23,0.55)]' : 'bg-white/40 border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)]'}`}
      >
        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-300/15 to-emerald-500/15 rounded-2xl"></div>

        <div className="relative z-10 flex items-center">
          <div className="relative">
            <TrendingUp className="h-10 w-10 text-emerald-400 drop-shadow-sm" />
            <div className="absolute inset-0 bg-emerald-300/20 blur-lg rounded-full"></div>
          </div>
          <div className="ml-4">
            <p className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Tổng cuộc gọi</p>
            <motion.p
              className={`text-3xl font-extrabold tracking-tight tabular-nums ${isDark ? 'text-slate-100' : 'text-[#0f172a]'}`}
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.6, duration: 0.5 }}
            >
              <CountUp end={totalCalls} duration={2} separator="." />
            </motion.p>
          </div>
        </div>
      </motion.div>

      {/* Successful Order Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        whileHover={{ scale: 1.02, y: -4, transition: { duration: 0.25 } }}
        className={`relative backdrop-blur-xl p-8 rounded-2xl border overflow-hidden ${isDark ? 'bg-slate-900/45 border-slate-700/60 shadow-[0_12px_35px_rgba(2,6,23,0.55)]' : 'bg-white/40 border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)]'}`}
      >
        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-rose-300/15 to-rose-500/15 rounded-2xl"></div>

        <div className="relative z-10 flex items-center">
          <div className="relative">
            <TrendingDown className="h-10 w-10 text-rose-400 drop-shadow-sm" />
            <div className="absolute inset-0 bg-rose-300/20 blur-lg rounded-full"></div>
          </div>
          <div className="ml-4">
            <p className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Đơn thành công</p>
            <motion.p
              className={`text-3xl font-extrabold tracking-tight tabular-nums ${isDark ? 'text-slate-100' : 'text-[#0f172a]'}`}
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.7, duration: 0.5 }}
            >
              <CountUp end={successfulOrders} duration={2} separator="." />
            </motion.p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}