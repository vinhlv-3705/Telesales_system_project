import { useEffect, useState } from "react";
import { X } from "lucide-react";
import CallLogForm, { CallFormData } from "./CallLogForm";
import { CustomerCallLog } from "./CustomerList";

interface EditCallLogModalProps {
  callLog: CustomerCallLog | null;
  onSave: (updated: CustomerCallLog) => void;
  onClose: () => void;
  isOpen: boolean;
  isDark?: boolean;
}

export default function EditCallLogModal({ callLog, onSave, onClose, isOpen, isDark = false }: EditCallLogModalProps) {
  const [localFormData, setLocalFormData] = useState<CallFormData>({
    customerName: callLog?.customerName ?? "",
    phoneNumber: callLog?.phoneNumber ?? "",
    callStatus: callLog?.callStatus ?? "Mới",
    revenue: "0",
    callbackDate: callLog?.callbackDate ?? "",
    callbackTime: callLog?.callbackTime ?? "",
    assignedTo: "",
    note: callLog?.note ?? "",
  });

  useEffect(() => {
    if (!isOpen) return;
    const fetchMe = async () => {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as { username?: string };
        const username = data.username?.trim() || "User";
        setLocalFormData((prev) => ({ ...prev, assignedTo: username }));
      } catch {
        // ignore
      }
    };

    void fetchMe();
  }, [isOpen]);

  if (!isOpen || !callLog) return null;

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
      <div
        className={`backdrop-blur-xl p-8 rounded-2xl shadow-[0_20px_60px_rgb(0,0,0,0.15)] border max-w-2xl w-full mx-4 ${
          isDark ? "bg-slate-900/65 border-slate-700/60" : "bg-white/40 border-white/60"
        }`}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className={`text-xl font-semibold ${isDark ? "text-slate-100" : "text-[#1e293b]"}`}>Cập nhật cuộc gọi</h2>
          <button onClick={onClose} className={`transition-colors ${isDark ? "text-slate-400 hover:text-slate-200" : "text-slate-500 hover:text-slate-700"}`}>
            <X className="h-6 w-6" />
          </button>
        </div>
        <CallLogForm
          formData={localFormData}
          setFormData={setLocalFormData}
          isEditing
          isDark={isDark}
          onValidationError={(message) => window.alert(message)}
          onSubmit={() =>
            onSave({
              ...callLog,
              customerName: localFormData.customerName.trim(),
              phoneNumber: localFormData.phoneNumber.trim(),
              callStatus: ((localFormData.callStatus || "Mới") as CustomerCallLog["callStatus"]),
              callbackDate: localFormData.callbackDate,
              callbackTime: localFormData.callbackTime,
              note: localFormData.note.trim(),
            })
          }
        />
      </div>
    </div>
  );
}
