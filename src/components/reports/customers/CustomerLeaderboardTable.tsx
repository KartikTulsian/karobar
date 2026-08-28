import Table from '@/components/common/Table';
import { TopCustomerItem } from '@/types/reports';
import { AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';

interface LeaderboardProps {
    customers: TopCustomerItem[];
}

export default function CustomerLeaderboardTable({ customers }: LeaderboardProps) {
    
    const formatINR = (amount: number) => 
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

    const renderHealthBadge = (health: 'healthy' | 'warning' | 'danger') => {
        const config = {
            healthy: { icon: CheckCircle2, cls: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800', label: 'Zero Debt' },
            warning: { icon: AlertTriangle, cls: 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800', label: 'Has Debt' },
            danger:  { icon: ShieldAlert, cls: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800', label: 'Overdue!' }
        }[health];

        const Icon = config.icon;

        return (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${config.cls}`}>
                <Icon className="w-3.5 h-3.5" />
                {config.label}
            </span>
        );
    };

    const columns = [
        { header: "Rank", accessor: "rank", sortable: true },
        { header: "Customer", accessor: "name", sortable: true },
        { header: "Credit Health", accessor: "creditHealth", sortable: false },
        { header: "Total Paid", accessor: "totalPaid", sortable: true, className: "text-right" },
        { header: "Outstanding Due", accessor: "outstandingDue", sortable: true, className: "text-right hidden sm:table-cell" },
        { header: "Visits", accessor: "visitCount", sortable: true, className: "text-center hidden md:table-cell" },
    ];

    if (customers.length === 0) return null;

    const renderRow = (customer: TopCustomerItem) => (
        <tr key={customer.id} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
            <td className="px-5 py-4 font-bold text-gray-400 dark:text-gray-500">
                #{customer.rank}
            </td>
            <td className="px-5 py-4">
                <div className="font-medium text-gray-900 dark:text-white">
                    {customer.companyName || customer.name}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 capitalize mt-0.5">
                    {customer.type}
                </div>
            </td>
            <td className="px-5 py-4">
                {renderHealthBadge(customer.creditHealth)}
            </td>
            <td className="px-5 py-4 text-right font-medium text-green-600 dark:text-green-400">
                {formatINR(customer.totalPaid)}
            </td>
            <td className="px-5 py-4 text-right text-gray-600 dark:text-gray-300 hidden sm:table-cell">
                {formatINR(customer.outstandingDue)}
                {customer.overdueAmount > 0 && (
                    <div className="text-xs text-red-500 mt-0.5 font-medium">
                        ({formatINR(customer.overdueAmount)} Overdue)
                    </div>
                )}
            </td>
            <td className="px-5 py-4 text-center text-gray-600 dark:text-gray-300 hidden md:table-cell">
                {customer.visitCount}
            </td>
        </tr>
    );

    return (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800 transition-colors">
            <div className="border-b border-gray-200 p-5 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Full Leaderboard</h3>
            </div>
            
            <Table columns={columns} renderRow={renderRow} data={customers} />
        </div>
    );
}