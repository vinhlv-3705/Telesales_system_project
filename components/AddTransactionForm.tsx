import { Plus, Save } from 'lucide-react';

interface AddTransactionFormProps {
  formData: {
    amount: string;
    type: 'income' | 'expense';
    category: string;
    note: string;
  };
  setFormData: (data: {
    amount: string;
    type: 'income' | 'expense';
    category: string;
    note: string;
  }) => void;
  onAdd: () => void;
  categories: string[];
  isEditing?: boolean;
  onSave?: () => void;
}

export default function AddTransactionForm({ formData, setFormData, onAdd, categories, isEditing = false, onSave }: AddTransactionFormProps) {
  return (
    <div className={isEditing ? "" : "bg-white/40 backdrop-blur-xl p-6 rounded-2xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"}>
      {!isEditing && <h2 className="text-xl font-semibold mb-4">{isEditing ? 'Cập Nhật Giao Dịch' : 'Thêm Giao Dịch'}</h2>}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700">Số Tiền</label>
          <input
            type="number"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            className="mt-1 block w-full h-11 px-3 rounded-lg border border-white/50 bg-white/30 backdrop-blur-md shadow-sm focus:ring-2 focus:ring-indigo-400 focus:border-white/70 transition-all text-slate-900"
            placeholder="Nhập số tiền"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700">Loại</label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value as 'income' | 'expense' })}
            className="mt-1 block w-full h-11 px-3 rounded-lg border border-white/50 bg-white/30 backdrop-blur-md shadow-sm focus:ring-2 focus:ring-indigo-400 focus:border-white/70 transition-all text-slate-900"
          >
            <option value="income">Thu Nhập</option>
            <option value="expense">Chi Tiêu</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700">Danh Mục</label>
          <select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="mt-1 block w-full h-11 px-3 rounded-lg border border-white/50 bg-white/30 backdrop-blur-md shadow-sm focus:ring-2 focus:ring-indigo-400 focus:border-white/70 transition-all text-slate-900"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700">Ghi Chú</label>
          <input
            type="text"
            value={formData.note}
            onChange={(e) => setFormData({ ...formData, note: e.target.value })}
            className="mt-1 block w-full h-11 px-3 rounded-lg border border-white/50 bg-white/30 backdrop-blur-md shadow-sm focus:ring-2 focus:ring-indigo-400 focus:border-white/70 transition-all text-slate-900"
            placeholder="Nhập ghi chú"
          />
        </div>
        <button
          onClick={isEditing ? onSave : onAdd}
          disabled={!formData.amount.trim() || !formData.note.trim() || parseFloat(formData.amount) <= 0}
          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-4 rounded-lg hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 flex items-center justify-center disabled:bg-slate-400 disabled:cursor-not-allowed shadow-lg transition-all"
        >
          {isEditing ? <Save className="h-5 w-5 mr-2" /> : <Plus className="h-5 w-5 mr-2" />}
          {isEditing ? 'Cập Nhật' : 'Thêm Giao Dịch'}
        </button>
      </div>
    </div>
  );
}