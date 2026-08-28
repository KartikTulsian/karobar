import { Sheet, BarChart3, Users, Package } from 'lucide-react';

interface DateRange { start: string; end: string; }
type ViewMode = 'overview' | 'items' | 'entities';

interface PnLControlPanelProps {
    dateRange: DateRange;
    viewMode: ViewMode;
    onDateChange: (range: DateRange) => void;
    onViewChange: (mode: ViewMode) => void;
}

export default function PnLControlPanel({ dateRange, viewMode, onDateChange, onViewChange }: PnLControlPanelProps) {
    return (
        <div className="flex flex-col items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:flex-row">
            
            {/* View Dimension Toggles */}
            <div className="flex items-center rounded-md bg-slate-100 p-1 dark:bg-slate-800">
                <button onClick={() => onViewChange('overview')} className={`flex items-center rounded px-3 py-1.5 text-sm font-medium transition-colors ${viewMode === 'overview' ? 'bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>
                    <BarChart3 className="mr-2 h-4 w-4" /> General
                </button>
                <button onClick={() => onViewChange('items')} className={`flex items-center rounded px-3 py-1.5 text-sm font-medium transition-colors ${viewMode === 'items' ? 'bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>
                    <Package className="mr-2 h-4 w-4" /> Products
                </button>
                <button onClick={() => onViewChange('entities')} className={`flex items-center rounded px-3 py-1.5 text-sm font-medium transition-colors ${viewMode === 'entities' ? 'bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>
                    <Users className="mr-2 h-4 w-4" /> Customers & Suppliers
                </button>
            </div>

            {/* Date Filters */}
            <div className="flex items-center gap-2">
                <input type="date" value={dateRange.start} onChange={(e) => onDateChange({ ...dateRange, start: e.target.value })} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                <span className="text-slate-500 dark:text-slate-400">to</span>
                <input type="date" value={dateRange.end} onChange={(e) => onDateChange({ ...dateRange, end: e.target.value })} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
                <button className="flex items-center rounded-md bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">
                    <Sheet className="mr-2 h-4 w-4" />Export
                </button>
            </div>
        </div>
    );
}