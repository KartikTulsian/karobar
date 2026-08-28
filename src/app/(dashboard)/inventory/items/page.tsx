"use client";

import DeleteConfirmForm from '@/components/common/DeleteConfirmForm';
import ItemForm from '@/components/inventory/ItemForm';
import ItemsTable from '@/components/inventory/ItemsTable';
import ActionModal from '@/components/ui/ActionModal';
import { useBrands, useCategories, useCreateItem, useDeleteItem, useInventory, useUpdateItem } from '@/hooks/useInventory';
import { ItemFormData } from '@/lib/validations/itemSchema';
import { useTenantStore } from '@/store/useTenantStore';
import { InventoryItem } from '@/types/inventory';
import { Download, Loader2, Plus, Search, Upload } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'react-toastify';

export default function AllItemsPage() {
  const activeTenant = useTenantStore((state) => state.activeTenant);
  const tenantId = activeTenant?.tenantId || "";

  const { data: items = [], isLoading, isError } = useInventory(tenantId);
  const { data: categories = [] } = useCategories(tenantId);
  const { data: brands = [] } = useBrands(tenantId);
  
  // Mutations (Using the hooks we built earlier!)
  const { mutateAsync: createItem } = useCreateItem(tenantId);
  const { mutateAsync: updateItem } = useUpdateItem(tenantId);
  const { mutateAsync: deleteItem, isPending: isDeleting } = useDeleteItem(tenantId);

  // Modal State Management
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"create" | "update" | "delete">("create");
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("");

  const filteredItems = items.filter(item => {
    // 1. Search Match (Checks Name and SKU)
    const matchesSearch = 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase()));

    // 2. Category Match
    const matchesCategory = selectedCategory ? item.category_id === selectedCategory : true;

    // 3. Brand Match
    const matchesBrand = selectedBrand ? item.brand_id === selectedBrand : true;

    return matchesSearch && matchesCategory && matchesBrand;
  });

  // --- HANDLERS ---
  const handleOpenCreate = () => {
    setModalType("create");
    setSelectedItem(null);
    setIsModalOpen(true);
  };

  const handleOpenUpdate = (item: InventoryItem) => {
    setModalType("update");
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const handleOpenDelete = (item: InventoryItem) => {
    setModalType("delete");
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  // --- SUBMIT ACTIONS ---
  const handleCreateSubmit = async (data: ItemFormData) => {
    try {
      await createItem(data);
      toast.success("Product added successfully!");
      setIsModalOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add product.");
    }
  };

  const handleUpdateSubmit = async (data: ItemFormData) => {
    if (!selectedItem?.id) return;
    try {
      await updateItem({ itemId: selectedItem.id, data });
      toast.success("Product updated successfully!");
      setIsModalOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update product.");
    }
  };

  const handleDeleteSubmit = async () => {
    if (!selectedItem?.id) return;
    try {
      await deleteItem(selectedItem.id);
      toast.success("Product deleted successfully!");
      setIsModalOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete product.");
    }
  };

  return (
    <div className='flex flex-col gap-6 p-4 sm:p-6 lg:p-8'>

      {/* Page Header Area */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Product List</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Manage your inventory, pricing, and stock alerts.</p>
        </div>

        {/* Top Right Actions (Import/Export/Add) */}
        <div className="flex items-center gap-3">
          <button className="inline-flex h-9 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">
            <Upload className="mr-2 h-4 w-4" /> Import
          </button>
          <button className="inline-flex h-9 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">
            <Download className="mr-2 h-4 w-4" /> Export
          </button>
          <button
            onClick={handleOpenCreate}
            className="inline-flex h-9 items-center justify-center rounded-md bg-orange-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
          >
            <Plus className="mr-2 h-4 w-4" /> Add Product
          </button>
        </div>
      </div>

      {/* Main Content Area (Filters + Table) */}
      <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">

        {/* Table Toolbar */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          {/* Search Bar */}
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by SKU or Name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800/50 dark:focus:border-indigo-400 dark:focus:bg-slate-800 dark:text-white"
            />
          </div>

          {/* Filter Dropdowns (Visual representation for now) */}
          <div className="flex items-center gap-3">
            <select 
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-10 min-w-[140px] cursor-pointer appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-8 text-sm text-slate-600 outline-none transition-all hover:bg-slate-50 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: `right 0.5rem center`, backgroundRepeat: `no-repeat`, backgroundSize: `1.5em 1.5em` }}
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <select 
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="h-10 min-w-[140px] cursor-pointer appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-8 text-sm text-slate-600 outline-none transition-all hover:bg-slate-50 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: `right 0.5rem center`, backgroundRepeat: `no-repeat`, backgroundSize: `1.5em 1.5em` }}
            >
              <option value="">All Brands</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* The Isolated Table Component */}
        {isLoading ? (
          <div className="flex h-48 flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            <span className="text-sm font-medium text-slate-500">Loading inventory...</span>
          </div>
        ) : isError ? (
          <div className="flex h-48 flex-col items-center justify-center gap-3">
            <span className="text-sm font-medium text-red-500">Failed to load data. Please try again.</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-3">
            <span className="text-sm font-medium text-slate-500">
              {items.length === 0 ? "No items found. Add your first product!" : "No items match your search/filter criteria."}
            </span>
          </div>
        ) : (
          <ItemsTable
            data={filteredItems}
            onEdit={handleOpenUpdate}
            onDelete={handleOpenDelete}
          />
        )}

      </div>

      {/* RENDER THE ACTION MODAL */}
      <ActionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalType === "create" ? "Add New Product" : modalType === "update" ? "Edit Product" : ""}
      >
        {modalType === "delete" ? (
          <DeleteConfirmForm
            itemName={selectedItem?.name || "this product"}
            itemType="Item"
            isDeleting={isDeleting}
            onCancel={() => setIsModalOpen(false)}
            onConfirm={handleDeleteSubmit}
          />
        ) : (
          <ItemForm
            type={modalType}
            tenantId={tenantId}
            defaultValues={modalType === "update" && selectedItem ? selectedItem : undefined}
            onCancel={() => setIsModalOpen(false)}
            onSubmit={modalType === "create" ? handleCreateSubmit : handleUpdateSubmit}
          />
        )}
      </ActionModal>
    </div>
  )
}
