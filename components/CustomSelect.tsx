"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  isDark?: boolean;
}

export default function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "Chọn...",
  disabled = false,
  className = "",
  isDark = false,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`h-11 w-full px-3 rounded-2xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 flex items-center justify-between transition-all ${
          disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
        } ${
          isDark
            ? "bg-slate-900/80 border-slate-700 text-slate-200 hover:border-slate-600"
            : "bg-white border-slate-300 text-slate-900 hover:border-slate-400"
        }`}
      >
        <span className={selectedOption ? "" : "opacity-50"}>
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""} ${
            isDark ? "text-slate-400" : "text-slate-500"
          }`}
        />
      </button>

      {isOpen && !disabled && (
        <div
          className={`absolute z-50 w-full mt-1 rounded-2xl border shadow-xl max-h-60 overflow-y-auto ui-scrollbar ${
            isDark
              ? "bg-slate-900 border-slate-700"
              : "bg-white border-slate-300"
          }`}
        >
          {options.length === 0 ? (
            <div
              className={`px-3 py-3 text-sm ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}
            >
              Không có dữ liệu
            </div>
          ) : (
            options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-2.5 text-sm text-left transition-colors ${
                  isDark
                    ? "text-slate-200 hover:bg-slate-800"
                    : "text-slate-900 hover:bg-slate-100"
                } ${value === option.value ? (isDark ? "bg-slate-800" : "bg-slate-100") : ""}`}
              >
                {option.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
