import { motion } from "framer-motion";
import { CreditCard } from "lucide-react";
import CountUp from "react-countup";

interface CreditCardProps {
  balance: number;
  isDark?: boolean;
}

export default function BalanceCreditCard({ balance, isDark = false }: CreditCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, rotateY: -90 }}
      animate={{ opacity: 1, rotateY: 0 }}
      transition={{ duration: 0.8, delay: 0.2 }}
      whileHover={{
        rotateY: 4,
        rotateX: 4,
        scale: 1.03,
        transition: { duration: 0.35, ease: "easeOut" },
      }}
      className="relative w-full max-w-lg mx-auto"
      style={{ perspective: "1000px" }}
    >
      <div
        className={`relative backdrop-blur-xl p-8 rounded-3xl transform-gpu border overflow-hidden ${isDark ? "bg-slate-900/45 border-slate-700/60" : "bg-white/40 border-white/70"}`}
        style={{
          boxShadow:
            isDark
              ? "0 25px 50px -18px rgba(2, 6, 23, 0.6), 0 0 0 1px rgba(148, 163, 184, 0.22)"
              : "0 25px 50px -18px rgba(15, 23, 42, 0.22), 0 0 0 1px rgba(255, 255, 255, 0.65)",
        }}
      >
        <div className={`absolute inset-0 ${isDark ? "bg-gradient-to-br from-blue-950/60 via-slate-900/30 to-cyan-950/50" : "bg-gradient-to-br from-indigo-100/60 via-white/40 to-cyan-100/50"}`}></div>
        <div className={`absolute -top-16 -right-10 h-44 w-44 rounded-full blur-3xl ${isDark ? "bg-blue-500/20" : "bg-indigo-300/25"}`}></div>
        <div className={`absolute -bottom-12 -left-8 h-40 w-40 rounded-full blur-3xl ${isDark ? "bg-cyan-500/20" : "bg-cyan-300/25"}`}></div>

        {/* Card content */}
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-8">
            <div>
              <p className={`text-sm font-medium tracking-wide uppercase ${isDark ? "text-slate-300" : "text-slate-600"}`}>Tổng Số Dư</p>
              <motion.p
                className={`text-4xl font-extrabold mt-2 tracking-tight tabular-nums ${isDark ? "text-slate-100" : "text-slate-900"}`}
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
              >
                <CountUp end={balance} duration={2} separator="." /> VND
              </motion.p>
            </div>
            <div className={`h-11 w-11 rounded-2xl backdrop-blur-md border flex items-center justify-center shadow-md ${isDark ? "bg-slate-800/70 border-slate-700" : "bg-white/70 border-white/80"}`}>
              <CreditCard className={`h-6 w-6 ${isDark ? "text-sky-300" : "text-indigo-600"}`} />
            </div>
          </div>

          <div className="flex justify-between items-center">
            <div>
              <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>Expense Tracker</p>
              <p className={`text-sm font-semibold tracking-widest ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                •••• •••• •••• 4242
              </p>
            </div>
            <div className="text-right">
              <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>Valid Thru</p>
              <p className={`text-sm font-semibold ${isDark ? "text-slate-200" : "text-slate-700"}`}>12/28</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
