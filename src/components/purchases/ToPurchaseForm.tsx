"use client";

import { useInventory } from '@/hooks/useInventory';
import { useSuppliers } from '@/hooks/usePeople';
import { ToPurchaseFormData, toPurchaseSchema } from '@/lib/validations/toPurchaseSchema';
import { InventoryItem } from '@/types/inventory';
import { zodResolver } from '@hookform/resolvers/zod';
import { FileText, Loader2, PackageSearch, Plus, Save } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Resolver, useForm } from 'react-hook-form';

interface ToPurchaseFormProps {
    tenantId: string;
    type?: "create" | "update";
    defaultValues?: Partial<ToPurchaseFormData> | null;
    onSubmit: (data: ToPurchaseFormData) => Promise<void>;
    onCancel?: () => void;
}

export default function ToPurchaseForm({ tenantId, type = "create", defaultValues, onSubmit, onCancel }: ToPurchaseFormProps) {

    //Fetch real suppliers for the dropdown
    const { data: suppliers = [], isLoading: loadingSuppliers } = useSuppliers(tenantId);
    const { data: inventoryItems = [] } = useInventory(tenantId);

    //Get the mutation function
    // const { mutateAsync: addItem } = useAddToPurchaseList(tenantId);

    //Local form state
    const {
        register,
        handleSubmit,
        watch,
        setValue,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<ToPurchaseFormData>({
        resolver: zodResolver(toPurchaseSchema) as Resolver<ToPurchaseFormData>,
        defaultValues: {
            id: defaultValues?.id,
            item_id: defaultValues?.item_id || null,
            item_name: defaultValues?.item_name || '',
            qty_needed: defaultValues?.qty_needed || 1,
            supplier_id: defaultValues?.supplier_id || "",
            notes: defaultValues?.notes || ''
        }
    });

    const [showDropdown, setShowDropdown] = useState(false);
    const watchItemName = watch("item_name");

    const searchResults = useMemo((): InventoryItem[] => {
        if (!watchItemName || typeof watchItemName !== 'string' || !showDropdown) return [];
        const query = watchItemName.toLowerCase();
        
        return inventoryItems.filter(item => 
            item.name.toLowerCase().includes(query)
        ).slice(0, 5);
    }, [watchItemName, inventoryItems, showDropdown]);

    // Handle selecting an item from the dropdown
    const handleSelectItem = (item: InventoryItem) => {
        setValue('item_name', item.name, { shouldValidate: true });
        setValue('item_id', item.id);
        setShowDropdown(false);
    };

    const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setValue('item_name', e.target.value, { shouldValidate: true });
        setValue('item_id', null); 
        setShowDropdown(true);
    };

    const onSubmitForm = async (data: ToPurchaseFormData) => {
        // try {
        //     await addItem(data);
        //     toast.success("Added to purchase list");
            
        //     // Instantly reset the form for rapid data entry
        //     reset({ item_id: null, item_name: '', qty_needed: 1, supplier_id: "", notes: '' });
        // } catch (error) {
        //     toast.error(error instanceof Error ? error.message : "Failed to add item");
        // }

        await onSubmit(data);
        if (type === "create") {
            reset({ item_id: null, item_name: '', qty_needed: 1, supplier_id: "", notes: '' });
        }
    };

    return (
        <form 
            onSubmit={handleSubmit(onSubmitForm)} 
            onKeyDown={(e) => {
                // Prevent form submission on Enter, unless typing in a textarea (like notes)
                if (e.key === 'Enter' && e.target instanceof HTMLElement && e.target.tagName !== 'TEXTAREA') {
                    e.preventDefault();
                }
            }}
            className={type === "create" ? "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm mb-6" : "flex flex-col gap-4"}
        >
            {type === "create" && (
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                    <Plus className="h-4 w-4 text-indigo-500" />
                    Add Item to Purchase List
                </h3>
            )}
            
            <div className={`grid grid-cols-1 ${type === "create" ? "md:grid-cols-12" : ""} gap-4 items-start`}>
                
                <div className={`${type === "create" ? "md:col-span-4" : ""} relative`}>
                    <label className="text-xs font-medium text-slate-500 mb-1 block">Item Name *</label>
                    <div className="relative">
                        <PackageSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input 
                            type="text" 
                            {...register("item_name")}
                            onChange={handleTextChange}
                            onFocus={() => setShowDropdown(true)}
                            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                            placeholder="Type to search or add custom..." 
                            className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" 
                        />
                    </div>
                    {errors.item_name && <p className="text-xs text-red-500 mt-1">{errors.item_name.message}</p>}
                    
                    {/* Dropdown UI remains exactly the same as previously generated */}
                    {showDropdown && searchResults.length > 0 && (
                        <ul className="absolute z-50 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
                            {searchResults.map((item) => (
                                <li 
                                    key={item.id} 
                                    onMouseDown={(e) => { e.preventDefault(); handleSelectItem(item); }}
                                    className="cursor-pointer px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-b border-slate-100 dark:border-slate-700/50 last:border-0"
                                >
                                    <div className="font-medium">{item.name}</div>
                                    <div className="text-xs text-slate-400">Stock: {item.total_stock_qty} {item.unit}</div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className={type === "create" ? "md:col-span-2" : ""}>
                    <label className="text-xs font-medium text-slate-500 mb-1 block">Qty Needed *</label>
                    <input 
                        type="number" 
                        step="0.01"
                        {...register("qty_needed", { valueAsNumber: true })}
                        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" 
                    />
                    {errors.qty_needed && <p className="text-xs text-red-500 mt-1">{errors.qty_needed.message}</p>}
                </div>

                <div className={type === "create" ? "md:col-span-3" : ""}>
                    <label className="text-xs font-medium text-slate-500 mb-1 block">Preferred Supplier</label>
                    <select 
                        {...register("supplier_id")}
                        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                        <option value="">-- Unassigned / Decide Later --</option>
                        {suppliers.map(sup => (
                            <option key={sup.id} value={sup.id}>{sup.name}</option>
                        ))}
                    </select>
                </div>

                <div className={type === "create" ? "md:col-span-3" : ""}>
                     <label className="text-xs font-medium text-slate-500 mb-1 block">Notes</label>
                     <div className="relative">
                        <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input 
                            type="text" 
                            {...register("notes")}
                            placeholder="Optional notes..." 
                            className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" 
                        />
                     </div>
                </div>

            </div>

            <div className={`mt-4 flex justify-end gap-2 ${type === "update" ? "border-t border-slate-200 dark:border-slate-700 pt-4" : ""}`}>
                {type === "update" && onCancel && (
                    <button 
                        type="button" 
                        onClick={onCancel}
                        className="h-10 px-4 text-sm font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                        Cancel
                    </button>
                )}
                <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="h-10 px-6 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2 shadow-sm transition-colors disabled:opacity-50"
                >
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (type === "create" ? <Plus className="h-4 w-4" /> : <Save className="h-4 w-4" />)} 
                    {type === "create" ? "Add to List" : "Save Changes"}
                </button>
            </div>
        </form>
    );
}
