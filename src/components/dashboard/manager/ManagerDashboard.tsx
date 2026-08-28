import ManagerStatsGrid from './ManagerStatsGrid';
import StaffActivityPanel from './StaffActivityPanel';
import { Briefcase } from 'lucide-react';

export default function ManagerDashboard() {
  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      
      {/* Zone 1: Operations Header */}
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/50">
            <Briefcase className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Ravi Auto Parts</h1>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Manager Dashboard • Main Branch</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2">
           <span className="relative flex h-3 w-3">
             <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
             <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500"></span>
           </span>
           <span className="text-sm font-medium text-slate-600 dark:text-slate-300">2 Staff Active</span>
        </div>
      </div>

      {/* Zone 2: Manager KPIs */}
      <ManagerStatsGrid />

      {/* Zone 3: Operational Command Panels */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        
        {/* Left Column: Staff Tracking */}
        <div className="flex flex-col gap-6 lg:col-span-1">
          <StaffActivityPanel />
        </div>

        {/* Middle Column: Inventory Incoming (Mocked) */}
        <div className="flex flex-col gap-6 lg:col-span-1">
          <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-slate-400">Pending Purchase Orders Here</p>
          </div>
        </div>

        {/* Right Column: Recent Transactions */}
        <div className="flex flex-col gap-6 lg:col-span-1">
          <div className="flex h-full items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
             <p className="text-slate-400">Recent Bills List Here</p>
          </div>
        </div>
        
      </div>
    </div>
  )
}