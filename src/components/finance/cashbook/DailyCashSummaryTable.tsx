"use client";

import Table from "@/components/common/Table";
import { DailyCashSummary } from "@/types/finance";
import { ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

interface DailyCashSummaryTableProps {
    data: DailyCashSummary[];
}

export default function DailyCashSummaryTable({ data }: DailyCashSummaryTableProps) {
    const router = useRouter();

    const formatCurrency = (val: number) => val.toLocaleString('en-IN', { minimumFractionDigits: 2 });
    const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    const columns = [
        { header: "Date", accessor: "date" },
        { header: "Total In (₹)", accessor: "totalIn", className: "text-right text-emerald-600" },
        { header: "Total Out (₹)", accessor: "totalOut", className: "text-right text-red-600" },
        { header: "Closing Balance", accessor: "closingBalance", className: "text-right font-bold bg-slate-50 dark:bg-slate-800/50" },
        { header: "Details", accessor: "action", className: "text-center" }
    ];

    const renderRow = (row: DailyCashSummary) => (
        // Using router.push on the tr avoids the UI squeezing caused by wrapping rows in <a> or <Link> tags
        <tr 
            key={row.date} 
            onClick={() => router.push(`/finance/cashbook/${row.date}`)}
            className="cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/20 border-b border-slate-100 dark:border-slate-800/50 group"
        >
            <td className="px-5 py-4 text-sm font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                {formatDate(row.date)}
            </td>
            <td className="px-5 py-4 text-right font-medium text-emerald-600 dark:text-emerald-400">
                {row.totalIn > 0 ? formatCurrency(row.totalIn) : '-'}
            </td>
            <td className="px-5 py-4 text-right font-medium text-red-600 dark:text-red-400">
                {row.totalOut > 0 ? formatCurrency(row.totalOut) : '-'}
            </td>
            <td className="px-5 py-4 text-right font-bold text-slate-900 dark:text-white bg-slate-50/50 dark:bg-slate-800/20">
                ₹{formatCurrency(row.closingBalance)}
            </td>
            <td className="px-5 py-4 text-center">
                <div className="flex items-center justify-center">
                    <button className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors dark:bg-slate-800 dark:text-slate-400 dark:group-hover:bg-indigo-500/20 dark:group-hover:text-indigo-400">
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            </td>
        </tr>
    );

    return (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <Table columns={columns} renderRow={renderRow} data={data} />
        </div>
    );
}
