// src/components/dashboard/staff/StaffStatsGrid.tsx
import { IndianRupee, ReceiptText, TriangleAlert, Clock } from 'lucide-react';

const MOCK_STAFF_STATS = [
  {
    title: "My Bills Today",
    value: "9",
    subtext: "Counter 1",
    icon: ReceiptText,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100/50 dark:bg-blue-500/10",
  },
  {
    title: "Today's Sales (Mine)",
    value: "₹7,820",
    trend: "Good pace",
    trendUp: true,
    icon: IndianRupee,
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-100/50 dark:bg-emerald-500/10",
  },
  {
    title: "Pending Dues",
    value: "3",
    subtext: "Remind customers",
    alert: true,
    icon: Clock,
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-100/50 dark:bg-orange-500/10",
  },
  {
    title: "Low Stock Alerts",
    value: "8",
    subtext: "Report to manager",
    alert: true,
    icon: TriangleAlert,
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-100/50 dark:bg-red-500/10",
  }
];

export default function StaffStatsGrid() {
  return (
    <div className='grid gap-4 lg:grid-cols-4 grid-cols-2'>
        {MOCK_STAFF_STATS.map((stat, index) => (
            <div 
                key={index}
                className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
            >
                <div className="flex items-center justify-between">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl ring-1 ring-inset ring-black/5 dark:ring-white/5 transition-transform duration-300 group-hover:scale-110 ${stat.bgColor}`}>
                        <stat.icon className={`h-6 w-6 ${stat.color}`} strokeWidth={1.5} />
                    </div>
                </div>

                <div className="mt-4 flex flex-col gap-1">
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{stat.title}</p>
                    <h3 className='text-2xl font-bold tracking-tight text-slate-900 dark:text-white'>{stat.value}</h3>
                </div>

                <div className="mt-4 flex items-center">
                    {stat.trend ? (
                        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${stat.trendUp ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/10 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20' : 'bg-red-50 text-red-700 ring-red-600/10 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/20'}`}>
                            {stat.trend}
                        </span>
                    ) : (
                        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${stat.alert ? 'bg-red-50 text-red-700 ring-red-600/10 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/20' : 'bg-slate-50 text-slate-600 ring-slate-500/10 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700'}`}>
                            {stat.subtext}
                        </span>
                    )}
                </div>
            </div>
        ))}
    </div>
  );
}