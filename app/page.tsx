'use client';

import { useState, useEffect, useMemo, useRef, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Sun, Moon, LogOut, Phone, Cake, Package, Tag, Copy, ChevronDown, Pin, X, Pencil, Check, CalendarDays } from 'lucide-react';
import { motion } from 'framer-motion';
import CallLogForm, { CallFormData } from '../components/CallLogForm';
import CustomerList from '../components/CustomerList';
import type { CustomerCallLog as CustomerListCustomerCallLog } from '../components/CustomerList';

const ZaloIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 64 64"
    aria-hidden="true"
    className={className}
    fill="none"
  >
    <rect x="6" y="6" width="52" height="52" rx="12" stroke="#0A68FF" strokeWidth="6" />
    <rect x="14" y="23" width="36" height="22" rx="8" fill="#FFFFFF" />
    <text
      x="32"
      y="38"
      textAnchor="middle"
      fontSize="14"
      fontFamily="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial"
      fontWeight="700"
      fill="#0A68FF"
    >
      Zalo
    </text>
  </svg>
);

type CallStatus = 'Chốt đơn' | 'Từ chối' | 'Mới' | 'Upsell' | 'Hẹn gọi lại';
type QueueView = 'pending' | 'callback' | 'processed';
type ProcessedFilter = 'all' | 'today' | 'week';
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
  productsPurchased?: string;
  timestamp: string;
};

export type CustomerCallLog = CustomerListCustomerCallLog & {
  timestamp?: string;
};

