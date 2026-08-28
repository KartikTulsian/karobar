// src/components/coomon/Table.tsx
import { ChevronDown, ChevronLeft, ChevronRight, ChevronsUpDown, ChevronUp } from 'lucide-react';
import React, { useMemo, useState } from 'react'

interface TableProps<T> {
    columns: { header: string; accessor: string; className?: string; sortable?: boolean }[];
    renderRow: (item: T) => React.ReactNode;
    data: T[];
}

type SortDirection = 'asc' | 'desc' | null;

export default function Table<T>({ columns, renderRow, data }: TableProps<T>) {

    const [sortConfig, setSortConfig] = useState<{ key: string; direction: SortDirection }>({
        key: '',
        direction: null
    })

    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const sortedData = useMemo(() => {

        if (!sortConfig.key || !sortConfig.direction) return data;

        return [...data].sort((a, b) => {
            // Get the values we are comparing based on the accessor string
            const aValue = a[sortConfig.key as keyof T];
            const bValue = b[sortConfig.key as keyof T];

            // Handle nulls/undefined safely
            if (aValue === null || aValue === undefined) return 1;
            if (bValue === null || bValue === undefined) return -1;

            // Handle strings vs numbers
            if (typeof aValue === 'string' && typeof bValue === 'string') {
                return sortConfig.direction === 'asc'
                    ? aValue.localeCompare(bValue)
                    : bValue.localeCompare(aValue);
            }

            // Default comparison (works for numbers and dates)
            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [data, sortConfig]);

    //1. Calculate total pages
    const totalPages = Math.ceil(sortedData.length / rowsPerPage);

    //2. Slice the sorted array to only get the rows for the current page
    const paginationData = useMemo(() => {
        const startIndex = (currentPage - 1) * rowsPerPage;
        return sortedData.slice(startIndex, startIndex + rowsPerPage);
    }, [sortedData, currentPage, rowsPerPage]);

    const handleSort = (accessor: string, sortable?: boolean) => {
        if (!sortable) return;

        let direction: SortDirection = 'asc';

        // If clicking the same column, toggle direction: asc -> desc -> null(reset)
        if (sortConfig.key === accessor) {
            if (sortConfig.direction === 'asc') direction = 'desc';
            else if (sortConfig.direction === 'desc') direction = null;
        }

        setSortConfig({ key: accessor, direction });
        setCurrentPage(1);
    };

    const handleRowsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setRowsPerPage(Number(e.target.value));
        setCurrentPage(1);
    };

    return (
        <div className='w-full flex flex-col'>
            {/* Table Area */}
            <div className='overflow-x-auto'>
                <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                    <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-800/50">
                        <tr>
                            {columns.map((col) => (
                                <th
                                    key={col.accessor}
                                    onClick={() => handleSort(col.accessor, col.sortable)}
                                    className={`px-5 py-4 font-semibold ${col.className || ''} ${col.sortable ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors select-none' : ''}`}
                                >
                                    <div className="flex items-center gap-2">
                                        {col.header}
                                        {/* Render the appropriate sorting icon */}
                                        {col.sortable && (
                                            <span className="text-slate-400">
                                                {sortConfig.key === col.accessor ? (
                                                    sortConfig.direction === 'asc' ? <ChevronUp className="h-3 w-3" /> :
                                                        sortConfig.direction === 'desc' ? <ChevronDown className="h-3 w-3" /> :
                                                            <ChevronsUpDown className="h-3 w-3 opacity-50" />
                                                ) : (
                                                    <ChevronsUpDown className="h-3 w-3 opacity-50" />
                                                )}
                                            </span>
                                        )}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                        {paginationData.map((item) => renderRow(item))}
                    </tbody>
                </table>
            </div>

            {/* NEW: Pagination Footer */}
            <div className="flex items-center justify-between p-4 border-t border-slate-200 dark:border-slate-700/50 text-sm text-slate-500 dark:text-slate-400">

                {/* Left Side: Rows per page selector */}
                <div className="flex items-center gap-2">
                    <span>Row Per Page</span>
                    <select
                        value={rowsPerPage}
                        onChange={handleRowsPerPageChange}
                        className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800"
                    >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                    </select>
                    <span>Entries</span>
                </div>

                {/* Right Side: Page Navigation */}
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-slate-400 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-400 transition-colors"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>

                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-50 text-xs font-medium text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                            {currentPage}
                        </div>

                        <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages || totalPages === 0}
                            className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-slate-400 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-400 transition-colors"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>

            </div>
        </div>
    )
}
