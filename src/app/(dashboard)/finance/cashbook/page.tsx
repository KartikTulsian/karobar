"use client";

import CashBookForm from '@/components/finance/cashbook/CashBookForm';
import ActionModal from '@/components/ui/ActionModal';
import { useCashReferenceData, useCreateCashEntry, useDailyCashSummaries } from '@/hooks/useFinance';
import { CashBookFormData } from '@/lib/validations/cashBookSchema';
import { AlertCircle, FileText, Wallet } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import DailyCashSummaryControlPanel from '@/components/finance/cashbook/DailyCashSummaryControlPanel';
import DailyCashSummaryTable from '@/components/finance/cashbook/DailyCashSummaryTable';
import { useTenantStore } from '@/store/useTenantStore';

export default function CashBookPage() {
    const activeTenant = useTenantStore((state) => state.activeTenant);
    const tenantId = activeTenant?.tenantId || "";

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedMonth, setSelectedMonth] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Queries (Assuming we will build these hooks next)
    // const { data: cashEntries = [], isLoading, isError } = useCashEntries(tenantId);
    const { data: dailySummariesRaw = [], isLoading, isError } = useDailyCashSummaries(tenantId);
    const { data: referenceData } = useCashReferenceData(tenantId);
    const { mutateAsync: createCashEntry } = useCreateCashEntry();

    const dailySummaries = useMemo(() => {
        let result = [...dailySummariesRaw];

        if (selectedMonth) {
            result = result.filter(summary => summary.date.startsWith(selectedMonth));
        }

        if (searchQuery) {
            result = result.filter(summary => summary.date === searchQuery);
        }

        return result;
    }, [dailySummariesRaw, selectedMonth, searchQuery]);
    
    // Calculate current drawer balance from the latest entry (first in array since we sort desc)
    const currentBalance = dailySummariesRaw.length > 0 ? dailySummariesRaw[0].closingBalance : 0;
    const isNegativeBalance = currentBalance < 0;

    const handleCreateSubmit = async (data: CashBookFormData) => {
        try {
            await createCashEntry({ tenantId: tenantId, data });
            toast.success("Cash entry recorded!");
            setIsModalOpen(false);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to record cash entry.");
        }
    };

    const billOptions = referenceData?.bills.map(b => ({ id: b.id, bill_number: b.bill_number, grand_total: b.grand_total })) || [];
    const expenseOptions = referenceData?.expenses.map(e => ({ id: e.id, description: e.description || "Expense", amount: e.amount })) || [];
    const purchaseOptions = referenceData?.purchases.map(p => ({ id: p.id, po_number: p.po_number, total_amount: p.total_amount })) || [];

    return (
        <div className='flex flex-col gap-6 p-4 sm:p-6 lg:p-8 min-h-screen bg-slate-50/50 dark:bg-slate-900'>

            {/* Header & Balance Card */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Cash Book</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Track physical cash in your shop drawer.</p>
                </div>
                
                {/* Big Balance Highlight */}
                <div className="flex items-center gap-4 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                        <Wallet className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-500">Current Drawer Balance</p>
                        <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400">₹{currentBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                    </div>
                </div>
            </div>

            {isNegativeBalance && (
                 <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200">
                 <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                 <div className="text-sm">
                     <p className="font-semibold">Negative Treasury Detected</p>
                     <p className="mt-1 opacity-90">Your global ledger is negative. This occurs mathematically if you record expenses or supplier payments without first adding a &quot;Morning Float&quot; or receiving enough sales income. Add a manual adjustment to balance the system.</p>
                 </div>
             </div>
            )}

            <DailyCashSummaryControlPanel
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                selectedMonth={selectedMonth}
                setSelectedMonth={setSelectedMonth}
                onAddEntry={() => setIsModalOpen(true)}
            />

            {/* Table Area */}
            {isLoading ? (
                <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
                    <span className="text-sm font-medium text-slate-500">Loading daily summaries...</span>
                </div>
            ) : isError ? (
                <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 text-red-500">
                    <span className="text-sm font-medium">Failed to load cash book data.</span>
                </div>
            ) : dailySummaries.length === 0 ? (
                <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 text-slate-500">
                    <FileText className="h-10 w-10 text-slate-300 dark:text-slate-600" />
                    <span className="text-sm font-medium">No ledger activity found for this period.</span>
                </div>
            ) : (
                <DailyCashSummaryTable data={dailySummaries} />
            )}

            <ActionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Quick Entry">
                <CashBookForm
                    type="create"
                    isModal={true}
                    bills={billOptions}
                    expenses={expenseOptions}
                    purchases={purchaseOptions}
                    onCancel={() => setIsModalOpen(false)}
                    onSubmit={handleCreateSubmit}
                />
            </ActionModal>
        </div>
    );
}