import { GSTDashboardData } from '@/types/finance'

interface GstKpiCardsProps {
  data: GSTDashboardData;
}

export default function GstKpiCards({ data }: GstKpiCardsProps) {

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(amount);
  };

  const { output, itc, net_payable } = data.head_summary;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Output Tax (Sales Liability) */}
      <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 border-l-4 border-l-orange-500">
        <div>
          <h3 className="mb-1 text-sm font-medium text-slate-500 dark:text-slate-400">Net Output Tax (Sales)</h3>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(data.total_output_tax)}</p>
        </div>
        <div className="mt-4 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 pt-3 dark:border-slate-800">
          <span>CGST: <strong className="text-slate-700 dark:text-slate-300">{formatCurrency(output.cgst)}</strong></span>
          <span>SGST: <strong className="text-slate-700 dark:text-slate-300">{formatCurrency(output.sgst)}</strong></span>
          <span>IGST: <strong className="text-slate-700 dark:text-slate-300">{formatCurrency(output.igst)}</strong></span>
        </div>
      </div>

      {/* ITC (Purchase Credits) */}
      <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 border-l-4 border-l-blue-500">
        <div>
          <h3 className="mb-1 text-sm font-medium text-slate-500 dark:text-slate-400">Net Input Tax Credit (ITC)</h3>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(data.total_input_tax_credit)}</p>
        </div>
        <div className="mt-4 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 pt-3 dark:border-slate-800">
          <span>CGST: <strong className="text-slate-700 dark:text-slate-300">{formatCurrency(itc.cgst)}</strong></span>
          <span>SGST: <strong className="text-slate-700 dark:text-slate-300">{formatCurrency(itc.sgst)}</strong></span>
          <span>IGST: <strong className="text-slate-700 dark:text-slate-300">{formatCurrency(itc.igst)}</strong></span>
        </div>
      </div>

      {/* Net Payable */}
      <div className={`flex flex-col justify-between rounded-xl border p-5 shadow-sm ${data.net_gst_payable < 0 ? 'border-indigo-200 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-900/20 border-l-4 border-l-indigo-500' : 'border-slate-200 bg-emerald-50 dark:border-slate-800 dark:bg-emerald-900/20 border-l-4 border-l-emerald-600'}`}>
        <div>
          <h3 className={`mb-1 text-sm font-medium ${data.net_gst_payable < 0 ? 'text-indigo-700 dark:text-indigo-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
            {data.net_gst_payable < 0 ? "ITC Carry Forward (Excess)" : "Net GST Payable (Cash)"}
          </h3>
          <p className={`text-2xl font-bold ${data.net_gst_payable < 0 ? 'text-indigo-700 dark:text-indigo-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
            {/* We use Math.abs to remove the negative sign visually since the label explains it */}
            {formatCurrency(Math.abs(data.net_gst_payable))}
          </p>
        </div>
        <div className={`mt-4 flex items-center justify-between text-xs border-t pt-3 ${data.net_gst_payable < 0 ? 'text-indigo-600 dark:text-indigo-500 border-indigo-200/50 dark:border-indigo-800/50' : 'text-emerald-600 dark:text-emerald-500 border-emerald-200/50 dark:border-emerald-800/50'}`}>
          <span>CGST: <strong>{formatCurrency(Math.abs(net_payable.cgst))}</strong></span>
          <span>SGST: <strong>{formatCurrency(Math.abs(net_payable.sgst))}</strong></span>
          <span>IGST: <strong>{formatCurrency(Math.abs(net_payable.igst))}</strong></span>
        </div>
      </div>
    </div>
  );
}