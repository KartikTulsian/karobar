"use client";

import InputField from '@/components/common/InputField';
import { SupplierFormData, supplierSchema } from '@/lib/validations/supplierSchema';
import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, User, Wallet } from 'lucide-react';
import { Resolver, useForm } from 'react-hook-form';

interface SupplierFormProps {
    type: "create" | "update";
    defaultValues?: Partial<SupplierFormData>;
    isModal?: boolean;
    onCancel: () => void;
    onSubmit: (data: SupplierFormData) => void;
}

export default function SupplierForm({ type, defaultValues, isModal = false, onCancel, onSubmit }: SupplierFormProps) {

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting }
    } = useForm<SupplierFormData>({
        resolver: zodResolver(supplierSchema) as Resolver<SupplierFormData>,
        defaultValues: {
            country_code: "+91",
            country: "India",
            ...defaultValues
        }
    })

    const handleFormSubmit = async (data: SupplierFormData) => {
        const finalData = {
            ...data,
            company_name: data.company_name?.trim() || null,
            phone: data.phone?.trim() || null,
            email: data.email?.trim() || null,
            gstin: data.gstin?.trim().toUpperCase() || null, // Force uppercase for the database
            address: data.address?.trim() || null,
            city: data.city?.trim() || null,
            state_code: data.state_code?.trim() || null,
            pincode: data.pincode?.trim() || null,
            country: data.country?.trim() || "India",
            notes: data.notes?.trim() || null,
            reduce_amount: data.reduce_amount || 0,
        } as unknown as SupplierFormData;

        await onSubmit(finalData);
    }

    const containerClass = isModal
        ? "flex flex-col gap-6"
        : "flex flex-col gap-6 rounded-2xl border border-slate-200 bg-slate-50/50 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/50";

    return (
        <form 
            onSubmit={handleSubmit(handleFormSubmit)} 
            onKeyDown={(e) => {
                // Prevent form submission on Enter, unless typing in a textarea (like notes)
                if (e.key === 'Enter' && e.target instanceof HTMLElement && e.target.tagName !== 'TEXTAREA') {
                    e.preventDefault();
                }
            }}
            className={containerClass}
        >

            {/* SECTION 1: BASIC IDENTITY */}
            <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/50 px-5 py-3 dark:border-slate-800 dark:bg-slate-800/50">
                    <User className="h-4 w-4 text-slate-500" />
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Identity Details</h3>
                </div>
                <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2">
                    <InputField
                        label="Supplier Name *"
                        name="name"
                        register={register}
                        error={errors.name}
                        inputProps={{ placeholder: "e.g. Rahul Sharma" }}
                    />

                    <InputField
                        label="Company / Shop Name"
                        name="company_name"
                        register={register}
                        error={errors.company_name}
                        inputProps={{ placeholder: "e.g. Sharma Electronics" }}
                    />
                </div>
            </div>

            {/* SECTION 2: CONTACT & ADDRESS */}
            <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/50 px-5 py-3 dark:border-slate-800 dark:bg-slate-800/50">
                    <Building2 className="h-4 w-4 text-slate-500" />
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Contact & Location</h3>
                </div>
                <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 lg:grid-cols-3">

                    <div className="flex flex-col gap-1 w-full">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Phone Number</label>
                        <div className="flex gap-2">
                            <select
                                {...register("country_code")}
                                className="w-24 rounded-md border border-slate-300 bg-slate-50 px-2 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                            >
                                <option value="+91">+91 (IN)</option>
                                <option value="+1">+1 (US)</option>
                                <option value="+44">+44 (UK)</option>
                                <option value="+61">+61 (AU)</option>
                                <option value="+971">+971 (UAE)</option>
                            </select>
                            <input
                                type="text"
                                {...register("phone")}
                                placeholder="10-digit number"
                                maxLength={10}
                                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                            />
                        </div>
                        {errors.phone && <span className="text-xs text-red-500">{errors.phone.message}</span>}
                    </div>

                    <InputField
                        label="Email Address"
                        name="email"
                        type="email"
                        register={register}
                        error={errors.email}
                        inputProps={{ placeholder: "rahul@example.com" }}
                    />

                    <div className="sm:col-span-2 lg:col-span-3">
                        <InputField
                            label="Street Address"
                            name="address"
                            register={register}
                            error={errors.address}
                            inputProps={{ placeholder: "Shop No. 4, Main Market Road..." }}
                        />
                    </div>

                    <InputField
                        label="City"
                        name="city"
                        register={register}
                        error={errors.city}
                        inputProps={{ placeholder: "e.g. Mumbai" }}
                    />

                    <InputField
                        label="State Code (GST)"
                        name="state_code"
                        register={register}
                        error={errors.state_code}
                        inputProps={{ placeholder: "e.g. 27", maxLength: 2 }}
                    />

                    <InputField
                        label="Pincode"
                        name="pincode"
                        register={register}
                        error={errors.pincode}
                        inputProps={{ placeholder: "e.g. 400001", maxLength: 6 }}
                    />

                    <InputField
                        label="Country"
                        name="country"
                        register={register}
                        error={errors.country}
                        inputProps={{ placeholder: "e.g. India" }}
                    />
                </div>
            </div>

            {/* SECTION 3: FINANCIALS & TAX */}
            <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/50 px-5 py-3 dark:border-slate-800 dark:bg-slate-800/50">
                    <Wallet className="h-4 w-4 text-slate-500" />
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Financials & Notes</h3>
                </div>
                <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2">

                    <InputField
                        label="GSTIN"
                        name="gstin"
                        register={register}
                        error={errors.gstin}
                        inputProps={{ 
                            placeholder: "Enter the gst no.", 
                            onInput: (e) => (e.currentTarget.value = e.currentTarget.value.toUpperCase())
                        }}
                    />

                    <InputField
                        label="Payment Terms"
                        name="payment_terms"
                        register={register}
                        error={errors.payment_terms}
                        inputProps={{ placeholder: "e.g., Net 30 days Payment" }}
                    />

                    {type === "create" ? (
                        <>
                            <InputField
                                label="Opening Due (₹)"
                                name="outstanding_due"
                                type="number"
                                valueAsNumber
                                register={register}
                                error={errors.outstanding_due}
                                inputProps={{ min: 0, placeholder: "0.00" }}
                            />

                            <InputField
                                label="Opening Advance (₹)"
                                name="advance_balance"
                                type="number"
                                valueAsNumber
                                register={register}
                                error={errors.advance_balance}
                                inputProps={{ min: 0, placeholder: "0.00" }}
                            />
                        </>
                    ) : (
                        <div className="flex flex-col gap-1 w-full sm:col-span-2">
                            <InputField
                                label="Reduce Payable Amount (₹)"
                                name="reduce_amount"
                                type="number"
                                valueAsNumber
                                register={register}
                                error={errors.reduce_amount}
                                inputProps={{ min: 0, placeholder: "0.00" }}
                            />
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                Enter an amount to write off or adjust. This will automatically reduce the oldest unpaid purchase orders (including opening balances).
                            </p>
                        </div>
                    )}

                    <div className="flex flex-col gap-1 w-full sm:col-span-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Internal Notes</label>
                        <textarea
                            {...register("notes")}
                            rows={3}
                            placeholder="Important supplier, always pay within 10 days..."
                            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        />
                    </div>
                </div>
            </div>

            {/* FOOTER ACTIONS */}
            <div className={`mt-2 flex items-center justify-end gap-3 pt-2 ${!isModal && "border-t border-slate-200 dark:border-slate-800 pt-5"}`}>
                <button
                    type="button"
                    onClick={onCancel}
                    className="rounded-md border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-70"
                >
                    {isSubmitting ? "Saving..." : type === "create" ? "Save Supplier" : "Update Supplier"}
                </button>
            </div>
        </form>
    )
}
