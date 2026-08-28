// src/components/dashboard/manager/StaffActivityPanel.tsx
import { UserCircle } from 'lucide-react';

const MOCK_STAFF = [
  { name: 'Suresh', bills: 9, status: 'active' },
  { name: 'Meena', bills: 7, status: 'active' },
  { name: 'Raj', bills: 4, status: 'logged_out' },
];

export default function StaffActivityPanel() {
  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Staff Activity Today</h3>
      </div>
      
      <div className="flex flex-col gap-3">
        {MOCK_STAFF.map((staff, i) => (
          <div key={i} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800/50 dark:bg-slate-800/20">
            <div className="flex items-center gap-3">
              <UserCircle className="h-8 w-8 text-slate-400" />
              <div>
                <p className="font-medium text-slate-900 dark:text-white">{staff.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{staff.bills} bills punched</p>
              </div>
            </div>
            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
              staff.status === 'active' 
                ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/10 dark:bg-emerald-500/10 dark:text-emerald-400' 
                : 'bg-amber-50 text-amber-700 ring-amber-600/10 dark:bg-amber-500/10 dark:text-amber-400'
            }`}>
              {staff.status === 'active' ? 'Active' : 'Logged out'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}