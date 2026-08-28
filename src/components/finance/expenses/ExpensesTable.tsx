import Table from '@/components/common/Table';
import { useNavigation } from '@/hooks/useNavigation';
import { ExpenseWithCategory } from '@/types/finance'
import { Receipt, Edit, Trash2 } from 'lucide-react';

interface ExpensesTableProps {
    data: ExpenseWithCategory[];
    onEdit?: (expense: ExpenseWithCategory) => void;
    onDelete?: (expense: ExpenseWithCategory) => void;
}

export default function ExpensesTable({ data, onEdit, onDelete }: ExpensesTableProps) {

    const { currentRole } = useNavigation();

    const columns = [
        { header: "Date", accessor: "expense_date", sortable: true },
        { header: "Description", accessor: "description", sortable: true },
        { header: "Category", accessor: "category", className: "hidden md:table-cell" },
        { header: "Payment Mode", accessor: "payment_method", className: "text-center hidden sm:table-cell" },
        { header: "Amount", accessor: "amount", sortable: true, className: "text-right font-semibold" },
        ...(currentRole === "owner"
            ? [
                {
                    header: "Actions",
                    accessor: "action",
                    className: "text-center"
                },
            ]
            : [])
    ];

    const formatCurrency = (val: number) => `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

    const renderPaymentBadge = (method: string) => {
        const styles: Record<string, string> = {
            'cash': 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400',
            'upi': 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-400',
            'bank_transfer': 'bg-indigo-50 text-indigo-700 ring-indigo-600/20 dark:bg-indigo-500/10 dark:text-indigo-400',
            'card': 'bg-purple-50 text-purple-700 ring-purple-600/20 dark:bg-purple-500/10 dark:text-purple-400',
            'credit': 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400',
            'mixed': 'bg-slate-100 text-slate-700 ring-slate-500/20 dark:bg-slate-800 dark:text-slate-300',
            'cheque': 'bg-cyan-50 text-cyan-700 ring-cyan-600/20 dark:bg-cyan-500/10 dark:text-cyan-400',
        };

        const style = styles[method] || styles['cash'];
        return (
            <span className={`inline-flex items-center rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider ring-1 ring-inset ${style}`}>
                {method.replace('_', ' ')}
            </span>
        );
    };

    const renderRow = (expense: ExpenseWithCategory) => (
        <tr key={expense.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/20 border-b border-slate-100 dark:border-slate-800/50">
            <td className="px-5 py-4 text-sm font-medium text-slate-900 dark:text-white whitespace-nowrap">
                {new Date(expense.expense_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </td>
            <td className="px-5 py-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                        {/* {expense.receipt_url && <Receipt className="h-4 w-4 text-slate-400" />} */}
                        <Receipt className="h-4 w-4" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white line-clamp-1">
                            {expense.description || 'No description'}
                        </p>
                    </div>
                </div>
            </td>
            <td className="px-5 py-4 hidden md:table-cell">
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800 dark:bg-slate-800 dark:text-slate-300">
                    {expense.expense_categories?.name || 'Uncategorized'}
                </span>
            </td>
            <td className="px-5 py-4 text-center hidden sm:table-cell">
                {renderPaymentBadge(expense.payment_method)}
            </td>
            <td className="px-5 py-4 text-right font-semibold text-slate-900 dark:text-white">
                {formatCurrency(expense.amount)}
            </td>
            {currentRole === "owner" && (
                <td className="px-5 py-4">
                    <div className="flex items-center justify-center gap-2">
                        {onEdit && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onEdit(expense); }}
                                className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600 dark:hover:bg-slate-800 dark:hover:text-blue-400 transition-colors"
                            >
                                <Edit className="h-4 w-4" />
                            </button>
                        )}
                        {onDelete && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onDelete(expense); }}
                                className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600 dark:hover:bg-slate-800 dark:hover:text-red-400 transition-colors"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </td>
            )}
        </tr>
    );

    return (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <Table columns={columns} renderRow={renderRow} data={data} />
        </div>
    )

    // return <Table columns={columns} renderRow={renderRow} data={data} />
}
