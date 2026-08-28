import { RefreshCw, Download, FileText, Users, BarChart3 } from 'lucide-react';

interface DateRange { start: string; end: string; }
type GstViewMode = 'overview' | 'hsn' | 'suppliers';

interface GstControlPanelProps {
    dateRange: DateRange;
    viewMode: GstViewMode;
    isRefreshing: boolean;
    onDateChange: (range: DateRange) => void;
    onViewChange: (mode: GstViewMode) => void;
    onRefresh: () => void;
}

export default function GstControlPanel({ dateRange, viewMode, isRefreshing, onDateChange, onViewChange, onRefresh }: GstControlPanelProps) {
    return (
        <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 w-full">

            {/* Left: View Dimension Toggles */}
            {/* The scrollbar is hidden using standard CSS utilities, but remains swipable on mobile */}
            <div className="flex w-full sm:w-auto items-center overflow-x-auto rounded-lg bg-slate-100 p-1 dark:bg-slate-800 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <button 
                    onClick={() => onViewChange('overview')} 
                    className={`flex items-center justify-center whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-all ${viewMode === 'overview' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'}`}
                >
                    <BarChart3 className="mr-2 h-4 w-4" /> GSTR-3B Breakdown
                </button>
                <button 
                    onClick={() => onViewChange('hsn')} 
                    className={`flex items-center justify-center whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-all ${viewMode === 'hsn' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'}`}
                >
                    <FileText className="mr-2 h-4 w-4" /> HSN Summary
                </button>
                <button 
                    onClick={() => onViewChange('suppliers')} 
                    className={`flex items-center justify-center whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-all ${viewMode === 'suppliers' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'}`}
                >
                    <Users className="mr-2 h-4 w-4" /> Supplier ITC Audit
                </button>
            </div>

            {/* Right: Date Filters & Actions */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 w-full xl:w-auto">
                
                {/* Date Filters (Forced into a neat horizontal pill) */}
                <div className="flex items-center justify-between md:justify-start gap-2 bg-slate-50 dark:bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                    <input
                        type="date"
                        value={dateRange.start}
                        onChange={(e) => onDateChange({ ...dateRange, start: e.target.value })}
                        className="h-8 w-[120px] rounded bg-transparent text-sm font-medium text-slate-700 focus:outline-none dark:text-slate-300 cursor-pointer"
                    />
                    <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">to</span>
                    <input
                        type="date"
                        value={dateRange.end}
                        onChange={(e) => onDateChange({ ...dateRange, end: e.target.value })}
                        className="h-8 w-[120px] rounded bg-transparent text-sm font-medium text-slate-700 focus:outline-none dark:text-slate-300 cursor-pointer"
                    />
                </div>

                <div className="hidden md:block h-8 w-px bg-slate-200 dark:bg-slate-700"></div>

                {/* Actions (Strictly in one row on desktop) */}
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <button
                        type="button"
                        onClick={() => onRefresh()}
                        disabled={isRefreshing}
                        className="flex-1 md:flex-none inline-flex h-10 items-center justify-center whitespace-nowrap rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50 hover:text-indigo-600 disabled:opacity-70 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                        <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin text-indigo-500' : ''}`} /> 
                        {isRefreshing ? 'Syncing...' : 'Pull Latest'}
                    </button>
                    
                    <button 
                        type="button"
                        className="flex-1 md:flex-none inline-flex h-10 items-center justify-center whitespace-nowrap rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                        <Download className="mr-2 h-4 w-4" /> Export JSON
                    </button>
                </div>

            </div>
        </div>
    )
}