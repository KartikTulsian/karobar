;
import Table from '@/components/common/Table';
import { TopSupplierItem } from '@/types/reports';
import { ShieldCheck, AlertCircle, ShieldAlert } from 'lucide-react';

interface ScorecardProps {
    suppliers: TopSupplierItem[];
}

export default function SupplierScorecardTable({ suppliers }: ScorecardProps) {
    
    const formatINR = (amount: number) => 
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

    const renderQualityBadge = (status: 'healthy' | 'warning' | 'danger', rate: number) => {
        const config = {
            healthy: { icon: ShieldCheck, cls: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' },
            warning: { icon: AlertCircle, cls: 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800' },
            danger:  { icon: ShieldAlert, cls: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' }
        }[status];

        const Icon = config.icon;

        return (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${config.cls}`}>
                <Icon className="w-3.5 h-3.5" />
                {rate}% Returns
            </span>
        );
    };

    const columns = [
        { header: "Rank", accessor: "rank", sortable: true },
        { header: "Supplier", accessor: "name", sortable: true },
        { header: "Quality Score", accessor: "qualityStatus", sortable: false },
        { header: "Total Spend", accessor: "totalSpend", sortable: true, className: "text-right" },
        { header: "Amount Owed (Payable)", accessor: "outstandingPayable", sortable: true, className: "text-right hidden sm:table-cell" },
    ];

    const renderRow = (supplier: TopSupplierItem) => {
        // If a supplier has a danger status, slightly tint their entire row to flag them
        const rowBg = supplier.qualityStatus === 'danger' 
            ? 'bg-red-50/50 hover:bg-red-50 dark:bg-red-900/10 dark:hover:bg-red-900/20' 
            : 'hover:bg-gray-50 dark:hover:bg-gray-800/50';

        return (
            <tr key={supplier.id} className={`cursor-pointer transition-colors ${rowBg}`}>
                <td className="px-5 py-4 font-bold text-gray-400 dark:text-gray-500">
                    #{supplier.rank}
                </td>
                <td className="px-5 py-4">
                    <div className="font-medium text-gray-900 dark:text-white">
                        {supplier.name}
                    </div>
                    {supplier.contactName && supplier.contactName !== supplier.name && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            Contact: {supplier.contactName}
                        </div>
                    )}
                </td>
                <td className="px-5 py-4">
                    {renderQualityBadge(supplier.qualityStatus, supplier.returnRate)}
                </td>
                <td className="px-5 py-4 text-right font-medium text-gray-900 dark:text-white">
                    {formatINR(supplier.totalSpend)}
                </td>
                <td className="px-5 py-4 text-right text-gray-600 dark:text-gray-300 hidden sm:table-cell">
                    {formatINR(supplier.outstandingPayable)}
                </td>
            </tr>
        );
    };

    if (suppliers.length === 0) return null;

    return (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800 transition-colors">
            <div className="border-b border-gray-200 p-5 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Vendor Scorecard</h3>
            </div>
            <Table columns={columns} renderRow={renderRow} data={suppliers} />
        </div>
    );
}