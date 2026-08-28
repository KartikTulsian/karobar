// src/components/dashboard/staff/QuickActionsPanel.tsx
import { FilePlus2, ScanLine, Undo2, Search } from 'lucide-react';

const ACTIONS = [
  { id: 1, label: 'New Bill', desc: 'Search items by name / barcode', icon: FilePlus2, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-500/10' },
  { id: 2, label: 'Scan Bill Image', desc: 'AI parse an existing bill', icon: ScanLine, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
  { id: 3, label: 'Process Return', desc: 'Handle a sales return', icon: Undo2, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-500/10' },
  { id: 4, label: 'Customer Lookup', desc: 'Search customer & show dues', icon: Search, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-500/10' },
];

export default function QuickActionsPanel() {
  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Quick POS Actions</h3>
      
      <div className="flex flex-col gap-3">
        {ACTIONS.map((action) => (
          <button 
            key={action.id}
            className="group flex w-full items-center gap-4 rounded-xl border border-slate-100 bg-slate-50 p-3 text-left transition-all hover:border-indigo-200 hover:bg-indigo-50/50 hover:shadow-sm dark:border-slate-800/50 dark:bg-slate-800/30 dark:hover:border-indigo-900/50 dark:hover:bg-indigo-900/20"
          >
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${action.bg}`}>
              <action.icon className={`h-5 w-5 ${action.color}`} />
            </div>
            <div>
              <p className="font-semibold text-slate-900 group-hover:text-indigo-700 dark:text-white dark:group-hover:text-indigo-300">{action.label}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{action.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}