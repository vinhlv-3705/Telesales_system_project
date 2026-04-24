'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Sun, Moon, LogOut, Phone } from 'lucide-react';
import { motion } from 'framer-motion';
import CallLogForm, { CallFormData } from '../components/CallLogForm';
import CustomerList, { CustomerCallLog } from '../components/CustomerList';

type CallStatus = 'Chốt đơn' | 'Từ chối' | 'Mới' | 'Upsell' | 'Hẹn gọi lại';
type QueueView = 'pending' | 'callback' | 'processed';
type UserRole = 'ADMIN' | 'AGENT';
type AgentOption = { id: string; username: string };
type CallHistoryItem = {
  id: string;
  customerId: string;
  customerName: string;
  agentName: string;
  status: CallStatus;
  revenue: number;
  callbackDate: string;
  callbackTime?: string;
  notes: string;
  timestamp: string;
};

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
  const [callLogs, setCallLogs] = useState<CustomerCallLog[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);
  const [customerLoadError, setCustomerLoadError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CallFormData>({
    customerName: '',
    phoneNumber: '',
    callStatus: '',
    revenue: '0',
    callbackDate: new Date().toISOString().split('T')[0],
    callbackTime: '',
    assignedTo: '',
    note: '',
  });
  const [loggedInRole, setLoggedInRole] = useState<UserRole>('AGENT');
  const [loggedInUser, setLoggedInUser] = useState<string>('User');
  const [agentOptions, setAgentOptions] = useState<AgentOption[]>([]);
  const [adminAssignedToId, setAdminAssignedToId] = useState<string>('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerCallLog | null>(null);
  const [insightTab, setInsightTab] = useState<'history' | 'stats'>('history');
  const [callLogHistory, setCallLogHistory] = useState<Record<string, CallHistoryItem[]>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSucceeded, setSaveSucceeded] = useState(false);
  const [activeCustomerId, setActiveCustomerId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [queueView, setQueueView] = useState<QueueView>('pending');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem('expense-tracker-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const response = await fetch('/api/auth/me', { cache: 'no-store' });
        if (!response.ok) return;
        const data = (await response.json()) as { username?: string; role?: UserRole; userId?: string | null };
        const username = data.username?.trim() || 'User';
        setLoggedInUser(username);
        setLoggedInRole(data.role === 'ADMIN' ? 'ADMIN' : 'AGENT');
        setFormData((prev) => ({ ...prev, assignedTo: username }));
      } catch (error) {
        console.error('Error loading auth profile:', error);
      }
    };

    void fetchMe();
  }, []);

  useEffect(() => {
    const fetchAgents = async () => {
      if (loggedInRole !== 'ADMIN') return;
      try {
        const response = await fetch('/api/agents', { cache: 'no-store' });
        if (!response.ok) return;
        const data = (await response.json()) as AgentOption[];
        setAgentOptions(data);
      } catch (error) {
        console.error('Error loading agents:', error);
      }
    };

    void fetchAgents();
  }, [loggedInRole]);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setCustomerLoadError(null);
        const query = loggedInRole === 'ADMIN' && adminAssignedToId ? `?assignedToId=${encodeURIComponent(adminAssignedToId)}` : '';
        const response = await fetch(`/api/customers${query}`, { cache: 'no-store' });
        if (!response.ok) {
          let message = `Failed to load customers (HTTP ${response.status})`;
          try {
            const data = (await response.json()) as { message?: string };
            if (data?.message) {
              message = data.message;
            }
          } catch {
            // ignore when response is not JSON
          }
          throw new Error(message);
        }
        const data = (await response.json()) as CustomerCallLog[];
        setCallLogs(data);
        const newCustomers = data.filter((item) => item.callStatus === 'Mới');
        if (newCustomers.length > 0) {
          setActiveCustomerId((prev) => prev ?? newCustomers[0].id);
          setSelectedCustomer((prev) => prev ?? newCustomers[0]);
        }
      } catch (error) {
        console.error('Error fetching customers from DB:', error);
        const message = error instanceof Error ? error.message : 'Không tải được khách hàng từ DB. Vui lòng refresh hoặc đăng nhập lại.';
        setCustomerLoadError(message);
      } finally {
        setIsLoadingCustomers(false);
      }
    };

    void fetchCustomers();
  }, [loggedInRole, adminAssignedToId]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const timeout = setTimeout(() => setToastMessage(null), 2500);
    return () => clearTimeout(timeout);
  }, [toastMessage]);

  const filteredCallLogs = useMemo(() => {
    const filtered = callLogs.filter((log) => {
      const matchesSearch = [
        log.customerCode,
        log.customerName,
        log.phoneNumber,
        log.address,
        log.area,
        log.groupCode,
        log.partner,
        log.note,
      ].join(' ').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesQueue =
        queueView === 'pending'
          ? log.callStatus === 'Mới'
          : queueView === 'callback'
            ? log.callStatus === 'Hẹn gọi lại'
            : ['Chốt đơn', 'Từ chối', 'Upsell'].includes(log.callStatus);
      return matchesSearch && matchesQueue;
    });

    if (queueView !== 'callback') return filtered;
    return [...filtered].sort((a, b) => {
      const aTime = new Date(`${a.callbackDate || '9999-12-31'}T${a.callbackTime || '23:59'}`).getTime();
      const bTime = new Date(`${b.callbackDate || '9999-12-31'}T${b.callbackTime || '23:59'}`).getTime();
      return aTime - bTime;
    });
  }, [callLogs, searchTerm, queueView]);

  const countNew = useMemo(() => callLogs.filter((log) => log.callStatus === 'Mới').length, [callLogs]);

  const countCallback = useMemo(
    () => callLogs.filter((log) => log.callStatus === 'Hẹn gọi lại').length,
    [callLogs]
  );

  const countProcessed = useMemo(
    () => callLogs.filter((log) => ['Chốt đơn', 'Từ chối', 'Upsell'].includes(log.callStatus)).length,
    [callLogs]
  );

  const closedTodayCount = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return callLogs.filter((log) => log.callStatus === 'Chốt đơn' && log.callbackDate === today).length;
  }, [callLogs]);

  const saveCallLog = async () => {
    if (!activeCustomer) return;
    const validOutcomes = ['Chốt đơn', 'Từ chối', 'Upsell', 'Hẹn gọi lại'] as const;
    type ValidOutcome = (typeof validOutcomes)[number];
    const isCallbackStatus = formData.callStatus === 'Hẹn gọi lại';
    const isRevenueRequired = formData.callStatus === 'Chốt đơn' || formData.callStatus === 'Upsell';

    if (!validOutcomes.includes(formData.callStatus as ValidOutcome)) {
      setToastMessage('Vui lòng chọn Kết quả cuộc gọi trước khi lưu.');
      return;
    }
    if (!formData.note.trim()) {
      setToastMessage('Vui lòng nhập Ghi chú trước khi lưu.');
      return;
    }
    if (isRevenueRequired && (formData.revenue.trim() === '' || Number(formData.revenue) < 0)) {
      setToastMessage('Vui lòng nhập Doanh thu hợp lệ cho Success/UpSale.');
      return;
    }
    if (isCallbackStatus && (!formData.callbackDate || !formData.callbackTime)) {
      setToastMessage('Vui lòng chọn đầy đủ ngày và giờ hẹn gọi lại.');
      return;
    }

    setIsSaving(true);
    setSaveSucceeded(false);
    try {
      const response = await fetch('/api/call-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: activeCustomer.id,
          customerName: activeCustomer.customerName,
          agentName: formData.assignedTo || loggedInUser,
          status: formData.callStatus,
          revenue: Number((formData.revenue || '0').replace(/\./g, '')),
          callbackDate: formData.callbackDate,
          callbackTime: formData.callbackTime,
          notes: formData.note,
        }),
      });

      if (!response.ok) {
        let errorMessage = 'Lưu nhật ký thất bại';
        try {
          const errorData = (await response.json()) as { message?: string };
          if (errorData?.message) {
            errorMessage = errorData.message;
          }
        } catch {
          // Keep default message when response is not JSON.
        }
        throw new Error(errorMessage);
      }

      const created = (await response.json()) as CallHistoryItem;
      setCallLogHistory((prev) => ({
        ...prev,
        [activeCustomer.id]: [created, ...(prev[activeCustomer.id] ?? [])],
      }));

      const updatedStatus = formData.callStatus as ValidOutcome;
      const currentCustomerId = activeCustomer.id;
      const updatedLogs = callLogs.map((item) =>
        item.id === currentCustomerId
          ? {
              ...item,
              callStatus: updatedStatus,
              callbackDate: formData.callbackDate || item.callbackDate,
              callbackTime: formData.callStatus === 'Hẹn gọi lại' ? formData.callbackTime : '',
              note: formData.note,
            }
          : item
      );
      const nextCustomer = updatedLogs.find((item) => item.callStatus === 'Mới' && item.id !== currentCustomerId) ?? null;
      setCallLogs(updatedLogs);

      setInsightTab('history');
      setToastMessage('Đã lưu nhật ký cuộc gọi thành công.');
      setSaveSucceeded(true);
      setSelectedCustomer(nextCustomer);
      setActiveCustomerId(nextCustomer?.id ?? null);
      setFormData({
        customerName: nextCustomer?.customerName ?? '',
        phoneNumber: nextCustomer?.phoneNumber ?? '',
        callStatus: '',
        revenue: '0',
        callbackDate: new Date().toISOString().split('T')[0],
        callbackTime: '',
        assignedTo: loggedInUser,
        note: '',
      });
    } catch (error) {
      console.error('Save call log error:', error);
      const message = error instanceof Error ? error.message : 'Không thể lưu nhật ký cuộc gọi. Vui lòng thử lại.';
      setToastMessage(message);
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveSucceeded(false), 1200);
    }
  };

  const activeCustomer = (() => {
    if (selectedCustomer && filteredCallLogs.some((item) => item.id === selectedCustomer.id)) {
      return selectedCustomer;
    }
    return filteredCallLogs.find((item) => item.id === activeCustomerId) ?? filteredCallLogs[0] ?? null;
  })();

  useEffect(() => {
    const fetchCallHistory = async () => {
      if (!activeCustomer?.id) return;
      try {
        const response = await fetch(`/api/call-logs?customerId=${activeCustomer.id}`, { cache: 'no-store' });
        if (!response.ok) return;
        const data = (await response.json()) as CallHistoryItem[];
        setCallLogHistory((prev) => ({ ...prev, [activeCustomer.id]: data }));
      } catch (error) {
        console.error('Error fetching call history:', error);
      }
    };
    void fetchCallHistory();
  }, [activeCustomer?.id]);

  const customerCallHistory = (() => {
    if (!activeCustomer?.id) return [];
    return callLogHistory[activeCustomer.id] ?? [];
  })();

  const customerPersonalStats = useMemo(() => {
    const totalCalls = customerCallHistory.length;
    const totalRevenue = customerCallHistory.reduce((sum, item) => sum + Number(item.revenue || 0), 0);
    const statusCount = customerCallHistory.reduce<Record<string, number>>((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {});
    const mostCommonStatus = Object.entries(statusCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Mới';

    const statusDescription =
      mostCommonStatus === 'Từ chối'
        ? 'Thường từ chối do giá'
        : mostCommonStatus === 'Chốt đơn'
          ? 'Khách VIP, khả năng chốt cao'
          : mostCommonStatus === 'Upsell'
            ? 'Ưu tiên gói nâng cao'
            : mostCommonStatus === 'Hẹn gọi lại'
              ? 'Cần nhắc lại đúng khung giờ hẹn'
            : 'Đang ở giai đoạn tiếp cận';

    return {
      totalCalls,
      totalRevenue: Number.isFinite(totalRevenue) ? totalRevenue : 0,
      mostCommonStatus,
      statusDescription,
    };
  }, [customerCallHistory]);

  const handleSelectCustomer = (customer: CustomerCallLog) => {
    setSelectedCustomer(customer);
    setInsightTab('history');
    setActiveCustomerId(customer.id);
    setFormData((prev) => ({
      ...prev,
      customerName: customer.customerName,
      phoneNumber: customer.phoneNumber,
      callStatus: ['Chốt đơn', 'Từ chối', 'Upsell', 'Hẹn gọi lại'].includes(customer.callStatus)
        ? customer.callStatus
        : '',
      callbackDate: customer.callbackDate || new Date().toISOString().split('T')[0],
      callbackTime: customer.callbackTime ?? '',
      assignedTo: loggedInUser,
      note: customer.note,
    }));
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="h-screen px-4 py-3 md:px-5 overflow-hidden">
      <div className="max-w-full h-full">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="h-16 flex justify-between items-center mb-4"
        >
          <h1 className={`text-2xl font-black bg-linear-to-r bg-clip-text text-transparent tracking-tight ${isDark ? 'from-sky-200 via-blue-300 to-cyan-300' : 'from-blue-800 via-sky-700 to-cyan-600'}`}>
            Professional Telesales Workspace
          </h1>
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setIsDark((prev) => !prev)}
              className={`h-10 w-10 rounded-xl border backdrop-blur-xl flex items-center justify-center shadow-sm focus:outline-none focus:ring-2 transition-all ${isDark ? 'bg-slate-900/50 border-slate-700 text-sky-200 focus:ring-sky-400' : 'bg-white/50 border-white/70 text-blue-700 focus:ring-blue-400'}`}
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleLogout}
              className={`px-4 py-2.5 rounded-xl border backdrop-blur-xl flex items-center transition-all ${
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
        <div className="h-[calc(100vh-80px)] grid grid-cols-1 xl:grid-cols-[25%_45%_30%] gap-4">
          <section className="h-full flex flex-col gap-3 overflow-hidden">
            <div className={`backdrop-blur-2xl p-4 rounded-3xl border shadow-2xl ${
              isDark ? 'bg-slate-900/60 border-white/10' : 'bg-white/60 border-white/20'
            }`}>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search name or phone"
                  className={`h-11 w-full pl-10 pr-3 rounded-2xl border backdrop-blur-2xl text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-400/50 ${
                    isDark ? 'bg-white/10 border-white/10 text-slate-100 placeholder:text-slate-400' : 'bg-white/40 border-white/20 text-slate-800 placeholder:text-slate-500'
                  }`}
                />
              </div>

              {loggedInRole === 'ADMIN' && (
                <div className="mb-2">
                  <select
                    value={adminAssignedToId}
                    onChange={(e) => setAdminAssignedToId(e.target.value)}
                    className={`h-11 w-full px-3 rounded-2xl border backdrop-blur-2xl text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-400/50 ${
                      isDark
                        ? 'bg-white/10 border-white/10 text-slate-100'
                        : 'bg-white/40 border-white/20 text-slate-800'
                    }`}
                  >
                    <option value="">Tất cả nhân viên</option>
                    {agentOptions.map((agent) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.username}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setQueueView('pending')}
                  className={`h-10 rounded-lg text-sm font-semibold border transition-all ${
                    queueView === 'pending'
                      ? 'bg-linear-to-r from-rose-600 to-red-500 text-white border-transparent shadow-[0_12px_30px_rgba(244,63,94,0.35)]'
                      : isDark
                        ? 'bg-white/5 text-slate-200 border-white/10 hover:bg-white/10'
                        : 'bg-white/30 text-slate-700 border-white/20 hover:bg-white/45'
                  }`}
                >
                  <span className="inline-flex items-center justify-center gap-2">
                    <span>Cần xử lý</span>
                    <span
                      className={`inline-flex items-center justify-center min-w-6 h-5 px-1.5 rounded-full text-[11px] font-bold border ${
                        queueView === 'pending'
                          ? 'bg-white/20 border-white/40 text-white'
                          : isDark
                            ? 'bg-rose-500/10 border-rose-400/30 text-rose-200'
                            : 'bg-rose-50/80 border-rose-200 text-rose-700'
                      }`}
                      title="Số khách cần xử lý"
                    >
                      {countNew}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setQueueView('callback')}
                  className={`h-10 rounded-lg text-sm font-semibold border transition-all ${
                    queueView === 'callback'
                      ? 'bg-linear-to-r from-amber-600 to-orange-500 text-white border-transparent shadow-[0_12px_30px_rgba(245,158,11,0.35)]'
                      : isDark
                        ? 'bg-white/5 text-slate-200 border-white/10 hover:bg-white/10'
                        : 'bg-white/30 text-slate-700 border-white/20 hover:bg-white/45'
                  }`}
                >
                  <span className="inline-flex items-center justify-center gap-2">
                    <span>Hẹn gọi lại</span>
                    <span
                      className={`inline-flex items-center justify-center min-w-6 h-5 px-1.5 rounded-full text-[11px] font-bold border ${
                        queueView === 'callback'
                          ? 'bg-white/20 border-white/40 text-white'
                          : isDark
                            ? 'bg-amber-500/10 border-amber-400/30 text-amber-200'
                            : 'bg-amber-50/80 border-amber-200 text-amber-700'
                      }`}
                      title="Số khách hẹn gọi lại"
                    >
                      {countCallback}
                    </span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setQueueView('processed')}
                  className={`h-10 rounded-lg text-sm font-semibold border transition-all flex items-center justify-center gap-2 ${
                    queueView === 'processed'
                      ? 'bg-linear-to-r from-emerald-600 to-green-500 text-white border-transparent shadow-[0_12px_30px_rgba(16,185,129,0.35)]'
                      : isDark
                        ? 'bg-white/5 text-slate-200 border-white/10 hover:bg-white/10'
                        : 'bg-white/30 text-slate-700 border-white/20 hover:bg-white/45'
                  }`}
                >
                  <span>Đã xử lý</span>
                  <span
                    className={`inline-flex items-center justify-center min-w-6 h-5 px-1.5 rounded-full text-[11px] font-bold border ${
                      queueView === 'processed'
                        ? 'bg-white/20 border-white/40 text-white'
                        : isDark
                          ? 'bg-emerald-500/10 border-emerald-400/30 text-emerald-200'
                          : 'bg-emerald-50/80 border-emerald-200 text-emerald-700'
                    }`}
                    title="Số khách đã xử lý"
                  >
                    {countProcessed}
                  </span>
                  <span
                    className={`inline-flex items-center justify-center min-w-6 h-5 px-1.5 rounded-full text-[11px] font-bold border ${
                      queueView === 'processed'
                        ? 'bg-white/20 border-white/40 text-white'
                        : isDark
                          ? 'bg-amber-500/10 border-amber-400/30 text-amber-200'
                          : 'bg-amber-50/80 border-amber-200 text-amber-700'
                    }`}
                    title="Số khách chốt hôm nay"
                  >
                    {closedTodayCount}
                  </span>
                </button>
              </div>
            </div>
            <CustomerList
              customers={filteredCallLogs}
              onCall={handleSelectCustomer}
              activeCustomerId={activeCustomer?.id}
              isDark={isDark}
              showCallbackSchedule={queueView === 'callback'}
            />
            {isLoadingCustomers && (
              <p className={`text-xs px-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Đang tải khách hàng từ DB...</p>
            )}
            {!isLoadingCustomers && !customerLoadError && filteredCallLogs.length === 0 && (
              <p className={`text-xs px-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Không có khách hàng nào phù hợp bộ lọc.</p>
            )}
            {customerLoadError && (
              <p className="text-xs px-2 text-rose-500">{customerLoadError}</p>
            )}
          </section>

          <section className="h-full flex flex-col gap-3 overflow-hidden">
            <div className={`backdrop-blur-2xl p-5 rounded-3xl border shadow-2xl ${
              isDark ? 'bg-slate-900/60 border-white/10' : 'bg-white/60 border-white/20'
            }`}>
              <p className={`text-xs uppercase tracking-[0.15em] mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Currently Calling
              </p>
              <h2 className={`text-xl font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                {activeCustomer?.customerName ?? 'No customer selected'}
              </h2>
              <p className={`text-xs mt-1 ${isDark ? 'text-sky-300' : 'text-blue-700'}`}>
                {activeCustomer?.customerCode ?? '--'}
              </p>
              <div className={`mt-2 flex items-center text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                <Phone className="h-4 w-4 mr-2" />
                {activeCustomer?.phoneNumber ?? '--'}
              </div>
            </div>
            <div className={`backdrop-blur-2xl p-5 rounded-3xl border shadow-2xl flex-1 overflow-y-auto ${
              isDark ? 'bg-slate-900/60 border-white/10' : 'bg-white/60 border-white/20'
            }`}>
              <h3 className={`text-lg font-semibold mb-3 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>Call Interface</h3>
              <CallLogForm
                formData={formData}
                setFormData={setFormData}
                onSubmit={saveCallLog}
                onValidationError={setToastMessage}
                isDark={isDark}
                compact
                isSaving={isSaving}
                saveSucceeded={saveSucceeded}
              />
              {isSaving && (
                <p className={`text-xs mt-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Đang lưu nhật ký cuộc gọi...</p>
              )}
            </div>
          </section>

          <section className="h-full">
            <div className={`backdrop-blur-2xl p-6 rounded-3xl border shadow-2xl h-full ${
              isDark ? 'bg-slate-900/60 border-white/10' : 'bg-white/60 border-white/20'
            }`}>
              <h3 className={`text-xl font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>Customer Insight</h3>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setInsightTab('history')}
                  className={`rounded-xl py-2 text-sm font-semibold border ${
                    insightTab === 'history'
                      ? 'bg-linear-to-r from-blue-600 to-sky-600 text-white border-transparent'
                      : isDark
                        ? 'bg-slate-800/50 text-slate-200 border-slate-600'
                        : 'bg-white/50 text-slate-700 border-white/70'
                  }`}
                >
                  Lịch sử cuộc gọi
                </button>
                <button
                  type="button"
                  onClick={() => setInsightTab('stats')}
                  className={`rounded-xl py-2 text-sm font-semibold border ${
                    insightTab === 'stats'
                      ? 'bg-linear-to-r from-violet-600 to-purple-600 text-white border-transparent'
                      : isDark
                        ? 'bg-slate-800/50 text-slate-200 border-slate-600'
                        : 'bg-white/50 text-slate-700 border-white/70'
                  }`}
                >
                  Thống kê cá nhân
                </button>
              </div>

              {insightTab === 'history' ? (
                <div className="mt-4 space-y-3 max-h-[calc(100%-100px)] overflow-y-auto pr-1">
                  {customerCallHistory.map((item) => (
                    <div
                      key={item.id}
                      className={`rounded-xl p-3 border ${
                        isDark ? 'bg-slate-800/40 border-slate-700/60 text-slate-200' : 'bg-white/45 border-white/60 text-slate-700'
                      }`}
                    >
                      <div className="text-xs opacity-80">{new Date(item.timestamp).toLocaleString('vi-VN')}</div>
                      <div className="text-sm mt-1"><span className="font-semibold">Người xử lý:</span> {item.agentName}</div>
                      <div className="text-sm"><span className="font-semibold">Kết quả:</span> {item.status}</div>
                      <div className="text-sm"><span className="font-semibold">Doanh thu:</span> {Number(item.revenue).toLocaleString('vi-VN')} VND</div>
                      {item.callbackTime && (
                        <div className="text-sm"><span className="font-semibold">Giờ hẹn:</span> {item.callbackDate} {item.callbackTime}</div>
                      )}
                      <div className="text-sm mt-1"><span className="font-semibold">Ghi chú:</span> {item.notes}</div>
                    </div>
                  ))}
                  {customerCallHistory.length === 0 && (
                    <div className={`rounded-xl p-3 border text-sm ${
                      isDark ? 'bg-slate-800/40 border-slate-700/60 text-slate-300' : 'bg-white/45 border-white/60 text-slate-600'
                    }`}>
                      Chưa có lịch sử cuộc gọi cho khách hàng này.
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  <div className={`rounded-xl p-3 border ${isDark ? 'bg-slate-800/40 border-slate-700/60 text-slate-200' : 'bg-white/45 border-white/60 text-slate-700'}`}>
                    <div className="text-xs opacity-80">Tổng số lần đã gọi</div>
                    <div className="text-xl font-bold">{customerPersonalStats.totalCalls}</div>
                  </div>
                  <div className={`rounded-xl p-3 border ${isDark ? 'bg-slate-800/40 border-slate-700/60 text-slate-200' : 'bg-white/45 border-white/60 text-slate-700'}`}>
                    <div className="text-xs opacity-80">Tổng doanh thu đã đóng góp</div>
                    <div className="text-xl font-bold">{customerPersonalStats.totalRevenue.toLocaleString('vi-VN')} VND</div>
                  </div>
                  <div className={`rounded-xl p-3 border ${isDark ? 'bg-slate-800/40 border-slate-700/60 text-slate-200' : 'bg-white/45 border-white/60 text-slate-700'}`}>
                    <div className="text-xs opacity-80">Trạng thái thường gặp nhất</div>
                    <div className="text-base font-semibold">{customerPersonalStats.mostCommonStatus}</div>
                    <div className="text-sm mt-1">{customerPersonalStats.statusDescription}</div>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50">
          <div className={`backdrop-blur-xl border rounded-xl px-4 py-2 text-sm shadow-lg ${
            isDark ? 'bg-slate-900/70 border-slate-700 text-slate-100' : 'bg-white/80 border-white/70 text-slate-800'
          }`}>
            {toastMessage}
          </div>
        </div>
      )}
    </div>
  );
}
