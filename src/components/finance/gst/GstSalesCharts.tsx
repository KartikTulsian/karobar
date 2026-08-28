import { GSTSummaryRow } from '@/types/finance'
import { Bar, BarChart, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, TooltipPayloadEntry, XAxis, YAxis } from 'recharts';

interface GstSalesChartsProps {
    breakdown: GSTSummaryRow[];
}

const COLORS: Record<string, string> = {
    'B2B Invoices (4A, 4B, 4C)': '#16a34a', // Green
    'B2C Invoices (Table 7)': '#eab308', // Yellow
    'B2B Credit Notes (CDNR - 9B)': '#ef4444', // Red
    'B2C Credit Notes (CDNU)': '#f97316', // Orange
    'Purchase Invoices (Eligible ITC)': '#3b82f6', // Blue
    'Purchase Returns (ITC Reversals)': '#a855f7', // Purple
};

type TooltipValue = number | string | readonly (number | string)[] | undefined;

export default function GstSalesCharts({ breakdown }: GstSalesChartsProps) {
    const pieData = breakdown
        .filter(d => d.record_count > 0)
        .map(d => ({
            name: d.description,
            value: d.record_count,
            color: COLORS[d.description] || '#64748b'
        }));

    const barData = breakdown.map(d => ({
        name: d.description.toString().split('(')[0].trim(), // Shortens labels for the X-axis
        tax: d.total_tax > 0 ? d.total_tax : 0,
        refund: d.total_tax < 0 ? Math.abs(d.total_tax) : 0,
    }));

    const formatYAxis = (val: number) => `₹${(val / 1000).toFixed(0)}k`;

    const formatTooltipValue = (
        value: TooltipValue,
        _name?: string | number,
        _item?: TooltipPayloadEntry,
        _index?: number
    ): string => {
        if (value === undefined) return '₹0.00';
        const numValue = Array.isArray(value) ? Number(value[0]) : Number(value);
        return `₹${(isNaN(numValue) ? 0 : numValue).toFixed(2)}`;
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">

            {/* Left: Donut Chart (Invoice Volume) */}
            <div className="lg:col-span-1 flex flex-col items-center justify-center h-80">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 w-full text-left mb-2">Record Count by Type</h3>
                <ResponsiveContainer width="99%" height="100%" minHeight={250}>
                    <PieChart>
                        <Pie data={pieData} innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value">
                            {pieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', backgroundColor: '#1e293b', color: '#fff' }} />
                        <Legend verticalAlign="bottom" height={60} wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    </PieChart>
                </ResponsiveContainer>
            </div>

            {/* Right: Bar Chart (Tax Value) */}
            <div className="lg:col-span-2 h-80">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 w-full text-left mb-2">Total Tax Value (₹)</h3>
                <ResponsiveContainer width="99%" height="100%" minHeight={250}>
                    <BarChart data={barData} margin={{ top: 20, right: 30, left: 20, bottom: 25 }}>
                        <XAxis dataKey="name" fontSize={11} stroke="#94a3b8" angle={-15} textAnchor="end" />
                        <YAxis tickFormatter={formatYAxis} fontSize={12} stroke="#94a3b8" />
                        <Tooltip formatter={formatTooltipValue} cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }} contentStyle={{ borderRadius: '8px', border: 'none', backgroundColor: '#1e293b', color: '#fff' }} />
                        <Bar dataKey="tax" stackId="a" fill="#16a34a" name="Tax Collected/ITC" radius={[4, 4, 0, 0]} barSize={40} />
                        <Bar dataKey="refund" stackId="a" fill="#ef4444" name="Tax Refunded/Reversed" radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}