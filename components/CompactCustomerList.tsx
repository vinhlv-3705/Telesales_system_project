'use client';

import { PhoneCall } from 'lucide-react';
import { motion } from 'framer-motion';
import { CustomerCallLog } from './CustomerList';

interface CompactCustomerListProps {
  customers: CustomerCallLog[];
  selectedId?: string;
  onSelect: (customer: CustomerCallLog) => void;
  onCall: (customer: CustomerCallLog) => void;
  isDark?: boolean;
}

export default function CompactCustomerList({
  customers,
  selectedId,
  onSelect,
  onCall,
  isDark = false,
}: CompactCustomerListProps) {
  if (!customers || customers.length === 0) {
    return (
      <div
        className={`backdrop-blur-xl p-4 rounded-2xl border text-center flex items-center justify-center h-full ${
          isDark
            ? 'bg-slate-900/45 border-slate-700/60'
            : 'bg-white/40 border-white/60'
        }`}
      >
        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          Không có khách hàng nào
        </p>
      </div>
    );
  }

  return (
    <div
      className={`backdrop-blur-xl rounded-2xl border flex flex-col h-full overflow-hidden ${
        isDark
          ? 'bg-slate-900/45 border-slate-700/60'
          : 'bg-white/40 border-white/60'
      }`}
    >
      {/* Header */}
      <div className={`p-4 border-b ${isDark ? 'border-slate-700/60' : 'border-white/60'}`}>
        <h3 className={`font-bold text-sm ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
          Danh sách gọi
        </h3>
        <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          {customers.length} khách hàng
        </p>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto divide-y" style={{ scrollBehavior: 'smooth' }}>
        {customers.map((customer, idx) => {
          const isSelected = selectedId === customer.id;

          return (
            <motion.div
              key={customer.id}
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: idx * 0.03 }}
              onClick={() => onSelect(customer)}
              className={`p-3 cursor-pointer transition-all border-l-4 ${
                isSelected
                  ? isDark
                    ? 'bg-blue-600/30 border-l-blue-400 border-blue-700/60'
                    : 'bg-blue-100/60 border-l-blue-500 border-blue-300/60'
                  : isDark
                    ? 'bg-transparent border-l-transparent hover:bg-slate-800/40'
                    : 'bg-transparent border-l-transparent hover:bg-white/30'
              }`}
            >
              {/* Customer Info */}
              <div className="mb-2">
                <p className={`font-semibold text-sm truncate ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                  {customer.customerName}
                </p>
                <p
                  className={`text-xs truncate ${isDark ? 'text-slate-400' : 'text-slate-600'}`}
                >
                  {customer.phoneNumber}
                </p>
              </div>

              {/* Status Badge & Call Button */}
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`text-xs font-medium px-2 py-1 rounded whitespace-nowrap ${
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
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onCall(customer);
                  }}
                  className={`flex items-center justify-center w-7 h-7 rounded-lg transition-all ${
                    isDark
                      ? 'bg-blue-600 hover:bg-blue-500 text-white'
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }`}
                  title="Bắt đầu gọi"
                >
                  <PhoneCall className="h-3.5 w-3.5" />
                </motion.button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
