'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { FileDown, Search, Calendar, Sun, Moon, PhoneCall, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';
import SummaryCards from '../components/SummaryCards';
import CallLogForm, { CallFormData } from '../components/CallLogForm';
import CustomerList, { CustomerCallLog } from '../components/CustomerList';
import EditCallLogModal from '../components/EditCallLogModal';

type CallStatus = 'Chốt đơn' | 'Từ chối' | 'Mới' | 'Upsale';
const callStatuses: CallStatus[] = ['Chốt đơn', 'Từ chối', 'Mới', 'Upsale'];
const colors = ['#1d4ed8', '#0ea5e9', '#06b6d4', '#38bdf8', '#3b82f6'];
const defaultCallLogs: CustomerCallLog[] = [
  { id: '1', customerName: 'Nguyen Van Nam', phoneNumber: '0901111222', callStatus: 'Mới', callbackDate: '2026-04-24', note: 'Yeu cau tu van them goi Premium' },
  { id: '2', customerName: 'Tran Thi Lan', phoneNumber: '0903444555', callStatus: 'Chốt đơn', callbackDate: '2026-04-23', note: 'Da chot don trong buoi sang' },
  { id: '3', customerName: 'Le Quoc Bao', phoneNumber: '0912789123', callStatus: 'Từ chối', callbackDate: '2026-04-22', note: 'Khong co nhu cau thoi diem nay' },
];

