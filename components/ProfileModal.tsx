"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { UserCircle, Camera, Save, X, TrendingUp, PhoneCall, Eye, EyeOff, Lock } from "lucide-react";

interface UserProfile {
  id: string;
  username: string;
  fullName: string | null;
  phoneNumber: string | null;
  email: string | null;
  avatarUrl: string | null;
  bio: string | null;
  role: string;
  stats?: {
    totalCalls: number;
    closedDeals: number;
    closeRate: number;
  };
}

interface UserStats {
  totalCalls: number;
  closedDeals: number;
  closeRate: number;
}

type Props = {
  open: boolean;
  onClose: () => void;
  isDark?: boolean;
  onProfileUpdate?: (profile: { fullName: string | null; avatarUrl: string | null }) => void;
};

export default function ProfileModal({ open, onClose, isDark = false, onProfileUpdate }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats>({ totalCalls: 0, closedDeals: 0, closeRate: 0 });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    fullName: "",
    phoneNumber: "",
    email: "",
    bio: "",
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [changingPassword, setChangingPassword] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/user/profile");
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        throw new Error("Failed to fetch profile");
      }
      const data = (await res.json()) as UserProfile;
      setUser(data);
      setStats(data.stats || { totalCalls: 0, closedDeals: 0, closeRate: 0 });
      setFormData({
        fullName: data.fullName || "",
        phoneNumber: data.phoneNumber || "",
        email: data.email || "",
        bio: data.bio || "",
      });
      if (data.avatarUrl) {
        setAvatarPreview(data.avatarUrl);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      setToast({ type: "error", message: "Không thể tải thông tin người dùng." });
    }
  }, [router]);

  useEffect(() => {
    if (!open) return;
    const loadData = async () => {
      await fetchProfile();
    };
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setAvatarPreview(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        fullName: formData.fullName || undefined,
        phoneNumber: formData.phoneNumber || undefined,
        email: formData.email || undefined,
        avatarUrl: avatarPreview || undefined,
        bio: formData.bio || undefined,
      };
      console.log("Sending to API:", payload);

      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error("Server Error Details:", errorData);
        
        if (res.status === 404) {
          throw new Error("Không tìm thấy người dùng trong hệ thống. Vui lòng đăng nhập lại.");
        } else if (res.status === 401) {
          throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        } else {
          throw new Error(errorData.message || "Không thể cập nhật thông tin");
        }
      }

      const updatedUser = (await res.json()) as UserProfile;
      setUser(updatedUser);
      setStats(updatedUser.stats || { totalCalls: 0, closedDeals: 0, closeRate: 0 });
      setToast({ type: "success", message: "Đã cập nhật thông tin thành công." });
      
      // Update parent state
      if (onProfileUpdate) {
        onProfileUpdate({
          fullName: updatedUser.fullName,
          avatarUrl: updatedUser.avatarUrl,
        });
      }

      // Refresh router to update header
      router.refresh();
      
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      console.error("Error updating profile:", error);
      const errorMessage = error instanceof Error ? error.message : "Không thể cập nhật thông tin";
      setToast({ type: "error", message: errorMessage });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setToast({ type: "error", message: "Mật khẩu mới không khớp." });
      return;
    }
    if (passwordData.newPassword.length < 6) {
      setToast({ type: "error", message: "Mật khẩu mới phải có ít nhất 6 ký tự." });
      return;
    }
    if (!passwordData.currentPassword) {
      setToast({ type: "error", message: "Vui lòng nhập mật khẩu hiện tại." });
      return;
    }

    setChangingPassword(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Không thể đổi mật khẩu");
      }

      setToast({ type: "success", message: "Đã đổi mật khẩu thành công." });
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error) {
      console.error("Error changing password:", error);
      const errorMessage = error instanceof Error ? error.message : "Không thể đổi mật khẩu";
      setToast({ type: "error", message: errorMessage });
    } finally {
      setChangingPassword(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={`w-full max-w-4xl rounded-2xl border shadow-[0_24px_80px_rgba(0,0,0,0.45)] overflow-hidden ${
          isDark ? "bg-slate-950/95 border-white/10 text-slate-100" : "bg-white/95 border-white/70 text-slate-900"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className={`text-xl font-bold bg-linear-to-r bg-clip-text text-transparent ${
            isDark ? "from-sky-200 via-blue-300 to-cyan-300" : "from-blue-800 via-sky-700 to-cyan-600"
          }`}>
            Hồ sơ cá nhân
          </h2>
          <button
            type="button"
            onClick={onClose}
            className={`h-10 w-10 rounded-2xl border inline-flex items-center justify-center transition ${
              isDark ? "bg-white/5 border-white/10 hover:bg-white/10 text-slate-200" : "bg-white border-slate-300 hover:bg-slate-50 text-slate-700"
            }`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 max-h-[80vh] overflow-y-auto">
          {/* Left Column - Avatar & Stats */}
          <div className="space-y-6">
            {/* Avatar Section */}
            <div className={`ui-card p-6 text-center ${isDark ? "text-slate-100" : "text-slate-900"}`}>
              <div className="relative mx-auto w-32 h-32 mb-4">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Avatar"
                    className="w-full h-full rounded-full object-cover border-4 border-slate-200 dark:border-slate-700"
                  />
                ) : (
                  <div className={`w-full h-full rounded-full border-4 flex items-center justify-center ${
                    isDark ? "border-slate-700 bg-slate-800" : "border-slate-300 bg-slate-100"
                  }`}>
                    <UserCircle className="h-20 w-20 text-slate-400" />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 h-10 w-10 rounded-full bg-sky-500 text-white border-4 border-background flex items-center justify-center hover:bg-sky-600 transition"
                  title="Đổi ảnh đại diện"
                >
                  <Camera className="h-5 w-5" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>
              <h2 className="text-xl font-bold">{user?.fullName || user?.username || "Người dùng"}</h2>
              <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>@{user?.username}</p>
              <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold ${
                user?.role === "ADMIN"
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                  : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
              }`}>
                {user?.role === "ADMIN" ? "Quản trị viên" : "Nhân viên"}
              </span>
            </div>

            {/* Stats Section */}
            <div className={`ui-card p-6 ${isDark ? "text-slate-100" : "text-slate-900"}`}>
              <h3 className="text-lg font-bold mb-4">Thống kê</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${isDark ? "bg-slate-800" : "bg-slate-100"}`}>
                      <PhoneCall className="h-5 w-5 text-sky-500" />
                    </div>
                    <span className={`text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>Tổng cuộc gọi</span>
                  </div>
                  <span className="text-xl font-bold">{stats.totalCalls}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${isDark ? "bg-slate-800" : "bg-slate-100"}`}>
                      <TrendingUp className="h-5 w-5 text-emerald-500" />
                    </div>
                    <span className={`text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>Chốt đơn</span>
                  </div>
                  <span className="text-xl font-bold">{stats.closedDeals}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${isDark ? "bg-slate-800" : "bg-slate-100"}`}>
                      <TrendingUp className="h-5 w-5 text-amber-500" />
                    </div>
                    <span className={`text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>Tỷ lệ chốt</span>
                  </div>
                  <span className="text-xl font-bold">{stats.closeRate.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Form */}
          <div className="lg:col-span-2">
            <div className={`ui-card p-6 ${isDark ? "text-slate-100" : "text-slate-900"}`}>
              <h3 className="text-lg font-bold mb-6">Thông tin cơ bản</h3>
              <div className="space-y-4">
                <div>
                  <label className={`text-sm font-semibold ${isDark ? "text-slate-200" : "text-slate-700"}`}>Họ và tên</label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, fullName: e.target.value }))}
                    placeholder="Nhập họ và tên của bạn"
                    className={`mt-1 h-11 w-full px-3 rounded-2xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${
                      isDark ? "bg-white/5 border-white/10 text-white" : "bg-white border-slate-300 text-slate-900"
                    }`}
                  />
                </div>

                <div>
                  <label className={`text-sm font-semibold ${isDark ? "text-slate-200" : "text-slate-700"}`}>Số điện thoại</label>
                  <input
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData((prev) => ({ ...prev, phoneNumber: e.target.value }))}
                    placeholder="Nhập số điện thoại"
                    className={`mt-1 h-11 w-full px-3 rounded-2xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${
                      isDark ? "bg-white/5 border-white/10 text-white" : "bg-white border-slate-300 text-slate-900"
                    }`}
                  />
                </div>

                <div>
                  <label className={`text-sm font-semibold ${isDark ? "text-slate-200" : "text-slate-700"}`}>Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="Nhập email"
                    className={`mt-1 h-11 w-full px-3 rounded-2xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${
                      isDark ? "bg-white/5 border-white/10 text-white" : "bg-white border-slate-300 text-slate-900"
                    }`}
                  />
                </div>

                <div>
                  <label className={`text-sm font-semibold ${isDark ? "text-slate-200" : "text-slate-700"}`}>Chữ ký cá nhân (Bio)</label>
                  <textarea
                    value={formData.bio}
                    onChange={(e) => setFormData((prev) => ({ ...prev, bio: e.target.value }))}
                    placeholder="Giới thiệu ngắn về bản thân..."
                    rows={4}
                    className={`mt-1 w-full px-3 rounded-2xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 resize-none ${
                      isDark ? "bg-white/5 border-white/10 text-white" : "bg-white border-slate-300 text-slate-900"
                    }`}
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className={`h-11 px-4 rounded-2xl border text-sm font-bold transition disabled:opacity-60 ${
                      isDark
                        ? "bg-sky-500/25 border-sky-400/30 hover:bg-sky-500/30 text-slate-100"
                        : "bg-sky-500/15 border-sky-500/20 hover:bg-sky-500/20 text-slate-900"
                    }`}
                  >
                    <Save className="h-4 w-4" />
                    {saving ? "Đang lưu..." : "Lưu thay đổi"}
                  </button>
                </div>
              </div>
            </div>

            {/* Password Change Section - Only for non-Admin users */}
            {user?.role !== "ADMIN" && (
              <div className={`ui-card p-6 ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Đổi mật khẩu
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className={`text-sm font-semibold ${isDark ? "text-slate-200" : "text-slate-700"}`}>Mật khẩu hiện tại</label>
                    <div className="relative">
                      <input
                        type={showPasswords.current ? "text" : "password"}
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData((prev) => ({ ...prev, currentPassword: e.target.value }))}
                        placeholder="Nhập mật khẩu hiện tại"
                        className={`mt-1 h-11 w-full px-3 pr-10 rounded-2xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${
                          isDark ? "bg-white/5 border-white/10 text-white" : "bg-white border-slate-300 text-slate-900"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords((prev) => ({ ...prev, current: !prev.current }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      >
                        {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className={`text-sm font-semibold ${isDark ? "text-slate-200" : "text-slate-700"}`}>Mật khẩu mới</label>
                    <div className="relative">
                      <input
                        type={showPasswords.new ? "text" : "password"}
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData((prev) => ({ ...prev, newPassword: e.target.value }))}
                        placeholder="Nhập mật khẩu mới (ít nhất 6 ký tự)"
                        className={`mt-1 h-11 w-full px-3 pr-10 rounded-2xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${
                          isDark ? "bg-white/5 border-white/10 text-white" : "bg-white border-slate-300 text-slate-900"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords((prev) => ({ ...prev, new: !prev.new }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      >
                        {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className={`text-sm font-semibold ${isDark ? "text-slate-200" : "text-slate-700"}`}>Xác nhận mật khẩu mới</label>
                    <div className="relative">
                      <input
                        type={showPasswords.confirm ? "text" : "password"}
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                        placeholder="Nhập lại mật khẩu mới"
                        className={`mt-1 h-11 w-full px-3 pr-10 rounded-2xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${
                          isDark ? "bg-white/5 border-white/10 text-white" : "bg-white border-slate-300 text-slate-900"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords((prev) => ({ ...prev, confirm: !prev.confirm }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      >
                        {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handlePasswordChange}
                      disabled={changingPassword || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                      className={`h-11 px-4 rounded-2xl border text-sm font-bold transition disabled:opacity-60 ${
                        isDark
                          ? "bg-emerald-500/25 border-emerald-400/30 hover:bg-emerald-500/30 text-slate-100"
                          : "bg-emerald-500/15 border-emerald-500/20 hover:bg-emerald-500/20 text-slate-900"
                      }`}
                    >
                      <Lock className="h-4 w-4" />
                      {changingPassword ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Admin Message - Only for Admin users */}
            {user?.role === "ADMIN" && (
              <div className={`ui-card p-6 ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <Lock className="h-5 w-5 text-amber-500" />
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    Tài khoản Admin không được phép đổi mật khẩu tại đây. Vui lòng liên hệ quản trị viên hệ thống.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Toast Notification */}
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`absolute bottom-6 right-6 ui-card-soft rounded-2xl px-4 py-3 text-sm ${
              toast.type === "success" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {toast.message}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
