

interface SalesMetrics {
    totalAmount: number;
    totalPaid: number;
    totalUnpaid: number;
    overdue: number;
}

interface SalesKpiCardsProps {
    metrics: SalesMetrics;
}

export default function SalesKpiCards({ metrics }: SalesKpiCardsProps) {

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
        }).format(amount);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Amount */}
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 border-b-4 border-b-emerald-500">
                <h3 className="mb-1 text-sm font-medium text-emerald-600 dark:text-emerald-400">Total Amount</h3>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(metrics.totalAmount)}</p>
            </div>

            {/* Total Paid */}
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 border-b-4 border-b-blue-500">
                <h3 className="mb-1 text-sm font-medium text-blue-600 dark:text-blue-400">Total Paid</h3>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(metrics.totalPaid)}</p>
            </div>

            {/* Total Unpaid */}
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 border-b-4 border-b-orange-500">
                <h3 className="mb-1 text-sm font-medium text-orange-600 dark:text-orange-400">Total Unpaid</h3>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(metrics.totalUnpaid)}</p>
            </div>

            {/* Overdue */}
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 border-b-4 border-b-red-500">
                <h3 className="mb-1 text-sm font-medium text-red-600 dark:text-red-400">Overdue</h3>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(metrics.overdue)}</p>
            </div>
        </div>
    );
}