export default function Dashboard() {
  const router = useRouter();
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    const savedTheme = localStorage.getItem('expense-tracker-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return savedTheme ? savedTheme === 'dark' : prefersDark;
  });
  const [callLogs, setCallLogs] = useState<CustomerCallLog[]>(() => {
    if (typeof window === 'undefined') {
      return defaultCallLogs;
    }

    const saved = localStorage.getItem('telesales-crm-calllogs');
    if (!saved) {
      return defaultCallLogs;
    }

    try {
      const parsed: CustomerCallLog[] = JSON.parse(saved);
      return parsed.length > 0 ? parsed : defaultCallLogs;
    } catch (error) {
      console.error('Error loading call logs from localStorage:', error);
      return defaultCallLogs;
    }
  });
  const [formData, setFormData] = useState<CallFormData>({
    customerName: '',
    phoneNumber: '',
    callStatus: 'Mới',
    revenue: '0',
    callbackDate: new Date().toISOString().split('T')[0],
    note: '',
  });
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCallLog, setEditingCallLog] = useState<CustomerCallLog | null>(null);
  const [monthFilter, setMonthFilter] = useState<{ month: number | null, year: number }>({ month: null, year: new Date().getFullYear() });
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem('expense-tracker-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  useEffect(() => {
    if (callLogs.length > 0) {
      localStorage.setItem('telesales-crm-calllogs', JSON.stringify(callLogs));
    }
  }, [callLogs]);

  const totalCalls = useMemo(() => callLogs.length, [callLogs]);
  const successfulOrders = useMemo(() => callLogs.filter((c) => c.callStatus === 'Chốt đơn').length, [callLogs]);
  const statusBreakdown = useMemo(() => {
    return callLogs.reduce((acc, log) => {
      const found = acc.find((item) => item.name === log.callStatus);
      if (found) {
        found.value += 1;
      } else {
        acc.push({ name: log.callStatus, value: 1 });
      }
      return acc;
    }, [] as { name: string; value: number }[]);
  }, [callLogs]);

  const filteredCallLogs = useMemo(() => {
    return callLogs.filter((log) => {
      const matchesSearch = [log.customerName, log.phoneNumber, log.note].join(' ').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || log.callStatus === statusFilter;
      const transactionDate = new Date(log.callbackDate);
      const matchesMonth = monthFilter.month === null ||
        (transactionDate.getMonth() === monthFilter.month - 1 && transactionDate.getFullYear() === monthFilter.year);
      return matchesSearch && matchesStatus && matchesMonth;
    });
  }, [callLogs, searchTerm, statusFilter, monthFilter]);

  const addCallLog = () => {
    if (!formData.customerName.trim() || !formData.phoneNumber.trim()) return;
    const newCallLog: CustomerCallLog = {
      id: Date.now().toString(),
      customerName: formData.customerName.trim(),
      phoneNumber: formData.phoneNumber.trim(),
      callStatus: formData.callStatus,
      callbackDate: formData.callbackDate,
      note: formData.note.trim(),
    };
    setCallLogs([newCallLog, ...callLogs]);
    setFormData({
      customerName: '',
      phoneNumber: '',
      callStatus: 'Mới',
      revenue: '0',
      callbackDate: new Date().toISOString().split('T')[0],
      note: '',
    });
  };

  const deleteCallLog = (id: string) => {
    setCallLogs(callLogs.filter((c) => c.id !== id));
  };

  const onEdit = (callLog: CustomerCallLog) => {
    setEditingCallLog(callLog);
    setShowEditModal(true);
  };

  const onSaveEdit = (updated: CustomerCallLog) => {
    setCallLogs(callLogs.map((c) => (c.id === updated.id ? updated : c)));
    setShowEditModal(false);
    setEditingCallLog(null);
  };

  const onCloseEdit = () => {
    setShowEditModal(false);
    setEditingCallLog(null);
  };

  const exportToCSV = () => {
    const headers = ['CustomerName', 'PhoneNumber', 'CallStatus', 'CallbackDate', 'Note'];
    const csvContent = [
      headers.join(','),
      ...callLogs.map((log) => [
        log.customerName,
        log.phoneNumber,
        log.callStatus,
        log.callbackDate,
        `"${log.note}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `telesales_call_logs_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="min-h-screen px-4 py-8 md:px-6 md:py-10">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center mb-10"
        >
          <h1 className={`text-4xl font-black bg-gradient-to-r bg-clip-text text-transparent tracking-tight ${isDark ? 'from-sky-200 via-blue-300 to-cyan-300' : 'from-blue-800 via-sky-700 to-cyan-600'}`}>
            Telesales User Dashboard
          </h1>
          <div className="flex items-center gap-3 flex-wrap">
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setIsDark((prev) => !prev)}
              className={`h-12 w-12 rounded-2xl border backdrop-blur-xl flex items-center justify-center shadow-sm focus:outline-none focus:ring-2 transition-all ${isDark ? 'bg-slate-900/50 border-slate-700 text-sky-200 focus:ring-sky-400' : 'bg-white/50 border-white/70 text-blue-700 focus:ring-blue-400'}`}
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03, boxShadow: isDark ? '0 14px 24px -10px rgba(56, 189, 248, 0.45)' : '0 14px 24px -10px rgba(37, 99, 235, 0.4)' }}
              whileTap={{ scale: 0.97 }}
              onClick={exportToCSV}
              className={`text-white px-6 py-3 rounded-xl shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 flex items-center transition-all duration-300 ${isDark ? 'bg-gradient-to-r from-sky-500 to-blue-600 focus:ring-sky-400 focus:ring-offset-slate-950' : 'bg-gradient-to-r from-blue-700 to-sky-600 focus:ring-blue-500 focus:ring-offset-slate-100'}`}
            >
              <FileDown className="h-5 w-5 mr-2" />
              Export CSV
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleLogout}
              className={`px-5 py-3 rounded-xl border backdrop-blur-xl flex items-center transition-all ${
                isDark
                  ? 'bg-slate-900/45 border-slate-700/60 text-slate-100'
                  : 'bg-white/45 border-white/60 text-slate-700'
              }`}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Đăng xuất
            </motion.button>
          </div>
        </motion.div>

        <>
            <SummaryCards totalCalls={totalCalls} successfulOrders={successfulOrders} isDark={isDark} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className={`backdrop-blur-xl p-8 rounded-2xl border ${isDark ? 'bg-slate-900/45 border-slate-700/60 shadow-[0_12px_35px_rgba(2,6,23,0.55)]' : 'bg-white/40 border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)]'}`}
              >
                <div className="mb-6">
                  <h2 className={`text-2xl font-bold ${isDark ? 'text-slate-100' : 'text-[#1e293b]'}`}>Phân bổ trạng thái cuộc gọi</h2>
                  <div className={`w-12 h-1 mt-2 rounded-full ${isDark ? 'bg-gradient-to-r from-sky-400 to-blue-500' : 'bg-gradient-to-r from-blue-500 to-cyan-500'}`}></div>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statusBreakdown}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className={`backdrop-blur-xl p-8 rounded-2xl border ${isDark ? 'bg-slate-900/45 border-slate-700/60 shadow-[0_12px_35px_rgba(2,6,23,0.55)]' : 'bg-white/40 border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)]'}`}
              >
                <div className="mb-6">
                  <h2 className={`text-2xl font-bold ${isDark ? 'text-slate-100' : 'text-[#1e293b]'}`}>Form nhập liệu cuộc gọi</h2>
                  <div className={`w-12 h-1 mt-2 rounded-full ${isDark ? 'bg-gradient-to-r from-sky-400 to-blue-500' : 'bg-gradient-to-r from-blue-500 to-cyan-500'}`}></div>
                </div>
                <CallLogForm formData={formData} setFormData={setFormData} onSubmit={addCallLog} isDark={isDark} />
              </motion.div>
            </div>

            {/* Filters */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              whileHover={{ y: -2 }}
              className={`backdrop-blur-xl p-8 rounded-2xl border mt-8 ${isDark ? 'bg-slate-900/45 border-slate-700/60 shadow-[0_12px_35px_rgba(2,6,23,0.55)]' : 'bg-white/40 border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)]'}`}
            >
              <div className="mb-6">
                <h2 className={`text-2xl font-bold ${isDark ? 'text-slate-100' : 'text-[#1e293b]'}`}>Công Cụ Lọc</h2>
                <div className={`w-12 h-1 mt-2 rounded-full ${isDark ? 'bg-gradient-to-r from-sky-400 to-blue-500' : 'bg-gradient-to-r from-blue-500 to-cyan-500'}`}></div>
              </div>
              <div className="flex flex-wrap gap-6 items-end">
                <div className="flex-1 min-w-64">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Tìm theo KH / SĐT / ghi chú</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="block w-full h-11 pl-11 pr-3 rounded-lg border border-white/50 bg-white/30 backdrop-blur-md shadow-sm focus:ring-2 focus:ring-indigo-400 focus:border-white/70 transition-all text-slate-900 placeholder-slate-500"
                      placeholder="Nhập từ khóa..."
                    />
                  </div>
                </div>
                <div className="flex gap-4 items-end">
                  <div className="min-w-40">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Tháng</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <select
                        value={monthFilter.month ?? ''}
                        onChange={(e) => setMonthFilter({ ...monthFilter, month: e.target.value ? parseInt(e.target.value) : null })}
                        className="block w-full h-11 pl-11 pr-3 rounded-lg border border-white/50 bg-white/30 backdrop-blur-md shadow-sm focus:ring-2 focus:ring-indigo-400 focus:border-white/70 transition-all text-slate-900"
                      >
                        <option value="">Tất Cả</option>
                        {[...Array(12)].map((_, i) => {
                          const monthNum = i + 1;
                          return <option key={monthNum} value={monthNum}>Tháng {monthNum}</option>;
                        })}
                      </select>
                    </div>
                  </div>
                  <div className="min-w-40">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Năm</label>
                    <div className="relative">
                      <select
                        value={monthFilter.year}
                        onChange={(e) => setMonthFilter({ ...monthFilter, year: parseInt(e.target.value) })}
                        className="block w-full h-11 px-3 rounded-lg border border-white/50 bg-white/30 backdrop-blur-md shadow-sm focus:ring-2 focus:ring-indigo-400 focus:border-white/70 transition-all text-slate-900"
                      >
                        {[...Array(5)].map((_, i) => {
                          const year = new Date().getFullYear() - 2 + i;
                          return <option key={year} value={year}>{year}</option>;
                        })}
                      </select>
                    </div>
                  </div>
                </div>
                <div className="min-w-48">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Lọc theo trạng thái cuộc gọi</label>
                  <div className="relative">
                    <PhoneCall className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="block w-full h-11 pl-11 pr-3 rounded-lg border border-white/50 bg-white/30 backdrop-blur-md shadow-sm focus:ring-2 focus:ring-indigo-400 focus:border-white/70 transition-all text-slate-900"
                    >
                      <option value="all">Tất Cả</option>
                      {callStatuses.map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
            >
              <CustomerList customers={filteredCallLogs} onDelete={deleteCallLog} onEdit={onEdit} isDark={isDark} />
            </motion.div>

            <EditCallLogModal
              key={editingCallLog?.id ?? 'new'}
              callLog={editingCallLog}
              onSave={onSaveEdit}
              onClose={onCloseEdit}
              isOpen={showEditModal}
              isDark={isDark}
            />
        </>
      </div>
    </div>
  );
}
