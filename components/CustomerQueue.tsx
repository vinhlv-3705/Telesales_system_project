'use client';

import { PhoneCall, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { CustomerCallLog } from './CustomerList';

interface CustomerQueueProps {
  customers: CustomerCallLog[];
  selectedId?: string;
  onSelectCustomer: (customer: CustomerCallLog) => void;
  onStartCall: (customer: CustomerCallLog) => void;
  isDark?: boolean;
}

const getReminderStatus = (callbackDate: string) => {
  const now = new Date();
  const target = new Date(callbackDate);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const callDay = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();

  if (callDay < today) {
    return { label: 'Quá hạn', icon: AlertCircle, classes: 'bg-rose-100/80 text-rose-700 border border-rose-300' };
  }
  if (callDay === today) {
    return { label: 'Hôm nay', icon: Clock, classes: 'bg-amber-100/80 text-amber-700 border border-amber-300' };
  }
  return { label: 'Hẹn sau', icon: CheckCircle, classes: 'bg-emerald-100/80 text-emerald-700 border border-emerald-300' };
};

export default function CustomerQueue({
  customers,
  selectedId,
  onSelectCustomer,
  onStartCall,
  isDark = false,
}: CustomerQueueProps) {
  if (!customers || customers.length === 0) {
    return (
      <div
        className={`backdrop-blur-xl p-8 rounded-2xl border text-center ${
          isDark
            ? 'bg-slate-900/45 border-slate-700/60 shadow-[0_12px_35px_rgba(2,6,23,0.55)]'
            : 'bg-white/40 border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)]'
        }`}
      >
        <p className={isDark ? 'text-slate-400' : 'text-slate-600'}>Không có khách hàng nào cần gọi</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
      {customers.map((customer, idx) => {
        const reminder = getReminderStatus(customer.callbackDate);
        const ReminderIcon = reminder.icon;
        const isSelected = selectedId === customer.id;

        return (
          <motion.div
            key={customer.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.05 }}
            onClick={() => onSelectCustomer(customer)}
            className={`cursor-pointer transition-all rounded-lg border p-3 ${
              isSelected
                ? isDark
                  ? 'bg-blue-600/40 border-blue-400 shadow-[0_0_12px_rgba(96,165,250,0.3)]'
                  : 'bg-blue-100/60 border-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.2)]'
                : isDark
                  ? 'bg-slate-800/30 border-slate-700/40 hover:bg-slate-800/50'
                  : 'bg-white/30 border-white/40 hover:bg-white/50'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h4 className={`font-semibold text-sm truncate ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                  {customer.customerName}
                </h4>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'} truncate`}>
                  {customer.phoneNumber}
                </p>
              </div>

              <div
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${reminder.classes}`}
              >
                <ReminderIcon className="h-3 w-3" />
                <span>{reminder.label}</span>
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between">
              <span
                className={`text-xs font-medium px-2 py-1 rounded ${
                  customer.callStatus === 'Chốt đơn'
                    ? isDark
                      ? 'bg-emerald-900/40 text-emerald-200'
                      : 'bg-emerald-100 text-emerald-700'
                    : customer.callStatus === 'Từ chối'
                      ? isDark
                        ? 'bg-rose-900/40 text-rose-200'
                        : 'bg-rose-100 text-rose-700'
                      : customer.callStatus === 'Upsell'
                        ? isDark
                          ? 'bg-purple-900/40 text-purple-200'
                          : 'bg-purple-100 text-purple-700'
                        : isDark
                          ? 'bg-slate-700/40 text-slate-300'
                          : 'bg-slate-200 text-slate-700'
                }`}
              >
                {customer.callStatus}
              </span>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onStartCall(customer);
                }}
                className={`flex items-center gap-1 px-3 py-1 rounded text-xs font-semibold transition-all ${
                  isDark
                    ? 'bg-blue-600 hover:bg-blue-500 text-white'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
              >
                <PhoneCall className="h-3 w-3" />
                Gọi
              </motion.button>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
