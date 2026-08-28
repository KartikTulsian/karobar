import { useInvalidateInventoryReport } from '@/hooks/useReports';
import { ReportTimeframe } from '@/types/reports';
import { Download, RefreshCw } from 'lucide-react';
import { useState } from 'react';

interface HeaderProps {
    selectedTimeframe: ReportTimeframe;
    onTimeframeChange: (timeframe: ReportTimeframe) => void;
    isFetching: boolean;
    tenantId: string;
}

export default function DashboardHeader({ selectedTimeframe, onTimeframeChange, isFetching, tenantId }: HeaderProps) {
    const invalidateReport = useInvalidateInventoryReport();

    const [isManualRefresh, setIsManualRefresh] = useState(false);

    const handleRefresh = () => {
        setIsManualRefresh(true);
        invalidateReport(tenantId);
        
        // Enforce a minimum 700ms spin duration for tactile UI feedback,
        // even if the database responds instantly.
        setTimeout(() => {
            setIsManualRefresh(false);
        }, 700);
    };

    // The icon should spin if the network is genuinely slow, OR if our manual timer is running
    const isSpinning = isFetching || isManualRefresh;

    return (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Inventory Intelligence</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Track asset value, movement velocity, and operational health.</p>
            </div>

            <div className="flex gap-3 items-center">
                <select
                    value={selectedTimeframe}
                    onChange={(e) => onTimeframeChange(e.target.value as ReportTimeframe)}
                    disabled={isSpinning}
                    className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 transition-colors"
                >
                    <option value="daily">Today</option>
                    <option value="weekly">Last 7 Days</option>
                    <option value="monthly">Last 30 Days</option>
                    <option value="yearly">Last 12 Months</option>
                </select>

                <button
                    onClick={handleRefresh}
                    disabled={isSpinning}
                    className="p-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-50 transition-all duration-200"
                    title="Refresh Data"
                >
                    <RefreshCw 
                        className={`w-4 h-4 transition-transform duration-500 ${
                            isSpinning 
                                ? 'animate-spin text-blue-600 dark:text-blue-400' 
                                : 'hover:rotate-180' 
                        }`} 
                    />
                </button>

                <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
                    <Download className="w-4 h-4" />
                    Export PDF
                </button>
            </div>
        </div>
    );
}