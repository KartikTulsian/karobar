"use client";

import { useBrands, useCategories } from '@/hooks/useInventory';
import { ItemFormData, itemSchema } from '@/lib/validations/itemSchema';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useState } from 'react'
import { Path, Resolver, useForm } from 'react-hook-form';
import InputField from '../common/InputField';
import DeferredImageUploader from '../common/DeferredImageUploader';

interface ItemFormProps {
    type: "create" | "update";
    defaultValues?: Partial<ItemFormData>;
    tenantId: string;
    isModal?: boolean;
    onCancel: () => void;
    onSubmit: (data: ItemFormData) => void;
}

export default function ItemForm({ type, defaultValues, tenantId, isModal, onCancel, onSubmit, }: ItemFormProps) {

    const { data: categories = [], isLoading: loadingCategories } = useCategories(tenantId);
    const { data: brands = [], isLoading: loadingBrands } = useBrands(tenantId);

    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors, isSubmitting },
    } = useForm<ItemFormData>({
        resolver: zodResolver(itemSchema) as Resolver<ItemFormData>,
        defaultValues: {
            unit: "Pcs",
            stock_qty: 0,
            low_stock_threshold: 5,
            is_active: true,
            images: [],
            ...defaultValues, // Overrides defaults with passed data if updating
            category_id: defaultValues?.category_id || "",
            brand_id: defaultValues?.brand_id || "",
            default_sell_price: defaultValues?.default_sell_price || 0,
            buy_price: defaultValues?.buy_price || 0,
        }
    });

    const buyPriceReg = register("buy_price", { valueAsNumber: true });
    const sellPriceReg = register("default_sell_price", { valueAsNumber: true });
    const stockQtyReg = register("stock_qty", { valueAsNumber: true });
    const lowStockReg = register("low_stock_threshold", { valueAsNumber: true });

    // Mock state for images until Cloudinary/Supabase Storage is wired up
    const [images, setImages] = useState<(File | string)[]>(defaultValues?.images || []);
    const [isUploadingFiles, setIsUploadingFiles] = useState(false);

    const preventScrollChange = (e: React.WheelEvent<HTMLInputElement>) => {
        e.currentTarget.blur();
    };

    const handleFocusClear = (e: React.FocusEvent<HTMLInputElement>, fallback: string = '0') => {
        if (e.target.value === fallback) e.target.value = '';
    };

    const handleBlurRestore = (
        e: React.FocusEvent<HTMLInputElement>,
        fieldName: Path<ItemFormData>,
        fallback: number = 0,
        rhfBlur: (event: React.FocusEvent<HTMLInputElement>) => void
    ) => {
        if (e.target.value === '') {
            e.target.value = String(fallback);
            setValue(fieldName, fallback, { shouldValidate: true });
        }
        rhfBlur(e);
    };

    const handleFormSubmit = async (data: ItemFormData) => {
        setIsUploadingFiles(true);

        try {
            // A. Pre-generate the Item ID so Cloudflare R2 puts it in the exact right folder
            const finalItemId = type === "create" ? crypto.randomUUID() : defaultValues!.id!;
            const finalUrls: string[] = [];

            // B. Loop through selected images
            for (const img of images) {
                if (typeof img === "string") {
                    // It's an existing image already in Cloudflare, keep it
                    finalUrls.push(img);
                } else if (img instanceof File) {
                    // It's a newly selected File. Upload it now!
                    const presignRes = await fetch("/api/upload/presign", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            filename: img.name,
                            contentType: img.type,
                            category: "product_image",
                            tenantId: tenantId,
                            entityId: finalItemId // Maps perfectly to the folder!
                        })
                    });

                    if (!presignRes.ok) throw new Error("Failed to get upload authorization");
                    const { uploadUrl, publicUrl } = await presignRes.json();

                    // Direct PUT to Cloudflare R2
                    const uploadRes = await fetch(uploadUrl, {
                        method: "PUT",
                        headers: { "Content-Type": img.type },
                        body: img,
                    });

                    if (!uploadRes.ok) throw new Error("Failed to upload image");

                    finalUrls.push(publicUrl);
                }
            }

            // C. Inject the uploaded URLs and the generated ID into the payload
            const finalData = {
                ...data,
                id: finalItemId, // Pass the generated ID to Supabase so it doesn't create a new one!
                images: finalUrls,
                category_id: data.category_id || null,
                brand_id: data.brand_id || null,
                barcode: data.barcode || null,
                hsn_code: data.hsn_code || null,
                description: data.description || null,
            };

            await onSubmit(finalData);

        } catch (error) {
            console.error("Upload Error:", error);
            alert("Failed to upload images. Please try again.");
        } finally {
            setIsUploadingFiles(false);
        }
    };

    // Do not draw the form until the dropdown options actually exist!
    if (loadingCategories || loadingBrands) {
        return (
            <div className="flex min-h-[400px] flex-col items-center justify-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                <span className="text-sm font-medium text-slate-500">Loading form data...</span>
            </div>
        );
    }

    const containerClass = isModal
        ? "flex flex-col gap-6"
        : "flex flex-col gap-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900";

    return (
        <form
            onSubmit={handleSubmit(handleFormSubmit)}
            onKeyDown={(e) => {
                // Prevent form submission on Enter, unless typing in a textarea (like notes)
                if (e.key === 'Enter' && e.target instanceof HTMLElement && e.target.tagName !== 'TEXTAREA') {
                    e.preventDefault();
                }
            }}
            className="flex flex-col gap-6"
        >

            {/* SECTION 1: PRODUCT INFORMATION */}
            <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-3 dark:border-slate-800 dark:bg-slate-800/50">
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Product Information</h3>
                </div>
                <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 lg:grid-cols-3">

                    <InputField
                        label="Product Name *"
                        name="name"
                        register={register}
                        error={errors.name}
                        inputProps={{ placeholder: "e.g. Engine Oil 5W-30" }}
                    />

                    <InputField
                        label="SKU"
                        name="sku"
                        register={register}
                        error={errors.sku}
                        inputProps={{ placeholder: "e.g. OIL-5W30" }}
                    />

                    <div className="flex flex-col gap-1 w-full">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Category</label>
                        <select
                            {...register("category_id")}
                            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        >
                            <option value="">Select Category</option>
                            {categories.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-col gap-1 w-full">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Brand</label>
                        <select
                            {...register("brand_id")}
                            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        >
                            <option value="">Select Brand</option>
                            {brands.map((b) => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-col gap-1 w-full">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Unit</label>
                        <select
                            {...register("unit")}
                            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        >
                            <option value="Pcs">Pcs</option>
                            <option value="Set">Set</option>
                            <option value="Kg">Kg</option>
                            <option value="Litre">Litre</option>
                            <option value="Ml">Ml</option>
                            <option value="Mtr">Mtr</option>
                            <option value="Box">Box</option>
                            <option value="Pack">Pack</option>
                            <option value="Dozen">Dozen</option>
                            <option value="Gm">Gm</option>
                        </select>
                    </div>

                    <InputField
                        label="Barcode"
                        name="barcode"
                        register={register}
                        error={errors.barcode}
                        inputProps={{ placeholder: "Scan or enter barcode" }}
                    />

                    <InputField
                        label="HSN Code"
                        name="hsn_code"
                        register={register}
                        error={errors.hsn_code}
                        inputProps={{ placeholder: "e.g. 8708" }}
                    />
                </div>
            </div>

            {/* SECTION 2: PRICING & INVENTORY */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Pricing Card */}
                <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-3 dark:border-slate-800 dark:bg-slate-800/50">
                        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Pricing & Tax</h3>
                    </div>
                    <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2">
                        {type === "create" && (
                            <div className="flex flex-col gap-1 w-full">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Opening Cost Price (₹)</label>
                                <input
                                    type="number" step="0.01"
                                    placeholder="Optional opening cost"
                                    {...buyPriceReg}
                                    onFocus={(e) => handleFocusClear(e, '0')}
                                    onBlur={(e) => handleBlurRestore(e, "buy_price", 0, buyPriceReg.onBlur)}
                                    onWheel={preventScrollChange}
                                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                />
                                {errors.buy_price && <span className="text-xs text-red-500">{errors.buy_price.message}</span>}
                            </div>
                        )}

                        <div className="flex flex-col gap-1 w-full">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Default Sell Price (₹) *</label>
                            <input
                                type="number" step="0.01"
                                {...sellPriceReg}
                                onFocus={(e) => handleFocusClear(e, '0')}
                                onBlur={(e) => handleBlurRestore(e, "default_sell_price", 0, sellPriceReg.onBlur)}
                                onWheel={preventScrollChange}
                                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                            />
                            {errors.default_sell_price && <span className="text-xs text-red-500">{errors.default_sell_price.message}</span>}
                        </div>

                        <div className="flex flex-col gap-1 w-full sm:col-span-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">GST Rate (%)</label>
                            <select
                                {...register("gst_rate", { valueAsNumber: true })}
                                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                            >
                                <option value="0">0% (Exempt)</option>
                                <option value="5">5%</option>
                                <option value="12">12%</option>
                                <option value="18">18%</option>
                                <option value="28">28%</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Stock Card */}
                <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-3 dark:border-slate-800 dark:bg-slate-800/50">
                        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Stock Management</h3>
                    </div>
                    <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2">
                        {type === "create" ? (
                            <div className="flex flex-col gap-1 w-full">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Opening Stock Qty</label>
                                <input
                                    type="number" step="0.001"
                                    {...stockQtyReg}
                                    onFocus={(e) => handleFocusClear(e, '0')}
                                    onBlur={(e) => handleBlurRestore(e, "stock_qty", 0, stockQtyReg.onBlur)}
                                    onWheel={preventScrollChange}
                                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                />
                                {errors.stock_qty && <span className="text-xs text-red-500">{errors.stock_qty.message}</span>}
                            </div>
                        ) : (
                            <div className="flex flex-col gap-1 w-full">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Current Total Stock</label>
                                <input
                                    type="number"
                                    value={defaultValues?.stock_qty || 0}
                                    disabled
                                    className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 cursor-not-allowed dark:border-slate-800 dark:bg-slate-900/50"
                                />
                                <span className="text-[10px] text-slate-400">Stock can only be modified via Purchases or Adjustments.</span>
                            </div>
                        )}
                        <div className="flex flex-col gap-1 w-full">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Low Stock Alert At</label>
                            <input
                                type="number" step="1"
                                {...lowStockReg}
                                onFocus={(e) => handleFocusClear(e, '5')} // Clears 5 on focus
                                onBlur={(e) => handleBlurRestore(e, "low_stock_threshold", 5, lowStockReg.onBlur)} // Restores 5 if left empty
                                onWheel={preventScrollChange}
                                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                            />
                            {errors.low_stock_threshold && <span className="text-xs text-red-500">{errors.low_stock_threshold.message}</span>}
                        </div>
                        <div className="flex items-center gap-2 sm:col-span-2 mt-2">
                            <input
                                type="checkbox"
                                {...register("is_active")}
                                id="isActive"
                                className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
                            />
                            <label htmlFor="isActive" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                Active Product (Available for billing)
                            </label>
                        </div>
                    </div>
                </div>

            </div>

            {/* SECTION 3: MEDIA & DESCRIPTION */}
            <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-3 dark:border-slate-800 dark:bg-slate-800/50">
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Details & Images</h3>
                </div>
                <div className="flex flex-col gap-5 p-5">

                    {/* Mocked Image Uploader matching screenshot style */}
                    <div className="flex flex-col gap-1.5 w-full">
                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Product Images</label>
                        {/* <ImageUploader
                            value={images}
                            onChange={setImages}
                            maxImages={4}
                            category="product_image"
                            tenantId={tenantId}
                            entityId={defaultValues?.id}
                        /> */}
                        <DeferredImageUploader
                            value={images}
                            onChange={setImages}
                            maxImages={4}
                        />
                    </div>

                    <div className="flex flex-col gap-1 w-full">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Description</label>
                        <textarea
                            {...register("description")}
                            rows={3}
                            placeholder="Enter product details..."
                            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        />
                    </div>
                </div>
            </div>

            {/* FOOTER ACTIONS */}
            <div className="mt-4 flex items-center justify-end gap-3 border-t border-slate-200 pt-5 dark:border-slate-800">
                <button
                    type="button"
                    onClick={onCancel}
                    className="rounded-md border border-slate-300 bg-white px-5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={isSubmitting || isUploadingFiles}
                    className="rounded-md bg-orange-500 px-6 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-orange-600 disabled:opacity-70"
                >
                    {isUploadingFiles ? "Uploading Media..." : isSubmitting ? "Saving..." : type === "create" ? "Add Product" : "Update Product"}
                </button>
            </div>
        </form>
    )
}
