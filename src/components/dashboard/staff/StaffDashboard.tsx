import StaffStatsGrid from './StaffStatsGrid';
import { UserCircle2 } from 'lucide-react';
import QuickActionsPanel from './QuickActions';

export default function StaffDashboard() {
  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      
      {/* Zone 1: Minimal Staff Header */}
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
            <UserCircle2 className="h-5 w-5 text-slate-600 dark:text-slate-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">Welcome back, Suresh</h1>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Ravi Auto Parts • Counter 1</p>
          </div>
        </div>
      </div>

      {/* Zone 2: Staff KPIs */}
      <StaffStatsGrid />

      {/* Zone 3: Execution Panels (Split 50/50 on Desktop) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        
        {/* Left Column: Fast Action Buttons */}
        <QuickActionsPanel />

        {/* Right Column: Personal Recent Bills List */}
        <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">My Recent Bills</h3>
            <button className="text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">View All</button>
          </div>
          
          {/* Using a simple list layout for recent bills as it's cleaner for a small space than a full table */}
          <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800/50">
            {[
              { id: 'INV-2024', name: 'Walking customer', amount: '₹1,200', status: 'Paid', statusColor: 'emerald' },
              { id: 'INV-2021', name: 'Priya Sharma', amount: '₹320', status: 'Paid', statusColor: 'emerald' },
              { id: 'INV-2019', name: 'Manoj', amount: '₹4,500', status: 'Due', statusColor: 'red' },
            ].map((bill, i) => (
              <div key={i} className="flex items-center justify-between py-3">
                <div className="flex flex-col">
                  <p className="font-medium text-slate-900 dark:text-white">{bill.name}</p>
                  <p className="text-xs font-mono text-slate-500 dark:text-slate-400">{bill.id}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-slate-900 dark:text-white">{bill.amount}</span>
                  <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset bg-${bill.statusColor}-50 text-${bill.statusColor}-700 ring-${bill.statusColor}-600/10 dark:bg-${bill.statusColor}-500/10 dark:text-${bill.statusColor}-400`}>
                    {bill.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}