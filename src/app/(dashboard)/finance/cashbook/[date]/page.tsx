"use client";

import DeleteConfirmForm from '@/components/common/DeleteConfirmForm';
import CashBookControlPanel from '@/components/finance/cashbook/CashBookControlPanel';
import CashBookForm from '@/components/finance/cashbook/CashBookForm';
import CashBookTable from '@/components/finance/cashbook/CashBookTable';
import ActionModal from '@/components/ui/ActionModal';
import { useCashEntries, useCashReferenceData, useCreateCashEntry, useUpdateCashEntry, useDeleteCashEntry } from '@/hooks/useFinance';
import { CashBookFormData } from '@/lib/validations/cashBookSchema';
import { useTenantStore } from '@/store/useTenantStore';
import { CashEntry } from '@/types/finance';
import { getLocalDateString, isSameLocalDate, mergeDateWithOriginalTime } from '@/lib/utils';
import { ArrowLeft, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { use, useMemo, useState } from 'react'
import { toast } from 'react-toastify';

const mapToFormData = (entry: CashEntry | null): Partial<CashBookFormData> | undefined => {
    if (!entry) return undefined;
    return {
        id: entry.id,
        type: entry.type,
        amount: entry.amount,
        entry_date: getLocalDateString(entry.entry_date),
        description: entry.description,
        reference_type: entry.reference_type,
        reference_id: entry.reference_id,
    };
};

export default function DailyCashDetailView({ params }: { params: Promise<{ date: string }> }) {
    const router = useRouter();

    const { date } = use(params);
    
    const activeTenant = useTenantStore((state) => state.activeTenant);
    const tenantId = activeTenant?.tenantId || "";

    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [selectedType, setSelectedType] = useState('all');
    const [selectedSource, setSelectedSource] = useState('all');
    const [selectedMethod, setSelectedMethod] = useState('all');

    // Queries (Assuming we will build these hooks next)
    const { data: allCashEntries = [], isLoading, isError } = useCashEntries(tenantId);
    const { data: referenceData } = useCashReferenceData(tenantId);

    // Mutations
    const { mutateAsync: createCashEntry } = useCreateCashEntry();
    const { mutateAsync: updateCashEntry } = useUpdateCashEntry();
    const { mutateAsync: deleteCashEntry, isPending: isDeleting } = useDeleteCashEntry();

    // Modal State Management
    const [modalType, setModalType] = useState<"create" | "update" | "delete">("create");
    const [selectedEntry, setSelectedEntry] = useState<CashEntry | null>(null);

    // --- HANDLERS ---
    const handleOpenCreate = () => {
        setModalType("create");
        setSelectedEntry(null);
        setIsModalOpen(true);
    };

    const handleOpenUpdate = (entry: CashEntry) => {
        setModalType("update");
        setSelectedEntry(entry);
        setIsModalOpen(true);
    };

    const handleOpenDelete = (entry: CashEntry) => {
        setModalType("delete");
        setSelectedEntry(entry);
        setIsModalOpen(true);
    };


    // --- SUBMIT ACTIONS ---
    const handleCreateSubmit = async (data: CashBookFormData) => {
        try {
            await createCashEntry({ tenantId: tenantId, data });
            toast.success("Cash entry recorded!");
            setIsModalOpen(false);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to record cash entry.");
        }
    };

    const handleUpdateSubmit = async (data: CashBookFormData) => {
        if (!selectedEntry?.id) return;
        try {
            await updateCashEntry({
                tenantId: tenantId,
                entryId: selectedEntry.id,
                data: {
                    ...data,
                    entry_date: mergeDateWithOriginalTime(data.entry_date, selectedEntry.entry_date),
                },
            });
            toast.success("Cash entry updated!");
            setIsModalOpen(false);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to update cash entry.");
        }
    };

    const handleDeleteSubmit = async () => {
        if (!selectedEntry?.id) return;
        try {
            await deleteCashEntry({ entryId: selectedEntry.id, tenantId: tenantId });
            toast.success("Cash entry deleted!");
            setIsModalOpen(false);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to delete cash entry.");
        }
    };

    // --- FILTERING ---
    const filteredEntries = useMemo(() => {
        let result = allCashEntries.filter(entry => isSameLocalDate(entry.entry_date, date));

        if (selectedType !== 'all') {
            result = result.filter(entry => entry.type === selectedType);
        }

        if (selectedSource !== 'all') {
            result = result.filter(entry => entry.reference_type === selectedSource);
        }

        if (selectedMethod !== 'all') {
            result = result.filter(entry => (entry).payment_method === selectedMethod);
        }

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(entry =>
                entry.description.toLowerCase().includes(query) ||
                entry.reference_type.toLowerCase().includes(query)
            );
        }

        return result;
    }, [date, searchQuery, selectedType, selectedSource, selectedMethod, allCashEntries]);

    const billOptions = referenceData?.bills.map(b => ({ id: b.id, bill_number: b.bill_number, grand_total: b.grand_total })) || [];
    const expenseOptions = referenceData?.expenses.map(e => ({ id: e.id, description: e.description || "Expense", amount: e.amount })) || [];
    const purchaseOptions = referenceData?.purchases.map(p => ({ id: p.id, po_number: p.po_number, total_amount: p.total_amount })) || [];

    const displayDate = new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

    return (
        <div className='flex flex-col gap-6 p-4 sm:p-6 lg:p-8 min-h-screen bg-slate-50/50 dark:bg-slate-900'>
            
            <div className="flex items-center gap-3">
                <button onClick={() => router.push('/finance/cashbook')} className="p-2 bg-white rounded-full border hover:bg-slate-50 transition-colors">
                    <ArrowLeft className="h-5 w-5 text-slate-600" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Transactions</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Ledger details for {displayDate}</p>
                </div>
            </div>

            <CashBookControlPanel
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                selectedType={selectedType}
                setSelectedType={setSelectedType}
                selectedSource={selectedSource}
                setSelectedSource={setSelectedSource}
                selectedMethod={selectedMethod}
                setSelectedMethod={setSelectedMethod}
                onAddEntry={handleOpenCreate}
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
            ) : filteredEntries.length === 0 ? (
                <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 text-slate-500">
                    <FileText className="h-10 w-10 text-slate-300 dark:text-slate-600" />
                    <span className="text-sm font-medium">No ledger activity found for this period.</span>
                </div>
            ) : (
                <CashBookTable 
                    data={filteredEntries} 
                    onEdit={handleOpenUpdate}
                    onDelete={handleOpenDelete}
                />
            )}

            {/* ACTION MODAL FOR CREATE/UPDATE/DELETE */}
            <ActionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={modalType === "create" ? "Add Manual Entry" : modalType === "update" ? "Edit Entry" : ""}
            >
                {modalType === "delete" ? (
                    <DeleteConfirmForm
                        itemName={selectedEntry?.description || "this entry"}
                        itemType='Cash Book Entry'
                        isDeleting={isDeleting}
                        onCancel={() => setIsModalOpen(false)}
                        onConfirm={handleDeleteSubmit}
                    />
                ) : (
                    <CashBookForm
                        type={modalType}
                        isModal={true}
                        bills={billOptions}
                        expenses={expenseOptions}
                        purchases={purchaseOptions}
                        defaultValues={modalType === "update" ? mapToFormData(selectedEntry) : undefined}
                        onCancel={() => setIsModalOpen(false)}
                        onSubmit={modalType === "create" ? handleCreateSubmit : handleUpdateSubmit}
                    />
                )}
            </ActionModal>
        </div>
    )
}
