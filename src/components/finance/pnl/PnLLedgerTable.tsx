import { DailySummary } from "@/types/finance";
import Table from "../../common/Table";

interface PnLLedgerTableProps {
    summaries: DailySummary[];
}

export default function PnLLedgerTable({ summaries }: PnLLedgerTableProps) {

    const columns = [
        {
            header: "Date",
            accessor: "summary_date",
            sortable: true,
        },
        {
            header: "Bills",
            accessor: "bill_count",
            sortable: true,
            className: "text-center",
        },
        {
            header: "Sales",
            accessor: "total_sales",
            sortable: true,
            className: "text-right",
        },
        {
            header: "Collections",
            accessor: "total_collections",
            sortable: true,
            className: "text-right hidden md:table-cell",
        },
        {
            header: "Purchases",
            accessor: "total_purchases",
            sortable: true,
            className: "text-right hidden lg:table-cell",
        },
        {
            header: "Expenses",
            accessor: "total_expenses",
            sortable: true,
            className: "text-right",
        },
        {
            header: "GST (In/Out)",
            accessor: "gst_collected",
            className: "text-center hidden xl:table-cell",
        },
        {
            header: "Gross Profit",
            accessor: "gross_profit",
            sortable: true,
            className: "text-right",
        },
        {
            header: "Net Profit",
            accessor: "net_profit",
            sortable: true,
            className: "text-right",
        },
    ];

    const renderRow = (summary: DailySummary) => (
        <tr
            key={summary.id}
            className="cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/20"
        >
            <td className="px-5 py-4 font-mono text-xs whitespace-nowrap">{summary.summary_date}</td>

            <td className="px-5 py-4 text-center">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                    {summary.bill_count}
                </span>
            </td>

            <td className="px-5 py-4 text-right font-medium text-slate-900 dark:text-white">
                ₹{summary.total_sales.toFixed(2)}
            </td>

            <td className="px-5 py-4 text-right text-slate-500 dark:text-slate-400 hidden md:table-cell">
                ₹{summary.total_collections.toFixed(2)}
            </td>

            <td className="px-5 py-4 text-right text-orange-600 dark:text-orange-400 hidden lg:table-cell">
                ₹{summary.total_purchases.toFixed(2)}
            </td>

            <td className="px-5 py-4 text-right text-red-600 dark:text-red-400">
                ₹{summary.total_expenses.toFixed(2)}
            </td>

            <td className="px-5 py-4 text-center hidden xl:table-cell">
                <div className="flex flex-col text-xs">
                    <span className="text-emerald-600 dark:text-emerald-400">+₹{summary.gst_collected.toFixed(2)}</span>
                    <span className="text-red-500 dark:text-red-400">-₹{summary.gst_paid.toFixed(2)}</span>
                </div>
            </td>

            <td className="px-5 py-4 text-right font-semibold text-slate-700 dark:text-slate-300">
                ₹{summary.gross_profit.toFixed(2)}
            </td>

            <td className="px-5 py-4 text-right">
                <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${summary.net_profit >= 0
                        ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/10 dark:bg-emerald-500/10 dark:text-emerald-400'
                        : 'bg-red-50 text-red-700 ring-red-600/10 dark:bg-red-500/10 dark:text-red-400'
                    }`}>
                    ₹{summary.net_profit.toFixed(2)}
                </span>
            </td>
        </tr>
    );

    return (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-200 p-5 dark:border-slate-800">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Detailed Ledger (Daily)</h3>
            </div>

            <Table columns={columns} renderRow={renderRow} data={summaries} />
        </div>
    );
}