"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, UserRound } from "lucide-react";
import { motion } from "framer-motion";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async () => {
    if (!form.username.trim() || !form.password.trim()) {
      setError("Vui lòng nhập đầy đủ tài khoản và mật khẩu.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.message ?? "Đăng nhập thất bại.");
        return;
      }

      const data = (await response.json()) as { role?: "admin" | "user" };
      router.push(data.role === "admin" ? "/admin" : "/");
      router.refresh();
    } catch {
      setError("Không thể kết nối máy chủ. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen px-4 py-8 md:px-6 md:py-10 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md ui-card p-8"
      >
        <h1 className="text-3xl font-black mb-2 text-foreground">Telesales CRM</h1>
        <p className="mb-6 opacity-80 text-foreground">Đăng nhập để vào màn hình telesales.</p>
        <div className="space-y-4">
          <div className="relative">
            <UserRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-60" />
            <input
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="Tên đăng nhập"
              className="ui-input pl-10 pr-3"
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-60" />
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Mật khẩu"
              className="ui-input pl-10 pr-3"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  void handleLogin();
                }
              }}
            />
          </div>
          {error && (
            <div className="rounded-2xl border px-3 py-2 text-sm font-semibold bg-rose-500/10 border-rose-500/20 text-rose-600">
              {error}
            </div>
          )}
          <button
            onClick={() => void handleLogin()}
            disabled={isSubmitting}
            className="w-full ui-btn ui-btn-primary disabled:opacity-60"
          >
            {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
