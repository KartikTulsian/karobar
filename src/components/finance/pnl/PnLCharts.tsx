import { PnLDashboardData } from '@/types/finance';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, TooltipPayloadEntry } from "recharts";

interface PnLChartsProps {
  data: PnLDashboardData;
}

type TooltipValue = number | string | readonly (number | string)[] | undefined;

export default function PnLCharts({ data }: PnLChartsProps) {

  const barData = data.charts.dailyTrends.map((day) => ({
    date: day.date.slice(5), // converts '2026-06-01' to '06-01'
    revenue: day.revenue,
    expenses: day.expenses,
  }));

  const expenseBreakdown = data.charts.expenseBreakdown;

  const COLORS = ['#FF8042', '#00C49F', '#FFBB28', '#0088FE', '#8884D8', '#FF6B6B'];

  const formatTooltipValue = (
    value: TooltipValue,
    _name?: string | number,
    _item?: TooltipPayloadEntry,
    _index?: number
  ): string => {
    if (value === undefined) return '₹0.00';
    
    // Safely extract the number whether Recharts passes an array, string, or number
    const numValue = Array.isArray(value) ? Number(value[0]) : Number(value);
    
    return `₹${(isNaN(numValue) ? 0 : numValue).toFixed(2)}`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      {/* Chart 1: Revenue vs Cost */}
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Revenue vs Expenses</h3>
        <div className="h-72 w-full">
          <ResponsiveContainer width="99%" height="100%" minHeight={288} minWidth={0}>
            <BarChart data={barData}>
              <XAxis dataKey="date" fontSize={12} stroke="#8884d8" />
              <YAxis fontSize={12} stroke="#94a3b8" />
              <Tooltip
                formatter={formatTooltipValue}
                cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }}
                contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />
              <Bar dataKey="revenue" fill="#4ade80" name="Revenue" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" fill="#f87171" name="Expenses" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 2: Expense Breakdown */}
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Expense Breakdown</h3>
        {expenseBreakdown.length > 0 ? (
          <div className="h-72 w-full">
            <ResponsiveContainer width="99%" height="100%" minHeight={288} minWidth={0}>
              <PieChart>
                <Pie
                  data={expenseBreakdown}
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {expenseBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={formatTooltipValue}
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-72 items-center justify-center text-sm text-slate-500">
            No expenses recorded for this period.
          </div>
        )}
      </div>
    </div>
  );
}
