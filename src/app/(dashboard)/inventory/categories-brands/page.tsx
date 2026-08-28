"use client";

import DeleteConfirmForm from '@/components/common/DeleteConfirmForm';
import BrandForm from '@/components/inventory/BrandForm';
import CategoriesBrandsTable from '@/components/inventory/CategoriesBrandsTable';
import CategoryForm from '@/components/inventory/CategoryForm';
import ActionModal from '@/components/ui/ActionModal';
import { useBrands, useCategories, useCreateBrand, useCreateCategory, useDeleteBrand, useDeleteCategory, useUpdateBrand, useUpdateCategory } from '@/hooks/useInventory';
import { useNavigation } from '@/hooks/useNavigation';
import { CategoryFormData, BrandFormData } from '@/lib/validations/categoryBrandSchema';
import { useTenantStore } from '@/store/useTenantStore';
import { Brand, Category } from '@/types/inventory';
import { Loader2, Plus } from 'lucide-react';
import { useState } from 'react'
import { toast } from 'react-toastify';

export default function CategoriesAndBrandsPage() {

    const activeTenant = useTenantStore((state) => state.activeTenant);
    const tenantId = activeTenant?.tenantId || "";
    const { currentRole } = useNavigation();
    // UI State
    const [activeTab, setActiveTab] = useState<'categories' | 'brands'>('categories');
    
    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState<"create" | "update" | "delete">("create");
    const [selectedItem, setSelectedItem] = useState<Category | Brand | null>(null);

    // Queries
    const { data: categories = [], isLoading: isLoadingCats } = useCategories(tenantId);
    const { data: brands = [], isLoading: isLoadingBrands } = useBrands(tenantId);

    // Category Mutations
    const createCategory = useCreateCategory(tenantId);
    const updateCategory = useUpdateCategory(tenantId);
    const deleteCategory = useDeleteCategory(tenantId);

    // Brand Mutations
    const createBrand = useCreateBrand(tenantId);
    const updateBrand = useUpdateBrand(tenantId);
    const deleteBrand = useDeleteBrand(tenantId);

    // --- Action Handlers ---
    const handleOpenCreate = () => {
        setModalType("create");
        setSelectedItem(null);
        setIsModalOpen(true);
    };

    const handleOpenUpdate = (item: Category | Brand) => {
        setModalType("update");
        setSelectedItem(item);
        setIsModalOpen(true);
    };

    const handleOpenDelete = (item: Category | Brand) => {
        setModalType("delete");
        setSelectedItem(item);
        setIsModalOpen(true);
    };

    // --- Submit Handlers ---
    const handleCategorySubmit = async (data: CategoryFormData) => {
        try {
            if (modalType === "create") {
                await createCategory.mutateAsync(data);
                toast.success("Category created successfully!");
            } else if (modalType === "update" && selectedItem) {
                await updateCategory.mutateAsync({ categoryId: selectedItem.id, data });
                toast.success("Category updated successfully!");
            }
            setIsModalOpen(false);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to save category.");
        }
    };

    const handleBrandSubmit = async (data: BrandFormData) => {
        try {
            if (modalType === "create") {
                await createBrand.mutateAsync(data);
                toast.success("Brand created successfully!");
            } else if (modalType === "update" && selectedItem) {
                await updateBrand.mutateAsync({ brandId: selectedItem.id, data });
                toast.success("Brand updated successfully!");
            }
            setIsModalOpen(false);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to save brand.");
        }
    };

    const handleDeleteConfirm = async () => {
        if (!selectedItem) return;
        try {
            if (activeTab === "categories") {
                await deleteCategory.mutateAsync(selectedItem.id);
                toast.success("Category deleted successfully!");
            } else {
                await deleteBrand.mutateAsync(selectedItem.id);
                toast.success("Brand deleted successfully!");
            }
            setIsModalOpen(false);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to delete item.");
        }
    };

    return (
        <div className='flex flex-col gap-6 p-4 sm:p-6 lg:p-8'>

            {/* Page Header Area */}
            <div className="flex flex-col gap-4 sm:flex-row sm;items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                        {activeTab === 'categories' ? 'Categories' : 'Brands'}
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Manage your {activeTab === 'categories' ? 'product categories' : 'product brands'}.
                    </p>
                </div>

                {/* Dynamic Add Button */}
                {currentRole === "owner" && (
                    <button 
                        onClick={handleOpenCreate}
                        className="inline-flex h-9 items-center justify-center rounded-md bg-orange-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-orange-600 shadow-sm"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Add {activeTab === 'categories' ? 'Category' : 'Brand'}
                    </button>
                )}
            </div>

            <div className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                {/* Tabs Navigation */}
                <div className="flex border-b border-slate-200 px-5 pt-4 dark:border-slate-800">
                    <button
                        onClick={() => setActiveTab('categories')}
                        className={`mr-6 flex items-center gap-2 border-b-2 pb-3 text-sm font-medium transition-colors ${activeTab === 'categories'
                            ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                            : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                            }`}
                    >
                        Categories
                        <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            {categories.length}
                        </span>
                    </button>

                    <button
                        onClick={() => setActiveTab('brands')}
                        className={`mr-6 flex items-center gap-2 border-b-2 pb-3 text-sm font-medium transition-colors ${activeTab === 'brands'
                            ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                            : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                            }`}
                    >
                        Brands
                        <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            {brands.length}
                        </span>
                    </button>
                </div>

                {/* Content Area */}
                <div className="p-5">
                    {(isLoadingCats && activeTab === 'categories') || (isLoadingBrands && activeTab === 'brands') ? (
                        <div className="flex h-48 flex-col items-center justify-center gap-3">
                            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                            <span className="text-sm font-medium text-slate-500">Loading {activeTab}...</span>
                        </div>
                    ) : (
                        <CategoriesBrandsTable 
                            activeTab={activeTab}
                            data={activeTab === 'categories' ? categories : brands}
                            onEdit={handleOpenUpdate}
                            onDelete={handleOpenDelete}
                        />
                    )}
                </div>
            </div>

            <ActionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={
                    modalType === "delete" 
                        ? `Delete ${activeTab === "categories" ? "Category" : "Brand"}`
                        : `${modalType === "create" ? "Add" : "Edit"} ${activeTab === "categories" ? "Category" : "Brand"}`
                }
            >
                {modalType === "delete" ? (
                    <DeleteConfirmForm
                        itemName={selectedItem?.name || "this item"}
                        itemType={activeTab === "categories" ? "Category" : "Brand"}
                        isDeleting={activeTab === "categories" ? deleteCategory.isPending : deleteBrand.isPending}
                        onCancel={() => setIsModalOpen(false)}
                        onConfirm={handleDeleteConfirm}
                    />
                ) : activeTab === "categories" ? (
                    <CategoryForm
                        type={modalType as "create" | "update"}
                        defaultValues={selectedItem as Partial<CategoryFormData> | undefined}
                        existingCategories={categories}
                        onCancel={() => setIsModalOpen(false)}
                        onSubmit={handleCategorySubmit}
                    />
                ) : (
                    <BrandForm
                        type={modalType as "create" | "update"}
                        defaultValues={selectedItem as Partial<BrandFormData> | undefined}
                        onCancel={() => setIsModalOpen(false)}
                        onSubmit={handleBrandSubmit}
                    />
                )}
            </ActionModal>
        </div>
    )
}
