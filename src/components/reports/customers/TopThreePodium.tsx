import { TopCustomerItem } from '@/types/reports';
import { Medal, Store, User } from 'lucide-react';

interface TopThreePodiumProps {
    topCustomers: TopCustomerItem[];
}

const formatINR = (amount: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

function PodiumCard({ customer, rank }: { customer: TopCustomerItem, rank: 1 | 2 | 3 }) {
    const styles = {
        1: { border: 'border-yellow-400 dark:border-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-500/10', iconColor: 'text-yellow-500', label: '1st Place' },
        2: { border: 'border-gray-300 dark:border-gray-500', bg: 'bg-gray-50 dark:bg-gray-500/10', iconColor: 'text-gray-400', label: '2nd Place' },
        3: { border: 'border-amber-600 dark:border-amber-700', bg: 'bg-amber-50 dark:bg-amber-700/10', iconColor: 'text-amber-600 dark:text-amber-500', label: '3rd Place' },
    }[rank];

    return (
        <div className={`relative flex flex-col items-center p-6 rounded-2xl border-2 ${styles.border} ${styles.bg} transition-colors`}>
            <div className={`absolute -top-5 flex h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-gray-800 shadow-md border border-gray-200 dark:border-gray-700 ${styles.iconColor}`}>
                <Medal className="h-5 w-5" />
            </div>
            <div className="mt-4 text-center">
                <p className={`text-xs font-semibold uppercase tracking-wider ${styles.iconColor} mb-2`}>{styles.label}</p>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-1" title={customer.companyName || customer.name}>{customer.companyName || customer.name}</h3>
                <div className="flex items-center justify-center gap-1 mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {customer.type === 'registered' ? <Store className="h-3 w-3" /> : <User className="h-3 w-3" />}
                    <span className="capitalize">{customer.type}</span>
                </div>
            </div>
            <div className="mt-5 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">Paid Revenue</p>
                <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{formatINR(customer.totalPaid)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 bg-white dark:bg-gray-800 px-3 py-1 rounded-full border border-gray-200 dark:border-gray-700 inline-block shadow-sm">{customer.visitCount} {customer.visitCount === 1 ? 'Visit' : 'Visits'}</p>
            </div>
        </div>
    );
}

export default function TopThreePodium({ topCustomers }: TopThreePodiumProps) {
    if (topCustomers.length === 0) return null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6 pt-6">
            {/* Reorder the array visually so 1st place is in the middle on desktop */}
            {topCustomers[1] && <div className="order-2 md:order-1 mt-0 md:mt-8"><PodiumCard customer={topCustomers[1]} rank={2} /></div>}
            {topCustomers[0] && <div className="order-1 md:order-2"><PodiumCard customer={topCustomers[0]} rank={1} /></div>}
            {topCustomers[2] && <div className="order-3 md:order-3 mt-0 md:mt-8"><PodiumCard customer={topCustomers[2]} rank={3} /></div>}
        </div>
    );
}