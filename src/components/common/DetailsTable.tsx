import React from 'react';

interface DetailRow {
  label: string;
  value: React.ReactNode;
  valueClassName?: string; // Optional class for things like green text for prices
}

interface DetailsTableProps {
  title?: string;
  data: DetailRow[];
}

export default function DetailsTable({ title, data }: DetailsTableProps) {
  return (
    <div className="flex flex-col gap-4">
      {title && (
        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          {title}
        </h3>
      )}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.map((row, index) => (
              <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="w-1/3 px-6 py-4 font-semibold align-top bg-slate-50/30 dark:bg-slate-800/20">{row.label}</td>
                <td className={`px-6 py-4 ${row.valueClassName || 'text-slate-900 dark:text-white'}`}>
                  {row.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}