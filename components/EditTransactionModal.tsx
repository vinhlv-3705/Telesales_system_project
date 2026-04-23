import { useState } from 'react';
import { X } from 'lucide-react';
import AddTransactionForm from './AddTransactionForm';

interface Transaction {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  note: string;
  date: string;
}

interface EditTransactionModalProps {
  transaction: Transaction | null;
  categories: string[];
  onSave: (updatedTransaction: Transaction) => void;
  onClose: () => void;
  isOpen: boolean;
}

export default function EditTransactionModal({ transaction, categories, onSave, onClose, isOpen }: EditTransactionModalProps) {
  const [localFormData, setLocalFormData] = useState(() => ({
    amount: transaction?.amount.toString() ?? '',
    type: transaction?.type ?? ('expense' as 'income' | 'expense'),
    category: transaction?.category ?? (categories[0] || ''),
    note: transaction?.note ?? '',
  }));

  const handleSave = () => {
    const amount = parseFloat(localFormData.amount);
    if (!localFormData.amount.trim() || !localFormData.note.trim() || isNaN(amount) || amount <= 0) return;

    if (transaction) {
      const updatedTransaction: Transaction = {
        ...transaction,
        amount: amount,
        type: localFormData.type,
        category: localFormData.category,
        note: localFormData.note.trim(),
      };
      onSave(updatedTransaction);
    }
  };

  if (!isOpen || !transaction) return null;

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white/40 backdrop-blur-xl p-8 rounded-2xl shadow-[0_20px_60px_rgb(0,0,0,0.15)] border border-white/60 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-[#1e293b]">Sửa Giao Dịch</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700 transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>
        <AddTransactionForm
          formData={localFormData}
          setFormData={setLocalFormData}
          onAdd={handleSave}
          categories={categories}
          isEditing={true}
          onSave={handleSave}
        />
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="bg-white/60 backdrop-blur-sm text-slate-700 py-2 px-6 rounded-xl border border-white/50 hover:bg-white/80 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 transition-all shadow-sm"
          >
            Hủy
          </button>
        </div>
      </div>
    </div>
  );
}