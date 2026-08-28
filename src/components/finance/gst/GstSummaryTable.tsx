import Table from '@/components/common/Table';
import { GSTSummaryRow } from '@/types/finance'

interface GstSummaryTableProps {
    breakdown: GSTSummaryRow[];
}

export default function GstSummaryTable({ breakdown }: GstSummaryTableProps) {

    const formatVal = (val: number) => {
        const formatted = Math.abs(val).toFixed(2);
        return val < 0 ? `-₹${formatted}` : `₹${formatted}`;
    }

    const columns = [
        {
            header: "Description",
            accessor: "description",
            sortable: true,
        },
        {
            header: "Records",
            accessor: "record_count",
            sortable: true,
            className: "text-center",
        },
        {
            header: "Taxable Value",
            accessor: "taxable_value",
            sortable: true,
            className: "text-right",
        },
        {
            header: "CGST",
            accessor: "cgst",
            sortable: true,
            className: "text-right hidden md:table-cell",
        },
        {
            header: "SGST",
            accessor: "sgst",
            sortable: true,
            className: "text-right hidden lg:table-cell",
        },
        {
            header: "IGST",
            accessor: "igst",
            sortable: true,
            className: "text-right",
        },
        {
            header: "Total Tax",
            accessor: "total_tax",
            className: "text-right font-bold text-slate-800 dark:text-slate-200",
        },
    ];

    const renderRow = (summary: GSTSummaryRow) => (
        <tr
            key={summary.id}
            className="cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40"
        >
            <td className="px-5 py-4 font-medium text-slate-900 dark:text-white whitespace-nowrap">
                {summary.description}
            </td>

            <td className="px-5 py-4 text-center">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                    {summary.record_count}
                </span>
            </td>

            <td className="px-5 py-4 text-right font-medium text-slate-700 dark:text-slate-300">
                {formatVal(summary.taxable_value)}
            </td>

            <td className="px-5 py-4 text-right text-slate-500 dark:text-slate-400 hidden md:table-cell">
                {formatVal(summary.cgst)}
            </td>

            <td className="px-5 py-4 text-right text-slate-500 dark:text-slate-400 hidden lg:table-cell">
                {formatVal(summary.sgst)}
            </td>

            <td className="px-5 py-4 text-right text-slate-500 dark:text-slate-400">
                {formatVal(summary.igst)}
            </td>

            <td className={`px-5 py-4 text-right font-semibold whitespace-nowrap ${summary.total_tax < 0 ? 'text-red-500 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {formatVal(summary.total_tax)}
            </td>
        </tr>
    );

    return (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-200 p-5 dark:border-slate-800">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Detailed Category Breakdown</h3>
            </div>
            
            <Table columns={columns} renderRow={renderRow} data={breakdown} />
        </div>
    )
}
