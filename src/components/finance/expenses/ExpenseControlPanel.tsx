import { ExpenseCategory } from '@/types/finance';
import { Search, Filter, Plus } from 'lucide-react';

interface ExpensesControlPanelProps {
    searchQuery: string;
    setSearchQuery: (val: string) => void;
    selectedCategory: string;
    setSelectedCategory: (val: string) => void;
    categories: ExpenseCategory[];
    onAddExpense: () => void;
}

export default function ExpenseControlPanel({
    searchQuery, setSearchQuery, selectedCategory, setSelectedCategory, categories, onAddExpense
}: ExpensesControlPanelProps) {
    return (
        <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:flex-row lg:items-center lg:justify-between">

            {/* Left side: Search and Filters */}
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                {/* Search Bar */}
                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search description..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    />
                </div>

                {/* Category Filter */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Filter className="h-4 w-4 text-slate-400" />
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="h-9 w-full sm:w-auto rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    >
                        <option value="all">All Categories</option>
                        {categories.map((cat) => (
                            <option key={cat.id} value={cat.name}>{cat.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Right side: Actions */}
            <div className="flex shrink-0 gap-3">
                <button className="inline-flex h-9 items-center justify-center rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">
                    Manage Categories
                </button>
                <button
                    onClick={onAddExpense}
                    className="inline-flex h-9 items-center justify-center rounded-md bg-indigo-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 shadow-sm"
                >
                    <Plus className="mr-2 h-4 w-4" /> Add Expense
                </button>
            </div>
        </div>
    );
}
