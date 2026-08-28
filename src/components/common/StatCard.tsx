import { ReactNode } from 'react';

interface StatCardProps {
    title: string;
    value: string | ReactNode;
    subtitle: string | ReactNode;
    icon: ReactNode;
    valueColor?: string;
}

export default function StatCard({ title, value, subtitle, icon, valueColor = 'text-gray-900 dark:text-white' }: StatCardProps) {
    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col gap-4 transition-colors">
            <div className="flex justify-between items-start">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</h3>
                <div className="p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-gray-600 dark:text-gray-300">
                    {icon}
                </div>
            </div>
            <div>
                <div className={`text-2xl font-bold ${valueColor}`}>{value}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</div>
            </div>
        </div>
    );
}