export default function Dashboard() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (typeof window === 'undefined') return;
    const savedTheme = localStorage.getItem('expense-tracker-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const resolved = savedTheme ? savedTheme === 'dark' : prefersDark;
    setIsDark(resolved);
  }, []);

  const resolvedIsDark = isMounted ? isDark : false;

  const bgStyle = useMemo(() => {
    return {
      ...(resolvedIsDark
        ? {
            ['--background' as never]: '#050B18',
            ['--surface' as never]: 'rgba(12, 24, 45, 0.95)',
            ['--surface-border' as never]: 'rgba(148, 163, 184, 0.14)',
            ['--blob-1' as never]: 'rgba(14, 165, 233, 0.18)',
            ['--blob-2' as never]: 'rgba(99, 102, 241, 0.14)',
            ['--blob-3' as never]: 'rgba(34, 211, 238, 0.12)',
            ['--ring' as never]: '#93c5fd',
          }
        : {
            ['--background' as never]: '#EEF6FF',
            ['--surface' as never]: 'rgba(255, 255, 255, 0.92)',
            ['--surface-border' as never]: 'rgba(15, 23, 42, 0.12)',
            ['--blob-1' as never]: 'rgba(14, 165, 233, 0.14)',
            ['--blob-2' as never]: 'rgba(99, 102, 241, 0.12)',
            ['--blob-3' as never]: 'rgba(34, 211, 238, 0.10)',
            ['--ring' as never]: '#2563eb',
          }),
    } as CSSProperties;
  }, [resolvedIsDark]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const root = document.documentElement;
    const keys = ['--background', '--surface', '--surface-border', '--blob-1', '--blob-2', '--blob-3'] as const;

    if (!bgStyle) {
      for (const key of keys) {
        root.style.removeProperty(key);
      }
      return;
    }

    for (const key of keys) {
      const value = (bgStyle as unknown as Record<string, string | undefined>)[key];
      if (typeof value === 'string' && value.trim()) {
        root.style.setProperty(key, value);
      } else {
        root.style.removeProperty(key);
      }
    }

    return () => {
      for (const key of keys) {
        root.style.removeProperty(key);
      }
    };
  }, [bgStyle, resolvedIsDark]);
  const [callLogs, setCallLogs] = useState<CustomerCallLog[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);
  const [customerLoadError, setCustomerLoadError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CallFormData>({
    customerName: '',
    phoneNumber: '',
    callStatus: '',
    revenue: '',
    callbackDate: new Date().toISOString().split('T')[0],
    callbackTime: '',
    assignedTo: '',
    note: '',
    productsPurchased: '',
  });
  const [loggedInRole, setLoggedInRole] = useState<UserRole>('AGENT');
  const [loggedInUser, setLoggedInUser] = useState<string>('User');
  const [agentOptions, setAgentOptions] = useState<AgentOption[]>([]);
  const [adminAssignedToId, setAdminAssignedToId] = useState<string>('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerCallLog | null>(null);
  const [insightTab, setInsightTab] = useState<'history' | 'stats'>('history');

  const [resumeProcessedEditing, setResumeProcessedEditing] = useState(false);
  const [callLogHistory, setCallLogHistory] = useState<Record<string, CallHistoryItem[]>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSucceeded, setSaveSucceeded] = useState(false);
  const [activeCustomerId, setActiveCustomerId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [queueView, setQueueView] = useState<QueueView>('pending');
  const [processedFilter, setProcessedFilter] = useState<ProcessedFilter>('all');
  const [selectedAreaKey, setSelectedAreaKey] = useState<string>('__ALL__');
  const [areaDropdownOpen, setAreaDropdownOpen] = useState(false);
  const [areaSearch, setAreaSearch] = useState('');
  const [pinnedAreaKeys, setPinnedAreaKeys] = useState<string[]>(() => {
    try {
      if (typeof window === 'undefined') return [];
      const raw = window.localStorage.getItem('telesales_pinned_areas');
      if (!raw) return [];
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((v) => typeof v === 'string') as string[];
    } catch {
      return [];
    }
  });
  const areaDropdownRef = useRef<HTMLDivElement | null>(null);
  const contractSignedInputRef = useRef<HTMLInputElement | null>(null);
  const birthdayInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isMounted) return;
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem('expense-tracker-theme', isDark ? 'dark' : 'light');
  }, [isDark, isMounted]);

  useEffect(() => {
    if (!isMounted) return;
    try {
      localStorage.setItem('telesales_pinned_areas', JSON.stringify(pinnedAreaKeys));
    } catch {
      // ignore
    }
  }, [isMounted, pinnedAreaKeys]);

  useEffect(() => {
    if (!areaDropdownOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (areaDropdownRef.current && areaDropdownRef.current.contains(target)) return;
      setAreaDropdownOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [areaDropdownOpen]);

  const locationKeyOf = (value: string) => {
    return value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ');
  };

  const provinceKeySet = useMemo(() => {
    const provinces = [
      'Hà Nội',
      'Hồ Chí Minh',
      'Đà Nẵng',
      'Hải Phòng',
      'Cần Thơ',
      'An Giang',
      'Bà Rịa - Vũng Tàu',
      'Bắc Giang',
      'Bắc Kạn',
      'Bạc Liêu',
      'Bắc Ninh',
      'Bến Tre',
      'Bình Định',
      'Bình Dương',
      'Bình Phước',
      'Bình Thuận',
      'Cà Mau',
      'Cao Bằng',
      'Đắk Lắk',
      'Đắk Nông',
      'Điện Biên',
      'Đồng Nai',
      'Đồng Tháp',
      'Gia Lai',
      'Hà Giang',
      'Hà Nam',
      'Hà Tĩnh',
      'Hải Dương',
      'Hậu Giang',
      'Hòa Bình',
      'Hưng Yên',
      'Khánh Hòa',
      'Kiên Giang',
      'Kon Tum',
      'Lai Châu',
      'Lâm Đồng',
      'Lạng Sơn',
      'Lào Cai',
      'Long An',
      'Nam Định',
      'Nghệ An',
      'Ninh Bình',
      'Ninh Thuận',
      'Phú Thọ',
      'Phú Yên',
      'Quảng Bình',
      'Quảng Nam',
      'Quảng Ngãi',
      'Quảng Ninh',
      'Quảng Trị',
      'Sóc Trăng',
      'Sơn La',
      'Tây Ninh',
      'Thái Bình',
      'Thái Nguyên',
      'Thanh Hóa',
      'Thừa Thiên Huế',
      'Tiền Giang',
      'Trà Vinh',
      'Tuyên Quang',
      'Vĩnh Long',
      'Vĩnh Phúc',
      'Yên Bái',
    ];

    const aliases: Array<[string, string]> = [
      ['TP. Hồ Chí Minh', 'Hồ Chí Minh'],
      ['TP Hồ Chí Minh', 'Hồ Chí Minh'],
      ['TP.HCM', 'Hồ Chí Minh'],
      ['HCM', 'Hồ Chí Minh'],
      ['TP. Hà Nội', 'Hà Nội'],
      ['TP Hà Nội', 'Hà Nội'],
      ['HN', 'Hà Nội'],
      ['Thành phố Hồ Chí Minh', 'Hồ Chí Minh'],
      ['Thành phố Hà Nội', 'Hà Nội'],
      ['TP. Hải Phòng', 'Hải Phòng'],
      ['TP Hải Phòng', 'Hải Phòng'],
      ['TP. Đà Nẵng', 'Đà Nẵng'],
      ['TP Đà Nẵng', 'Đà Nẵng'],
      ['Thừa Thiên-Huế', 'Thừa Thiên Huế'],
    ];

    const set = new Set<string>();
    for (const p of provinces) set.add(locationKeyOf(p));
    for (const [alias] of aliases) set.add(locationKeyOf(alias));
    return set;
  }, []);

  const canonicalProvinceLabel = (value: string) => {
    const raw = (value || '').trim();
    if (!raw) return '';
    const key = locationKeyOf(raw);

    if (key.includes('ho chi minh') || key.includes('tp.hcm') || key === 'hcm') return 'Hồ Chí Minh';
    if (key === 'hn' || key.includes('ha noi')) return 'Hà Nội';
    if (key.includes('da nang')) return 'Đà Nẵng';
    if (key.includes('hai phong')) return 'Hải Phòng';
    if (key.includes('can tho')) return 'Cần Thơ';
    if (key.includes('thua thien') && key.includes('hue')) return 'Thừa Thiên Huế';
    return raw;
  };

  const deriveProvinceOrCity = (log: CustomerCallLog) => {
    const fromArea = (log.area || '').trim();
    const address = (log.address || '').trim();

    const addressLast = (() => {
      if (!address) return '';
      const parts = address
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean);
      return parts[parts.length - 1] ?? '';
    })();

    const areaClean = fromArea
      .replace(/^\s*(tx\.?|thi\s*xa|huy[eệ]n|qu[aậ]n|phu[oờ]ng|x[aã]|th[ịi]\s*tr[aấ]n|tp\.?|th[àa]nh\s*ph[oố]|t[ỉi]nh)\s+/i, '')
      .trim();

    const areaKey = locationKeyOf(areaClean || fromArea);
    if (areaKey && provinceKeySet.has(areaKey)) return canonicalProvinceLabel(areaClean || fromArea);

    const addrKey = locationKeyOf(addressLast);
    if (addrKey && provinceKeySet.has(addrKey)) return canonicalProvinceLabel(addressLast);

    const fallback = areaClean || addressLast || fromArea;
    return fallback.trim() || 'Khác';
  };

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
          setResumeProcessedEditing(false);
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

  const copyToClipboard = async (value: string, label: string) => {
    const text = (value || '').trim();
    if (!text) {
      setToastMessage(`Không có ${label} để copy.`);
      return;
    }

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const el = document.createElement('textarea');
        el.value = text;
        el.style.position = 'fixed';
        el.style.left = '-9999px';
        el.style.top = '0';
        document.body.appendChild(el);
        el.focus();
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
      setToastMessage(`Đã copy ${label}.`);
    } catch {
      setToastMessage(`Copy ${label} thất bại.`);
    }
  };

  const baseFilteredCallLogs = useMemo(() => {
    const now = new Date();
    const todayKey = now.toISOString().slice(0, 10);
    const weekStart = new Date(now);
    weekStart.setHours(0, 0, 0, 0);
    // Week is calculated as Monday..Sunday (vi-VN common expectation)
    // JS getDay(): Sunday=0, Monday=1, ... Saturday=6
    const dayOfWeek = weekStart.getDay();
    const daysSinceMonday = (dayOfWeek + 6) % 7;
    weekStart.setDate(weekStart.getDate() - daysSinceMonday);
    const weekStartEpoch = weekStart.getTime();

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

      const matchesProcessedTime = (() => {
        if (queueView !== 'processed') return true;
        if (processedFilter === 'all') return true;

        const epoch = (() => {
          if (log.callStatus === 'Chốt đơn') {
            const raw = (log.lastOrderAt || '').trim();
            if (raw) {
              const d = new Date(raw);
              if (!Number.isNaN(d.getTime())) return d.getTime();
            }
          }
          const raw = (log.lastInteractionAt || log.timestamp || '').trim();
          if (raw) {
            const d = new Date(raw);
            if (!Number.isNaN(d.getTime())) return d.getTime();
          }
          return null;
        })();

        if (epoch == null) return false;
        if (processedFilter === 'today') {
          const d = new Date(epoch);
          return d.toISOString().slice(0, 10) === todayKey;
        }
        return epoch >= weekStartEpoch;
      })();

      return matchesSearch && matchesQueue && matchesProcessedTime;
    });

    if (queueView !== 'callback') return filtered;
    return [...filtered].sort((a, b) => {
      const aTime = new Date(`${a.callbackDate || '9999-12-31'}T${(a.callbackTime || '').trim() ? a.callbackTime : '23:59'}`).getTime();
      const bTime = new Date(`${b.callbackDate || '9999-12-31'}T${(b.callbackTime || '').trim() ? b.callbackTime : '23:59'}`).getTime();
      return aTime - bTime;
    });
  }, [callLogs, processedFilter, searchTerm, queueView]);

  const searchFilteredCallLogs = useMemo(() => {
    const searchKey = searchTerm.trim().toLowerCase();
    if (!searchKey) return callLogs;
    return callLogs.filter((log) => {
      const haystack = [
        log.customerCode,
        log.customerName,
        log.phoneNumber,
        log.address,
        log.area,
        log.groupCode,
        log.partner,
        log.note,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(searchKey);
    });
  }, [callLogs, searchTerm]);

  const allAreaFacetIndex = useMemo(() => {
    const map = new Map<string, { key: string; label: string }>();
    for (const log of searchFilteredCallLogs) {
      const label = deriveProvinceOrCity(log);
      const key = label.toLowerCase();
      if (!map.has(key)) {
        map.set(key, { key, label });
      }
    }
    return map;
  }, [deriveProvinceOrCity, searchFilteredCallLogs]);

  const areaCountsForCurrentView = useMemo(() => {
    const map = new Map<string, number>();
    for (const log of baseFilteredCallLogs) {
      const key = deriveProvinceOrCity(log).toLowerCase();
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [baseFilteredCallLogs, deriveProvinceOrCity]);

  const areaFacets = useMemo(() => {
    const facets = Array.from(allAreaFacetIndex.values()).map(({ key, label }) => ({
      key,
      label,
      count: areaCountsForCurrentView.get(key) ?? 0,
    }));

    return facets.sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.label.localeCompare(b.label, 'vi');
    });
  }, [allAreaFacetIndex, areaCountsForCurrentView]);

  const selectedAreaLabel = useMemo(() => {
    if (selectedAreaKey === '__ALL__') return 'Tất cả khu vực';
    return areaFacets.find((facet) => facet.key === selectedAreaKey)?.label ?? selectedAreaKey;
  }, [areaFacets, selectedAreaKey]);

  const pinnedAreas = useMemo(() => {
    const pinnedSet = new Set(pinnedAreaKeys);
    const pinnedFromFacets = areaFacets.filter((facet) => pinnedSet.has(facet.key));
    const missingPinned = pinnedAreaKeys
      .filter((key) => pinnedSet.has(key) && !pinnedFromFacets.some((facet) => facet.key === key))
      .map((key) => ({ key, label: key, count: 0 }));

    return [...pinnedFromFacets, ...missingPinned].sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.label.localeCompare(b.label, 'vi');
    });
  }, [areaFacets, pinnedAreaKeys]);

  const areaOptions = useMemo(() => {
    const keyword = areaSearch.trim().toLowerCase();
    const options = keyword
      ? areaFacets.filter((facet) => facet.label.toLowerCase().includes(keyword))
      : areaFacets;
    return options;
  }, [areaFacets, areaSearch]);

  const togglePinArea = (key: string) => {
    setPinnedAreaKeys((prev) => {
      if (prev.includes(key)) return prev.filter((v) => v !== key);
      return [key, ...prev];
    });
  };

  const filteredCallLogs = useMemo(() => {
    if (selectedAreaKey === '__ALL__') return baseFilteredCallLogs;
    return baseFilteredCallLogs.filter((log) => {
      const label = deriveProvinceOrCity(log);
      return label.toLowerCase() === selectedAreaKey;
    });
  }, [baseFilteredCallLogs, deriveProvinceOrCity, selectedAreaKey]);

  const scopedLogsForCounts = useMemo(() => {
    const areaKey = selectedAreaKey;

    if (areaKey === '__ALL__') return searchFilteredCallLogs;
    return searchFilteredCallLogs.filter((log) => deriveProvinceOrCity(log).toLowerCase() === areaKey);
  }, [deriveProvinceOrCity, searchFilteredCallLogs, selectedAreaKey]);

  const countNew = useMemo(
    () => scopedLogsForCounts.filter((log) => log.callStatus === 'Mới').length,
    [scopedLogsForCounts]
  );

  const countCallback = useMemo(
    () => scopedLogsForCounts.filter((log) => log.callStatus === 'Hẹn gọi lại').length,
    [scopedLogsForCounts]
  );

  const countProcessed = useMemo(
    () => scopedLogsForCounts.filter((log) => ['Chốt đơn', 'Từ chối', 'Upsell'].includes(log.callStatus)).length,
    [scopedLogsForCounts]
  );

  const closedTodayCount = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return scopedLogsForCounts.filter((log) => {
      if (log.callStatus !== 'Chốt đơn') return false;
      const raw = (log.lastOrderAt || '').trim();
      if (!raw) return false;
      try {
        const d = new Date(raw);
        if (Number.isNaN(d.getTime())) return false;
        return d.toISOString().slice(0, 10) === today;
      } catch {
        return false;
      }
    }).length;
  }, [scopedLogsForCounts]);

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
    if (isCallbackStatus && !formData.callbackDate) {
      setToastMessage('Vui lòng chọn ngày hẹn gọi lại.');
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
          callbackTime: '',
          notes: formData.note,
          productsPurchased: formData.productsPurchased,
          productIds: Array.isArray((formData as unknown as { productIds?: string[] }).productIds)
            ? (formData as unknown as { productIds?: string[] }).productIds
            : [],
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
              callbackTime: '',
              note: formData.note,
              lastOrderAt:
                formData.callStatus === 'Chốt đơn' || formData.callStatus === 'Upsell'
                  ? new Date().toISOString()
                  : item.lastOrderAt,
              productsPurchased:
                formData.callStatus === 'Chốt đơn' || formData.callStatus === 'Upsell'
                  ? (formData.productsPurchased || '').trim()
                  : item.productsPurchased,
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
      setResumeProcessedEditing(false);
      setFormData({
        customerName: nextCustomer?.customerName ?? '',
        phoneNumber: nextCustomer?.phoneNumber ?? '',
        callStatus: '',
        revenue: '',
        callbackDate: new Date().toISOString().split('T')[0],
        callbackTime: '',
        assignedTo: loggedInUser,
        note: '',
        productsPurchased: nextCustomer?.productsPurchased ?? '',
        productIds: [],
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
    setResumeProcessedEditing(false);
    setFormData((prev) => ({
      ...prev,
      customerName: customer.customerName,
      phoneNumber: customer.phoneNumber,
      callStatus: ['Chốt đơn', 'Từ chối', 'Upsell', 'Hẹn gọi lại'].includes(customer.callStatus)
        ? customer.callStatus
        : '',
      revenue: '',
      callbackDate: customer.callbackDate || new Date().toISOString().split('T')[0],
      callbackTime: customer.callbackTime ?? '',
      assignedTo: loggedInUser,
      note: customer.note,
      productsPurchased: customer.productsPurchased ?? '',
    }));
  };

  const [productsExpanded, setProductsExpanded] = useState(false);

  const activeProducts = useMemo(() => {
    const raw = (activeCustomer?.productsPurchased ?? '').trim();
    if (!raw) return [];
    return raw
      .split(',')
      .map((p: string) => p.trim())
      .filter(Boolean);
  }, [activeCustomer]);

  const birthdayLabel = useMemo(() => {
    const value = activeCustomer?.birthday;
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('vi-VN');
  }, [activeCustomer]);

  const contractSignedLabel = useMemo(() => {
    const value = (activeCustomer as unknown as { contractSignedAt?: string | null } | null)?.contractSignedAt;
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('vi-VN');
  }, [activeCustomer]);

  const [editingCustomerDates, setEditingCustomerDates] = useState(false);
  const [draftBirthday, setDraftBirthday] = useState(() => {
    const raw = (activeCustomer?.birthday || '').trim();
    return raw ? raw.slice(0, 10) : '';
  });
  const [draftContractSignedAt, setDraftContractSignedAt] = useState(() => {
    const raw = ((activeCustomer as unknown as { contractSignedAt?: string | null } | null)?.contractSignedAt || '').trim();
    return raw ? raw.slice(0, 10) : '';
  });
  const [draftZaloConnected, setDraftZaloConnected] = useState<boolean>(() => Boolean(activeCustomer?.zaloConnected));

  const saveCustomerDates = async () => {
    if (!activeCustomer?.id) return;
    try {
      const response = await fetch('/api/customers/update-dates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: activeCustomer.id,
          birthday: draftBirthday,
          contractSignedAt: draftContractSignedAt,
          zaloConnected: draftZaloConnected,
        }),
      });
      if (!response.ok) {
        setToastMessage('Không thể cập nhật ngày ký hợp đồng / ngày sinh / Zalo.');
        return;
      }
      const data = (await response.json()) as {
        id: string;
        birthday?: string;
        contractSignedAt?: string;
        zaloConnected?: boolean;
      };
      setCallLogs((prev) =>
        prev.map((item) => {
          if (item.id !== data.id) return item;
          return {
            ...item,
            birthday: data.birthday ?? item.birthday,
            contractSignedAt: data.contractSignedAt ?? (item as unknown as { contractSignedAt?: string }).contractSignedAt,
            zaloConnected: typeof data.zaloConnected === 'boolean' ? data.zaloConnected : item.zaloConnected,
          };
        })
      );
      setSelectedCustomer((prev) => {
        if (!prev || prev.id !== data.id) return prev;
        return {
          ...prev,
          birthday: data.birthday ?? prev.birthday,
          contractSignedAt: data.contractSignedAt ?? (prev as unknown as { contractSignedAt?: string }).contractSignedAt,
          zaloConnected: typeof data.zaloConnected === 'boolean' ? data.zaloConnected : prev.zaloConnected,
        } as unknown as CustomerCallLog;
      });
      setEditingCustomerDates(false);
      setToastMessage('Đã cập nhật thông tin.');
    } catch {
      setToastMessage('Không thể cập nhật ngày ký hợp đồng / ngày sinh / Zalo.');
    }
  };

  const lastOrderLabel = useMemo(() => {
    const value = activeCustomer?.lastOrderAt;
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('vi-VN');
  }, [activeCustomer]);

  const nextCallLabel = useMemo(() => {
    if (!activeCustomer) return '';

    const status = (activeCustomer.callStatus || '').trim();
    const isClosed = status === 'Chốt đơn' || status === 'Upsell';
    if (isClosed) {
      const value = (activeCustomer.lastOrderAt || '').trim();
      if (value) {
        const d = new Date(value);
        if (!Number.isNaN(d.getTime())) {
          const next = new Date(d);
          next.setMonth(next.getMonth() + 1);
          return next.toLocaleDateString('vi-VN');
        }
      }
    }

    const hasCallback = (activeCustomer.callbackDate || '').trim();
    if (hasCallback) {
      try {
        const raw = activeCustomer.callbackTime
          ? `${activeCustomer.callbackDate}T${activeCustomer.callbackTime}`
          : `${activeCustomer.callbackDate}T09:00`;
        const d = new Date(raw);
        if (!Number.isNaN(d.getTime())) {
          return d.toLocaleString('vi-VN');
        }
      } catch {
        // ignore
      }
    }

    const base = (() => {
      const last = (activeCustomer.lastInteractionAt || '').trim();
      if (last) {
        const d = new Date(last);
        if (!Number.isNaN(d.getTime())) return d;
      }
      return new Date();
    })();

    const next = new Date(base);
    next.setMonth(next.getMonth() + 1);
    return next.toLocaleDateString('vi-VN');
  }, [activeCustomer]);

  const showNextCall = useMemo(() => {
    const status = (activeCustomer?.callStatus || '').trim();
    return status === 'Chốt đơn' || status === 'Upsell';
  }, [activeCustomer]);

  const showNotes = useMemo(() => {
    const status = (activeCustomer?.callStatus || '').trim();
    return status !== 'Mới';
  }, [activeCustomer]);

  const showProcessedOnlyInfo = useMemo(() => {
    const status = (activeCustomer?.callStatus || '').trim();
    return status === 'Chốt đơn' || status === 'Upsell';
  }, [activeCustomer]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="h-screen px-4 py-3 md:px-5 overflow-hidden" style={bgStyle}>
      <div className="max-w-full h-full">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="h-16 flex justify-between items-center mb-4"
        >
          <h1
            className={`text-2xl font-black bg-linear-to-r bg-clip-text text-transparent tracking-tight ${
              resolvedIsDark ? 'from-sky-200 via-blue-300 to-cyan-300' : 'from-blue-800 via-sky-700 to-cyan-600'
            }`}
          >
            Professional Telesales Workspace
          </h1>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsDark((prev) => !prev)}
              className={
                resolvedIsDark
                  ? 'h-10 px-3 rounded-2xl border border-white/10 bg-slate-900/35 hover:bg-slate-900/45 transition inline-flex items-center gap-2 text-sm font-bold text-slate-100'
                  : 'h-10 px-3 rounded-2xl border border-white/70 bg-white/65 hover:bg-white/80 transition inline-flex items-center gap-2 text-sm font-bold text-slate-800'
              }
              title="Chuyển sáng/tối"
              aria-label="Chuyển sáng/tối"
            >
              {resolvedIsDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {resolvedIsDark ? 'Light' : 'Dark'}
            </button>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleLogout}
              className="ui-btn"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Đăng xuất
            </motion.button>
          </div>
        </motion.div>
        <div className="h-[calc(100vh-80px)] grid grid-cols-1 xl:grid-cols-[25%_45%_30%] gap-4">
          <section className="h-full flex flex-col gap-3 overflow-hidden">
            <div className={`ui-card p-4 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search name or phone"
                  className="ui-input pl-10 pr-3"
                />
              </div>

              <div className="mb-2" ref={areaDropdownRef}>
                <div
                  className={`text-[11px] font-black uppercase tracking-[0.14em] mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
                >
                  Khu vực
                </div>

                <button
                  type="button"
                  onClick={() => setAreaDropdownOpen((v) => !v)}
                  className={`w-full h-10 rounded-xl border px-3 text-sm font-bold inline-flex items-center justify-between gap-2 transition ${
                    isDark
                      ? 'bg-white/5 border-white/10 text-slate-100 hover:bg-white/10'
                      : 'bg-white/55 border-white/65 text-slate-900 hover:bg-white/75'
                  }`}
                  aria-haspopup="listbox"
                  aria-expanded={areaDropdownOpen}
                >
                  <span className="min-w-0 truncate">{selectedAreaLabel}</span>
                  <span className="inline-flex items-center gap-2 shrink-0">
                    <ChevronDown className={`h-4 w-4 transition ${areaDropdownOpen ? 'rotate-180' : ''}`} />
                  </span>
                </button>

                {pinnedAreas.length > 0 && (
                  <div className="mt-2 flex items-center gap-2 overflow-x-auto ui-scrollbar pb-1">
                    {pinnedAreas.slice(0, 6).map((facet) => (
                      <div
                        key={`pin-${facet.key}`}
                        onClick={() => setSelectedAreaKey(facet.key)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedAreaKey(facet.key);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        className={`shrink-0 h-8 rounded-full px-3 text-[12px] font-bold border transition-all inline-flex items-center gap-2 ${
                          selectedAreaKey === facet.key
                            ? isDark
                              ? 'bg-white/15 border-white/25 text-slate-100'
                              : 'bg-white/70 border-white/60 text-slate-900'
                            : isDark
                              ? 'bg-white/5 border-white/10 text-slate-200 hover:bg-white/10'
                              : 'bg-white/30 border-white/20 text-slate-700 hover:bg-white/45'
                        }`}
                        title={facet.label}
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPinnedAreaKeys((prev) => prev.filter((v) => v !== facet.key));
                            setSelectedAreaKey((prev) => (prev === facet.key ? '__ALL__' : prev));
                          }}
                          className={`inline-flex items-center justify-center rounded-full h-6 w-6 border transition ${
                            isDark
                              ? 'bg-amber-500/15 border-amber-400/30 text-amber-200 hover:bg-amber-500/20'
                              : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
                          }`}
                          aria-label="Bỏ ghim khu vực"
                          title="Bỏ ghim"
                        >
                          <Pin className="h-3.5 w-3.5" />
                        </button>
                        <span className="max-w-36 truncate">{facet.label}</span>
                        <span
                          className={`inline-flex items-center justify-center min-w-6 h-5 px-1.5 rounded-full text-[11px] font-black border ${
                            isDark ? 'bg-white/5 border-white/10 text-slate-200' : 'bg-white/40 border-white/60 text-slate-700'
                          }`}
                          title="Số khách trong khu vực này"
                        >
                          {facet.count}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {areaDropdownOpen && (
                  <div
                    className={`relative mt-2 rounded-2xl border p-3 shadow-lg ${
                      isDark
                        ? 'bg-slate-900/95 border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.55)]'
                        : 'bg-white/95 border-white/70 shadow-[0_20px_60px_rgba(15,23,42,0.15)]'
                    }`}
                    role="listbox"
                  >
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          value={areaSearch}
                          onChange={(e) => setAreaSearch(e.target.value)}
                          placeholder="Tìm khu vực..."
                          className="ui-input pl-10 pr-9"
                        />
                        {areaSearch.trim() && (
                          <button
                            type="button"
                            onClick={() => setAreaSearch('')}
                            className={`absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg border inline-flex items-center justify-center transition ${
                              isDark
                                ? 'bg-white/5 border-white/10 hover:bg-white/10'
                                : 'bg-white/40 border-white/60 hover:bg-white/65'
                            }`}
                            aria-label="Clear search"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-2 max-h-64 overflow-y-auto ui-scrollbar pr-1">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedAreaKey('__ALL__');
                          setAreaDropdownOpen(false);
                        }}
                        className={`w-full rounded-xl px-3 py-2 text-sm font-bold border transition flex items-center justify-between gap-3 ${
                          selectedAreaKey === '__ALL__'
                            ? isDark
                              ? 'bg-white/15 border-white/25 text-slate-100'
                              : 'bg-slate-900/5 border-slate-200 text-slate-900'
                            : isDark
                              ? 'bg-white/5 border-white/10 text-slate-200 hover:bg-white/10'
                              : 'bg-white/50 border-white/70 text-slate-700 hover:bg-white/70'
                        }`}
                      >
                        <span className="truncate">Tất cả khu vực</span>
                        <span className={`text-xs font-black ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>
                          {baseFilteredCallLogs.length}
                        </span>
                      </button>

                      {areaOptions.length === 0 ? (
                        <div className={`mt-2 text-sm px-2 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                          Không có khu vực phù hợp.
                        </div>
                      ) : (
                        <div className="mt-2 space-y-1">
                          {areaOptions.map((facet) => {
                            const pinned = pinnedAreaKeys.includes(facet.key);
                            const selected = selectedAreaKey === facet.key;
                            return (
                              <div
                                key={facet.key}
                                className={`w-full rounded-xl border px-3 py-2 transition flex items-center justify-between gap-3 ${
                                  selected
                                    ? isDark
                                      ? 'bg-white/15 border-white/25'
                                      : 'bg-slate-900/5 border-slate-200'
                                    : isDark
                                      ? 'bg-white/5 border-white/10 hover:bg-white/10'
                                      : 'bg-white/50 border-white/70 hover:bg-white/70'
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedAreaKey(facet.key);
                                    setAreaDropdownOpen(false);
                                  }}
                                  className="flex-1 min-w-0 text-left"
                                >
                                  <div className={`text-sm font-bold truncate ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                                    {facet.label}
                                  </div>
                                  <div className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                    {facet.count} khách
                                  </div>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => togglePinArea(facet.key)}
                                  className={`h-9 w-9 rounded-xl border inline-flex items-center justify-center transition ${
                                    pinned
                                      ? isDark
                                        ? 'bg-amber-500/15 border-amber-400/30 text-amber-200'
                                        : 'bg-amber-50 border-amber-200 text-amber-700'
                                      : isDark
                                        ? 'bg-white/5 border-white/10 text-slate-200 hover:bg-white/10'
                                        : 'bg-white/40 border-white/60 text-slate-700 hover:bg-white/65'
                                  }`}
                                  aria-label={pinned ? 'Unpin area' : 'Pin area'}
                                  title={pinned ? 'Bỏ ghim' : 'Ghim khu vực'}
                                >
                                  <Pin className="h-4 w-4" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {loggedInRole === 'ADMIN' && (
                <div className="mb-2">
                  <select
                    value={adminAssignedToId}
                    onChange={(e) => setAdminAssignedToId(e.target.value)}
                    className="ui-input"
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
                  onClick={() => {
                    setQueueView('pending');
                    setResumeProcessedEditing(false);
                  }}
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
                  onClick={() => {
                    setQueueView('callback');
                    setResumeProcessedEditing(false);
                  }}
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
                  onClick={() => {
                    setQueueView('processed');
                    setResumeProcessedEditing(false);
                  }}
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

              {queueView === 'processed' && (
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setProcessedFilter('all')}
                    className={`h-9 rounded-lg text-[12px] font-bold border transition-all ${
                      processedFilter === 'all'
                        ? isDark
                          ? 'bg-white/15 border-white/25 text-slate-100'
                          : 'bg-white/70 border-white/60 text-slate-900'
                        : isDark
                          ? 'bg-white/5 border-white/10 text-slate-200 hover:bg-white/10'
                          : 'bg-white/30 border-white/20 text-slate-700 hover:bg-white/45'
                    }`}
                  >
                    Tất cả
                  </button>
                  <button
                    type="button"
                    onClick={() => setProcessedFilter('today')}
                    className={`h-9 rounded-lg text-[12px] font-bold border transition-all ${
                      processedFilter === 'today'
                        ? isDark
                          ? 'bg-white/15 border-white/25 text-slate-100'
                          : 'bg-white/70 border-white/60 text-slate-900'
                        : isDark
                          ? 'bg-white/5 border-white/10 text-slate-200 hover:bg-white/10'
                          : 'bg-white/30 border-white/20 text-slate-700 hover:bg-white/45'
                    }`}
                  >
                    Hôm nay
                  </button>
                  <button
                    type="button"
                    onClick={() => setProcessedFilter('week')}
                    className={`h-9 rounded-lg text-[12px] font-bold border transition-all ${
                      processedFilter === 'week'
                        ? isDark
                          ? 'bg-white/15 border-white/25 text-slate-100'
                          : 'bg-white/70 border-white/60 text-slate-900'
                        : isDark
                          ? 'bg-white/5 border-white/10 text-slate-200 hover:bg-white/10'
                          : 'bg-white/30 border-white/20 text-slate-700 hover:bg-white/45'
                    }`}
                  >
                    Tuần này
                  </button>
                </div>
              )}
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
            <div className={`ui-card p-5 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              <p className={`text-xs uppercase tracking-[0.15em] mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Currently Calling
              </p>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className={`text-xs font-bold tracking-wide ${isDark ? 'text-sky-300' : 'text-blue-700'} truncate`}>
                      {activeCustomer?.customerCode ?? '--'}
                    </div>
                  </div>

                  <h2 className={`mt-1 text-xl font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'} truncate`}>
                    {activeCustomer?.customerName ?? 'No customer selected'}
                  </h2>

                  <div className="mt-2 flex items-start justify-between gap-2">
                    <div className="grid gap-2 grid-cols-1 md:grid-cols-3 flex-1 min-w-0">
                      <div
                        className={`rounded-2xl border px-3 py-1.5 text-sm ${
                          isDark ? 'bg-white/5 border-white/10' : 'bg-white/35 border-white/30'
                        }`}
                      >
                        <div className={`text-[11px] font-bold tracking-wide ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          Ngày ký hợp đồng
                        </div>
                        <div className="mt-0.5 inline-flex items-center gap-2 min-w-0">
                          <CalendarDays className={`h-4 w-4 ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`} />
                          {!editingCustomerDates ? (
                            <span className={`${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{contractSignedLabel || '--/--/----'}</span>
                          ) : (
                            <div
                              className="relative w-32 max-w-full"
                              onClick={() => {
                                const el = contractSignedInputRef.current;
                                if (!el) return;
                                const api = el as unknown as { showPicker?: () => void };
                                if (typeof api.showPicker === 'function') {
                                  api.showPicker();
                                  return;
                                }
                                el.focus();
                                el.click();
                              }}
                            >
                              <input
                                type="date"
                                ref={contractSignedInputRef}
                                value={draftContractSignedAt}
                                onChange={(e) => setDraftContractSignedAt(e.target.value)}
                                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                              />
                              <div
                                className={`pointer-events-none h-7 w-full rounded-xl px-2 text-xs font-semibold border inline-flex items-center ${
                                  isDark
                                    ? 'bg-slate-950/30 border-white/10 text-slate-100'
                                    : 'bg-white/60 border-white/60 text-slate-900'
                                }`}
                              >
                                {draftContractSignedAt
                                  ? draftContractSignedAt.split('-').reverse().join('/')
                                  : 'Chọn ngày'}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div
                        className={`rounded-2xl border px-3 py-1.5 text-sm ${
                          isDark ? 'bg-white/5 border-white/10' : 'bg-white/35 border-white/30'
                        }`}
                      >
                        <div className={`text-[11px] font-bold tracking-wide ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          Ngày sinh
                        </div>
                        <div className="mt-0.5 inline-flex items-center gap-2 min-w-0">
                          <Cake className={`h-4 w-4 ${isDark ? 'text-amber-300' : 'text-amber-700'}`} />
                          {!editingCustomerDates ? (
                            <span className={`${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{birthdayLabel || '--/--/----'}</span>
                          ) : (
                            <div
                              className="relative w-32 max-w-full"
                              onClick={() => {
                                const el = birthdayInputRef.current;
                                if (!el) return;
                                const api = el as unknown as { showPicker?: () => void };
                                if (typeof api.showPicker === 'function') {
                                  api.showPicker();
                                  return;
                                }
                                el.focus();
                                el.click();
                              }}
                            >
                              <input
                                type="date"
                                ref={birthdayInputRef}
                                value={draftBirthday}
                                onChange={(e) => setDraftBirthday(e.target.value)}
                                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                              />
                              <div
                                className={`pointer-events-none h-7 w-full rounded-xl px-2 text-xs font-semibold border inline-flex items-center ${
                                  isDark
                                    ? 'bg-slate-950/30 border-white/10 text-slate-100'
                                    : 'bg-white/60 border-white/60 text-slate-900'
                                }`}
                              >
                                {draftBirthday ? draftBirthday.split('-').reverse().join('/') : 'Chọn ngày'}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div
                        className={`rounded-2xl border px-3 py-1.5 text-sm ${
                          isDark ? 'bg-white/5 border-white/10' : 'bg-white/35 border-white/30'
                        }`}
                      >
                        <div className={`text-[11px] font-bold tracking-wide ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          Zalo
                        </div>
                        <div className="mt-0.5 inline-flex items-center gap-2 min-w-0">
                          <ZaloIcon className="h-5 w-5" />
                          {!editingCustomerDates ? (
                            <span className={`${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{
                              activeCustomer?.zaloConnected ? 'Đã kết nối' : 'Chưa kết nối'
                            }</span>
                          ) : (
                            <select
                              value={draftZaloConnected ? 'connected' : 'disconnected'}
                              onChange={(e) => setDraftZaloConnected(e.target.value === 'connected')}
                              className={`h-7 w-32 max-w-full rounded-xl px-2 text-xs font-semibold outline-none border ${
                                isDark
                                  ? 'bg-slate-950/30 border-white/10 text-slate-100'
                                  : 'bg-white/60 border-white/60 text-slate-900'
                              }`}
                            >
                              <option value="connected">Đã kết nối</option>
                              <option value="disconnected">Chưa kết nối</option>
                            </select>
                          )}
                        </div>
                      </div>
                    </div>

                    {!editingCustomerDates ? (
                      <button
                        type="button"
                        onClick={() => setEditingCustomerDates(true)}
                        className={`shrink-0 inline-flex items-center justify-center rounded-xl border h-9 w-9 transition ${
                          isDark ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white/35 border-white/50 hover:bg-white/55'
                        }`}
                        title="Sửa ngày ký hợp đồng / ngày sinh / Zalo"
                        aria-label="Sửa ngày ký hợp đồng / ngày sinh / Zalo"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    ) : (
                      <div className="shrink-0 inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => void saveCustomerDates()}
                          className={`inline-flex items-center justify-center rounded-xl border h-9 w-9 transition ${
                            isDark
                              ? 'bg-emerald-500/15 border-emerald-400/25 text-emerald-200 hover:bg-emerald-500/20'
                              : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                          }`}
                          title="Lưu"
                          aria-label="Lưu"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingCustomerDates(false)}
                          className={`inline-flex items-center justify-center rounded-xl border h-9 w-9 transition ${
                            isDark ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white/35 border-white/50 hover:bg-white/55'
                          }`}
                          title="Hủy"
                          aria-label="Hủy"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="shrink-0 inline-flex flex-col items-end">
                  <div
                    className={`inline-flex flex-col items-end gap-1 rounded-xl border px-2.5 py-1 text-sm ${
                      isDark ? 'bg-white/5 border-white/10 text-slate-200' : 'bg-white/45 border-white/60 text-slate-700'
                    }`}
                  >
                    <div className={`text-[11px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                      Đối tác: {activeCustomer?.partner ? activeCustomer.partner : '--'}
                    </div>
                    <div className="inline-flex items-center gap-1.5">
                      <Phone className="h-4 w-4 mr-2" />
                      <span className="font-semibold">{activeCustomer?.phoneNumber ?? '--'}</span>
                      <button
                        type="button"
                        onClick={() => void copyToClipboard(activeCustomer?.phoneNumber ?? '', 'SĐT')}
                        className={`ml-1 inline-flex items-center justify-center rounded-lg border h-7 w-7 transition ${
                          isDark
                            ? 'bg-white/5 border-white/10 hover:bg-white/10'
                            : 'bg-white/35 border-white/50 hover:bg-white/55'
                        }`}
                        title="Copy số điện thoại"
                        aria-label="Copy số điện thoại"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center gap-2 flex-wrap justify-end">
                    <span
                      className={`ui-chip ${
                        isDark ? 'bg-white/5 border-white/10 text-slate-200' : 'bg-white/45 border-white/60 text-slate-700'
                      }`}
                      title="Trạng thái khách hàng"
                    >
                      Status: {activeCustomer?.callStatus ?? 'Mới'}
                    </span>
                  </div>
                </div>
              </div>

              {showProcessedOnlyInfo && (
                <div className="mt-3 grid gap-2 grid-cols-1 md:grid-cols-2">
                  <div
                    className={`rounded-2xl border px-3 py-2 text-sm ${
                      isDark ? 'bg-white/5 border-white/10' : 'bg-white/35 border-white/30'
                    }`}
                  >
                    <div className={`text-xs font-bold tracking-wide ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Chốt đơn gần nhất</div>
                    <div className="mt-1 inline-flex items-center gap-2">
                      <Package className={`h-4 w-4 ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`} />
                      <span className={`${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{lastOrderLabel || '--'}</span>
                    </div>
                  </div>

                  <div
                    className={`rounded-2xl border px-3 py-2 text-sm ${
                      isDark ? 'bg-white/5 border-white/10' : 'bg-white/35 border-white/30'
                    }`}
                  >
                    <div className={`text-xs font-bold tracking-wide ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Lịch gọi tiếp theo</div>
                    <div className={`mt-1 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{nextCallLabel || '--'}</div>
                  </div>
                </div>
              )}

              {showProcessedOnlyInfo && (
                <div className={`mt-3 rounded-2xl border px-3 py-2 ${isDark ? 'bg-white/5 border-white/10' : 'bg-white/35 border-white/30'}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className={`text-xs font-bold tracking-wide ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Mặt hàng đã lấy</div>
                    {activeProducts.length > 6 && (
                      <button
                        type="button"
                        onClick={() => setProductsExpanded((v: boolean) => !v)}
                        className={`text-xs font-bold underline underline-offset-4 ${isDark ? 'text-sky-300' : 'text-blue-700'}`}
                      >
                        {productsExpanded ? 'Thu gọn' : 'Xem thêm'}
                      </button>
                    )}
                  </div>

                  {activeProducts.length === 0 ? (
                    <div className={`mt-1 text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>--</div>
                  ) : (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(productsExpanded ? activeProducts : activeProducts.slice(0, 6)).map((p) => (
                        <span
                          key={p}
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                            isDark ? 'bg-white/5 border-white/10 text-slate-100' : 'bg-white/45 border-white/60 text-slate-800'
                          }`}
                        >
                          <Tag className="h-3.5 w-3.5" />
                          <span className="max-w-55 truncate" title={p}>
                            {p}
                          </span>
                        </span>
                      ))}
                      {!productsExpanded && activeProducts.length > 6 && (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold ${
                            isDark ? 'bg-white/5 border-white/10 text-slate-200' : 'bg-white/35 border-white/60 text-slate-700'
                          }`}
                        >
                          +{activeProducts.length - 6}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {showNotes && (
                <div className={`mt-3 rounded-2xl border px-3 py-2 text-sm ${isDark ? 'bg-white/5 border-white/10' : 'bg-white/35 border-white/30'}`}>
                  <div className={`text-xs font-bold tracking-wide ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Ghi chú</div>
                  <div className={`mt-1 whitespace-pre-wrap ${isDark ? 'text-slate-100' : 'text-slate-900'}`} title={activeCustomer?.note || ''}>
                    {activeCustomer?.note ? activeCustomer.note : '--'}
                  </div>
                </div>
              )}
            </div>

            <div className={`ui-card p-6 flex-1 overflow-hidden ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
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
                <div className="mt-4 space-y-3 h-[calc(100%-100px)] overflow-y-auto ui-scrollbar pr-1">
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
                      <div className="text-sm"><span className="font-semibold">Mặt hàng đã lấy:</span> {(item.productsPurchased || '').trim() ? item.productsPurchased : '--'}</div>
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

          <section className="h-full">
            <div className={`ui-card p-5 h-full overflow-y-auto ui-scrollbar ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              <h3 className={`text-lg font-semibold mb-3 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>Call Interface</h3>
              {queueView === 'processed' && !resumeProcessedEditing ? (
                <div
                  className={`rounded-2xl border p-4 ${
                    isDark ? 'bg-white/5 border-white/10' : 'bg-white/35 border-white/30'
                  }`}
                >
                  <div className={`text-sm ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                    Khách hàng ở tab <span className="font-bold">Đã xử lý</span>. Bạn có thể tiếp tục cập nhật kết quả nếu cần.
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const currentStatus = (activeCustomer?.callStatus || 'Mới') as CallStatus;
                      setFormData((prev) => ({ ...prev, callStatus: currentStatus }));
                      setResumeProcessedEditing(true);
                    }}
                    className={`mt-3 w-full h-10 rounded-xl text-sm font-bold border transition ${
                      isDark
                        ? 'bg-white/10 border-white/15 text-slate-100 hover:bg-white/15'
                        : 'bg-white/60 border-white/70 text-slate-800 hover:bg-white/80'
                    }`}
                  >
                    Tiếp tục xử lý
                  </button>
                </div>
              ) : (
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
              )}
              {isSaving && (
                <p className={`text-xs mt-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Đang lưu nhật ký cuộc gọi...</p>
              )}
            </div>
          </section>
        </div>
      </div>
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50">
          <div className="ui-card-soft rounded-2xl px-4 py-2 text-sm">
            {toastMessage}
          </div>
        </div>
      )}
    </div>
  );
}
