"use client";

import DeleteConfirmForm from '@/components/common/DeleteConfirmForm';
import ExpenseControlPanel from '@/components/finance/expenses/ExpenseControlPanel';
import ExpenseForm from '@/components/finance/expenses/ExpenseForm';
import ExpensesTable from '@/components/finance/expenses/ExpensesTable';
import ActionModal from '@/components/ui/ActionModal';
import { useCreateExpense, useDeleteExpense, useExpenseCategories, useExpensesWithCategories, useUpdateExpense } from '@/hooks/useFinance';
import { ExpenseFormData } from '@/lib/validations/expenseSchema';
import { useTenantStore } from '@/store/useTenantStore';
import { ExpenseWithCategory } from '@/types/finance';
import { FileText } from 'lucide-react';
import { useMemo, useState } from 'react'
import { toast } from 'react-toastify';

const mapToFormData = (expense: ExpenseWithCategory | null): Partial<ExpenseFormData> | undefined => {
    if (!expense) return undefined;
    return {
        id: expense.id,
        amount: expense.amount,
        expense_date: expense.expense_date,
        category_id: expense.category_id,
        payment_method: expense.payment_method,
        description: expense.description || "",
        receipt_url: expense.receipt_url || null,
    };
};

export default function ExpensesPage() {

    const activeTenant = useTenantStore((state) => state.activeTenant);
    const tenantId = activeTenant?.tenantId || "";

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    
    const { data: expenses = [], isLoading, isError } = useExpensesWithCategories(tenantId);

    const { data: categories = [] } = useExpenseCategories(tenantId);

    const { mutateAsync: createExpense } = useCreateExpense();
    const { mutateAsync: updateExpense } = useUpdateExpense();
    const { mutateAsync: deleteExpense, isPending: isDeleting } = useDeleteExpense();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState<"create" | "update" | "delete">("create");
    const [selectedExpense, setSelectedExpense] = useState<ExpenseWithCategory | null>(null);

    const handleOpenCreate = () => {
        setModalType("create");
        setSelectedExpense(null);
        setIsModalOpen(true);
    };

    const handleOpenUpdate = (expense: ExpenseWithCategory) => {
        setModalType("update");
        setSelectedExpense(expense);
        setIsModalOpen(true);
    };

    const handleOpenDelete = (expense: ExpenseWithCategory) => {
        setModalType("delete");
        setSelectedExpense(expense);
        setIsModalOpen(true);
    };

    // --- SUBMIT ACTIONS ---
    const handleCreateSubmit = async (data: ExpenseFormData) => {
        try {
            await createExpense({ tenantId: tenantId, data });
            toast.success("Expense recorded successfully!");
            setIsModalOpen(false);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to record expense.");
        }
    };

    const handleUpdateSubmit = async (data: ExpenseFormData) => {
        if (!selectedExpense?.id) return;
        try {
            await updateExpense({ tenantId: tenantId, expenseId: selectedExpense.id, data });
            toast.success("Expense updated successfully!");
            setIsModalOpen(false);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to update expense.");
        }
    };

    const handleDeleteSubmit = async () => {
        if (!selectedExpense?.id) return;
        try {
            await deleteExpense({ expenseId: selectedExpense.id, tenantId: tenantId });
            toast.success("Expense deleted successfully!");
            setIsModalOpen(false);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to delete expense.");
        }
    };

    const filteredExpenses = useMemo(() => {
        let result = expenses;

        if (selectedCategory !== 'all') {
            result = result.filter(exp => exp.expense_categories?.name === selectedCategory);
        }

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(exp =>
                (exp.description || '').toLowerCase().includes(query) ||
                (exp.expense_categories?.name?.toLowerCase().includes(query))
            );
        }

        return result;
    }, [searchQuery, selectedCategory, expenses]);

    return (
        <div className='flex flex-col gap-6 p-4 sm:p-6 lg:p-8 min-h-screen bg-slate-50/50 dark:bg-slate-900'>

            {/* Header */}
            <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Expenses</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">Track and manage your operational costs.</p>
            </div>

            {/* Control Panel */}
            <ExpenseControlPanel
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                categories={categories}
                onAddExpense={handleOpenCreate}
            />

            {/* Table Area */}
            {isLoading ? (
                <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
                    <span className="text-sm font-medium text-slate-500">Loading expenses...</span>
                </div>
            ) : isError ? (
                <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 text-red-500">
                    <span className="text-sm font-medium">Failed to load expenses data.</span>
                </div>
            ) : filteredExpenses.length === 0 ? (
                <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 text-slate-500">
                    <FileText className="h-10 w-10 text-slate-300 dark:text-slate-600" />
                    <span className="text-sm font-medium">No expenses found matching your criteria.</span>
                </div>
            ) : (
                <ExpensesTable 
                    data={filteredExpenses} 
                    onEdit={handleOpenUpdate}
                    onDelete={handleOpenDelete}
                />
            )}

            {/* ACTION MODAL FOR CREATE/UPDATE/DELETE */}
            <ActionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={modalType === "create" ? "Record Expense" : modalType === "update" ? "Edit Expense" : ""}
            >
                {modalType === "delete" ? (
                    <DeleteConfirmForm
                        itemName={selectedExpense?.description || "this expense"}
                        itemType='Expense'
                        isDeleting={isDeleting}
                        onCancel={() => setIsModalOpen(false)}
                        onConfirm={handleDeleteSubmit}
                    />
                ) : (
                    <ExpenseForm
                        type={modalType}
                        tenantId={tenantId}
                        isModal={true}
                        categories={categories}
                        defaultValues={modalType === "update" ? mapToFormData(selectedExpense) : undefined}
                        onCancel={() => setIsModalOpen(false)}
                        onSubmit={modalType === "create" ? handleCreateSubmit : handleUpdateSubmit}
                    />
                )}
            </ActionModal>

        </div>
    )
}
