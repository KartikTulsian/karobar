"use client";

import DeleteConfirmForm from '@/components/common/DeleteConfirmForm';
import CustomerForm from '@/components/people/customers/CustomerForm';
import CustomersTable from '@/components/people/customers/CustomersTable';
import ActionModal from '@/components/ui/ActionModal';
import { useCreateCustomer, useCustomers, useDeleteCustomer, useUpdateCustomer } from '@/hooks/usePeople';
import { CustomerFormData } from '@/lib/validations/customerSchema';
import { useTenantStore } from '@/store/useTenantStore';
import { Customer, CustomerType } from '@/types/people';
import { Download, Plus, Search, Users } from 'lucide-react';
import { useMemo, useState } from 'react'
import { toast } from 'react-toastify';

type TabType = 'all' | CustomerType;

const mapToFormData = (customer: Customer | null): Partial<CustomerFormData> | undefined => {
    if (!customer) return undefined;
    return {
        id: customer.id,
        name: customer.name,
        company_name: customer.company_name || "",
        country_code: customer.country_code || "",
        phone: customer.phone || "",
        email: customer.email || "",
        type: customer.type,
        gstin: customer.gstin || "",
        address: customer.address || "",
        city: customer.city || "",
        state_code: customer.state_code || "",
        pincode: customer.pincode || "",
        country: customer.country || "",
        credit_limit: customer.credit_limit || 0,
        notes: customer.notes || "",
    };
};

export default function CustomersPage() {
    const activeTenant = useTenantStore((state) => state.activeTenant);
    const tenantId = activeTenant?.tenantId || "";

    const [activeTab, setActiveTab] = useState<TabType>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const { data: customers = [], isLoading, isError } = useCustomers(tenantId);

    // Mutations
    const { mutateAsync: createCustomer } = useCreateCustomer(tenantId);
    const { mutateAsync: updateCustomer } = useUpdateCustomer(tenantId);
    const { mutateAsync: deleteCustomer, isPending: isDeleting } = useDeleteCustomer(tenantId);

    // Modal State Management
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState<"create" | "update" | "delete">("create");
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

    const handleOpenCreate = () => {
        setModalType("create");
        setSelectedCustomer(null);
        setIsModalOpen(true);
    };

    const handleOpenUpdate = (customer: Customer) => {
        setModalType("update");
        setSelectedCustomer(customer);
        setIsModalOpen(true);
    };

    const handleOpenDelete = (customer: Customer) => {
        setModalType("delete");
        setSelectedCustomer(customer);
        setIsModalOpen(true);
    };

    const handleCreateSubmit = async (data: CustomerFormData) => {
        try {
            const result = await createCustomer(data);

            // Check if the backend matched this new customer to an existing Karobar user
            if (result && result.matchedUserId) {
                toast.success("Customer saved! They are already on Karobar. A connection request will be sent.");
            } else {
                toast.success("Customer added successfully!");
            }

            setIsModalOpen(false);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to add customer.");
        }
    };

    const handleUpdateSubmit = async (data: CustomerFormData) => {
        if (!selectedCustomer?.id) return;
        try {
            await updateCustomer({ customerId: selectedCustomer.id, data });
            toast.success("Customer updated successfully!");
            setIsModalOpen(false);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to update customer.");
        }
    };

    const handleDeleteSubmit = async () => {
        if (!selectedCustomer?.id) return;
        try {
            await deleteCustomer(selectedCustomer.id);
            toast.success("Customer deleted successfully!");
            setIsModalOpen(false);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to delete customer.");
        }
    };

    const filteredCustomers = useMemo(() => {
        let result = customers;

        if (activeTab !== 'all') {
            result = result.filter(c => c.type === activeTab);
        }

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(c =>
                c.name.toLowerCase().includes(query) ||
                (c.phone || "").toLowerCase().includes(query)
            );
        }

        return result;
    }, [searchQuery, activeTab, customers]);

    return (
        <div className='flex flex-col gap-6 p-4 sm:p-6 lg:p-8 min-h-screen bg-slate-50/50 dark:bg-slate-900'>

            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Customers</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Manage your customer relationships, credit limits, and purchase history.</p>
                </div>

                <div className="flex items-center gap-3">
                    <button className="inline-flex h-9 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        <Download className="mr-2 h-4 w-4" /> Export
                    </button>
                    <button
                        onClick={handleOpenCreate}
                        className="inline-flex h-9 items-center justify-center rounded-md bg-amber-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-amber-600 shadow-sm"
                    >
                        <Plus className="mr-2 h-4 w-4" /> Add Customer
                    </button>
                </div>
            </div>

            {/* Main Content Card */}
            <div className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">

                {/* Custom Tabs */}
                <div className="flex border-b border-slate-200 dark:border-slate-800 px-5 pt-3 gap-6 bg-slate-50/50 dark:bg-slate-900/50">
                    {(['all', 'registered', 'flying'] as TabType[]).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`pb-3 text-sm font-medium capitalize transition-colors border-b-2 ${activeTab === tab
                                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                }`}
                        >
                            {tab === 'all' ? 'All Bills' : `${tab} Customers`}
                        </button>
                    ))}
                </div>

                {/* Toolbar */}
                <div className="p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 dark:border-slate-800">
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by name or phone..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white"
                        />
                    </div>
                </div>

                {/* Table Rendering */}
                {isLoading ? (
                    <div className="flex h-48 flex-col items-center justify-center gap-3">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
                        <span className="text-sm font-medium text-slate-500">Loading customers...</span>
                    </div>
                ) : isError ? (
                    <div className="flex h-48 flex-col items-center justify-center gap-3 text-red-500">
                        <span className="text-sm font-medium">Failed to load data.</span>
                    </div>
                ) : filteredCustomers.length === 0 ? (
                    <div className="flex h-48 flex-col items-center justify-center gap-3 text-slate-500">
                        <Users className="h-10 w-10 text-slate-300" />
                        <span className="text-sm font-medium">No customers found.</span>
                    </div>
                ) : (
                    <CustomersTable 
                        data={filteredCustomers} 
                        onEdit={handleOpenUpdate}
                        onDelete={handleOpenDelete}
                    />
                )}
            </div>

            <ActionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={modalType === "create" ? "Add New Customer" : modalType === "update" ? "Edit Customer" : ""}
            >
                {modalType === "delete" ? (
                    <DeleteConfirmForm
                        itemName={selectedCustomer?.name || "this customer"}
                        itemType='Customer'
                        isDeleting={isDeleting}
                        onCancel={() => setIsModalOpen(false)}
                        onConfirm={handleDeleteSubmit}
                    />
                ) : (
                    <CustomerForm
                        type={modalType}
                        isModal={true}
                        defaultValues={modalType === "update" ? mapToFormData(selectedCustomer) : undefined}
                        onCancel={() => setIsModalOpen(false)}
                        onSubmit={modalType === "create" ? handleCreateSubmit : handleUpdateSubmit}
                    />
                )}
            </ActionModal>
        </div>
    )
}
