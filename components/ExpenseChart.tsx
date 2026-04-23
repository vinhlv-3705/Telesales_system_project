import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface ExpenseChartProps {
  expenseByCategory: { name: string; value: number }[];
}

const colors = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function ExpenseChart({ expenseByCategory }: ExpenseChartProps) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Chi Tiêu Theo Danh Mục</h2>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={expenseByCategory}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {expenseByCategory.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}