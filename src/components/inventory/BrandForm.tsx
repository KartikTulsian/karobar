"use client";

import { BrandFormData, brandSchema } from '@/lib/validations/categoryBrandSchema';
import { zodResolver } from '@hookform/resolvers/zod';
import { Save } from 'lucide-react';
import { Resolver, useForm } from 'react-hook-form';
import InputField from '../common/InputField';

interface BrandFormProps {
    type: "create" | "update";
    defaultValues?: Partial<BrandFormData>;
    onCancel: () => void;
    onSubmit: (data: BrandFormData) => void;
}

export default function BrandForm({ type, defaultValues, onCancel, onSubmit }: BrandFormProps) {

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<BrandFormData>({
        resolver: zodResolver(brandSchema) as Resolver<BrandFormData>,
        defaultValues: {
            name: "",
            logo_url: "",
            ...defaultValues,
        }
    });

    // useEffect(() => {
    //     if (defaultValues) {
    //         reset(defaultValues as BrandFormData);
    //     }
    // }, [defaultValues, reset]);

    return (
        <form 
            onSubmit={handleSubmit(onSubmit)} 
            onKeyDown={(e) => {
                // Prevent form submission on Enter, unless typing in a textarea (like notes)
                if (e.key === 'Enter' && e.target instanceof HTMLElement && e.target.tagName !== 'TEXTAREA') {
                    e.preventDefault();
                }
            }}
            className="flex flex-col gap-6"
        >
            <div className="flex flex-col gap-4">
                <InputField
                    label="Brand Name *"
                    name="name"
                    register={register}
                    error={errors.name}
                    inputProps={{ placeholder: "e.g., Castrol, Bosch..." }}
                />

                <InputField
                    label="Logo URL (Optional)"
                    name="logo_url"
                    register={register}
                    error={errors.logo_url}
                    inputProps={{ placeholder: "https://example.com/logo.png" }}
                />
            </div>

            <div className="mt-2 flex items-center justify-end gap-3 border-t border-slate-200 pt-5 dark:border-slate-800">
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={isSubmitting}
                    className="rounded-md border border-slate-300 bg-white px-5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 rounded-md bg-orange-500 px-5 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-70"
                >
                    <Save className="h-4 w-4" />
                    {isSubmitting ? "Saving..." : type === "create" ? "Add Brand" : "Save Changes"}
                </button>
            </div>
        </form>
    )
}
