import { RunnerItem, StragglerItem, VelocityChartPoint } from '@/types/reports';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface VelocityProps {
    chartData: VelocityChartPoint[];
    runners: RunnerItem[];
    stragglers: StragglerItem[];
}

// 1. Define the structure of an individual data point inside the Recharts tooltip payload
interface TooltipPayload {
    color: string;
    name: string;
    value: number | string;
    dataKey: string;
}

// 2. Define the main props for the Custom Tooltip component
interface CustomTooltipProps {
    active?: boolean;
    payload?: TooltipPayload[];
    label?: string;
}

const formatXAxisDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 shadow-md rounded-lg">
                <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{label ? formatXAxisDate(label) : ''}</p>
                {payload.map((entry: TooltipPayload, index: number) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span className="text-gray-600 dark:text-gray-300">{entry.name}:</span>
                        <span className="font-medium text-gray-900 dark:text-white">{entry.value} units</span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
}

export default function VelocitySection({ chartData, runners, stragglers }: VelocityProps) {

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Chart Area */}
            <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col transition-colors">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-6">Stock Velocity (Inbound vs Outbound)</h3>
                
                <div className="w-full flex-grow min-h-[300px]">
                    {chartData && chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart 
                                data={chartData} 
                                margin={{ top: 5, right: 0, left: -20, bottom: 0 }}
                            >
                                <defs>
                                    <linearGradient id="colorInbound" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorOutbound" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" opacity={0.3} />
                                
                                <XAxis 
                                    dataKey="period" 
                                    tickFormatter={formatXAxisDate} 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fontSize: 12, fill: '#9CA3AF' }} 
                                    dy={10} 
                                />
                                
                                <YAxis 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fontSize: 12, fill: '#9CA3AF' }} 
                                />
                                
                                <Tooltip content={<CustomTooltip />} />
                                
                                <Legend 
                                    iconType="circle" 
                                    wrapperStyle={{ fontSize: '12px', paddingTop: '20px', color: '#9CA3AF' }} 
                                />
                                
                                <Area 
                                    type="monotone" 
                                    name="Inbound (Purchased/Returns)" 
                                    dataKey="inbound_qty" 
                                    stroke="#10B981" 
                                    strokeWidth={2} 
                                    fillOpacity={1} 
                                    fill="url(#colorInbound)" 
                                />
                                
                                <Area 
                                    type="monotone" 
                                    name="Outbound (Sales)" 
                                    dataKey="outbound_qty" 
                                    stroke="#EF4444" 
                                    strokeWidth={2} 
                                    fillOpacity={1} 
                                    fill="url(#colorOutbound)" 
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="w-full h-full border border-dashed border-gray-300 dark:border-gray-700 rounded-lg flex items-center justify-center text-gray-500 dark:text-gray-400">
                            No movement data available for this period.
                        </div>
                    )}
                </div>
            </div>

            {/* Movers & Stragglers */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col gap-6 transition-colors">
                <div>
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                        <TrendingUp className="w-4 h-4 text-green-500" /> Top Runners
                    </h4>
                    <ul className="space-y-3">
                        {runners.length === 0 ? <li className="text-sm text-gray-500 dark:text-gray-400">No outbound movement</li> : null}
                        {runners.map(item => (
                            <li key={item.item_id} className="flex justify-between text-sm">
                                <span className="text-gray-600 dark:text-gray-300 truncate mr-2" title={item.name}>{item.name}</span>
                                <span className="font-medium flex-shrink-0 text-red-600 dark:text-red-400">-{item.outbound_volume}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                        <TrendingDown className="w-4 h-4 text-red-500" /> Dead Stock
                    </h4>
                    <ul className="space-y-3">
                        {stragglers.length === 0 ? <li className="text-sm text-gray-500 dark:text-gray-400">No dead stock</li> : null}
                        {stragglers.map(item => (
                            <li key={item.item_id} className="flex justify-between text-sm">
                                <span className="text-gray-600 dark:text-gray-300 truncate mr-2" title={item.name}>{item.name}</span>
                                <span className="font-medium flex-shrink-0 text-gray-900 dark:text-white">{item.current_stock} in stock</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}