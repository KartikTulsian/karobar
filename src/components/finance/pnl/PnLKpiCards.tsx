import { PnLDashboardData } from "@/types/finance";

interface PnLKpiCardsProps {
  data: PnLDashboardData;
}

export default function PnLKpiCards({ data }: PnLKpiCardsProps) {
  const formatCurrency = (amount: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);

  const topItem = data.tables.itemLevel[0];
  const topCustomer = data.tables.customerLevel[0];
  const topExpense = data.charts.expenseBreakdown[0];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Revenue Card */}
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 border-b-4 border-b-blue-500 flex flex-col justify-between">
        <div>
            <h3 className="mb-1 text-sm font-medium text-blue-600 dark:text-blue-400">Net Revenue</h3>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(data.kpis.totalRevenue)}</p>
        </div>
        {topCustomer && <p className="mt-3 text-xs text-slate-500">Top Client: <span className="font-semibold text-slate-700 dark:text-slate-300">{topCustomer.customer_name}</span></p>}
      </div>

      {/* COGS Card */}
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 border-b-4 border-b-orange-400 flex flex-col justify-between">
        <div>
            <h3 className="mb-1 text-sm font-medium text-orange-500 dark:text-orange-400">Cost of Goods (COGS)</h3>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(data.kpis.cogs)}</p>
        </div>
        <p className="mt-3 text-xs text-slate-500">Inventory purchase cost for sold items.</p>
      </div>

      {/* Expenses Card */}
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 border-b-4 border-b-red-500 flex flex-col justify-between">
        <div>
            <h3 className="mb-1 text-sm font-medium text-red-600 dark:text-red-400">Operating Expenses</h3>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(data.kpis.totalExpenses)}</p>
        </div>
        {topExpense && <p className="mt-3 text-xs text-slate-500">Largest Cost: <span className="font-semibold text-slate-700 dark:text-slate-300">{topExpense.name}</span></p>}
      </div>

      {/* Net Profit Card */}
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 border-b-4 border-b-emerald-500 flex flex-col justify-between">
        <div>
            <h3 className="mb-1 text-sm font-medium text-emerald-600 dark:text-emerald-400">True Net Profit</h3>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(data.kpis.netProfit)}</p>
        </div>
        {topItem && <p className="mt-3 text-xs text-slate-500">Best Seller: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{topItem.item_name}</span></p>}
      </div>
    </div>
  );
}