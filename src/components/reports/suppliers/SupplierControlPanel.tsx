import { ReportTimeframe } from '@/types/reports';
import { Download, Sheet, Filter, RefreshCw } from 'lucide-react';

interface SupplierControlPanelProps {
    timeframe: ReportTimeframe;
    onTimeframeChange: (timeframe: ReportTimeframe) => void;
    startDate?: string;
    onStartDateChange: (date: string) => void;
    endDate?: string;
    onEndDateChange: (date: string) => void;
    onApply: () => void;
    isFetching: boolean;
}

export default function SupplierControlPanel({
    timeframe, onTimeframeChange,
    startDate, onStartDateChange,
    endDate, onEndDateChange,
    onApply, isFetching
}: SupplierControlPanelProps) {
    return (
        <div className="flex flex-col items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 lg:flex-row transition-colors">
            
            {/* Left side Filters (Draft State) */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                <select 
                    value={timeframe}
                    onChange={(e) => onTimeframeChange(e.target.value as ReportTimeframe)}
                    className="w-full sm:w-auto rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white transition-colors"
                >
                    <option value="daily">Today</option>
                    <option value="weekly">Last 7 Days</option>
                    <option value="monthly">Last 30 Days</option>
                    <option value="yearly">Last 12 Months</option>
                    <option value="custom">Custom Range</option>
                </select>

                {timeframe === 'custom' && (
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <input
                            type="date"
                            value={startDate || ''}
                            onChange={(e) => onStartDateChange(e.target.value)}
                            className="w-full sm:w-auto rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white transition-colors"
                        />
                        <span className="text-gray-500 dark:text-gray-400 text-sm">to</span>
                        <input
                            type="date"
                            value={endDate || ''}
                            onChange={(e) => onEndDateChange(e.target.value)}
                            className="w-full sm:w-auto rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white transition-colors"
                        />
                    </div>
                )}

                {/* The Apply / Refresh Button */}
                <button 
                    onClick={onApply}
                    disabled={isFetching}
                    className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-70"
                >
                    {isFetching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Filter className="w-4 h-4" />}
                    <span>{isFetching ? 'Applying...' : 'Apply Filters'}</span>
                </button>
            </div>

            {/* Right side Actions */}
            <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
                <button disabled={isFetching} className="flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">
                    <Download className="h-4 w-4 text-red-500 md:mr-2" /> <span className="hidden md:inline">PDF</span>
                </button>
                <button disabled={isFetching} className="flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">
                    <Sheet className="h-4 w-4 text-green-500 md:mr-2" /> <span className="hidden md:inline">CSV</span>
                </button>
            </div>
        </div>
    );
}