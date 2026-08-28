"use client";

import { CategoryFormData, categorySchema } from '@/lib/validations/categoryBrandSchema';
import { Category } from '@/types/inventory';
import { zodResolver } from '@hookform/resolvers/zod';
import { Save } from 'lucide-react';
import { useEffect } from 'react'
import { Resolver, useForm } from 'react-hook-form';
import InputField from '../common/InputField';

interface CategoryFormProps {
    type: "create" | "update";
    defaultValues?: Partial<CategoryFormData>;
    existingCategories?: Category[];
    onCancel: () => void;
    onSubmit: (data: CategoryFormData) => void;
}

export default function CategoryForm({
    type,
    defaultValues,
    existingCategories = [],
    onCancel,
    onSubmit
}: CategoryFormProps) {

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<CategoryFormData>({
        resolver: zodResolver(categorySchema) as Resolver<CategoryFormData>,
        defaultValues: {
            name: "",
            slug: "",
            parent_id: "",
            ...defaultValues,
        }
    });

    // useEffect(() => {
    //     if (defaultValues && Object.keys(defaultValues).length > 0) {
    //         reset({ name: "", slug: "", parent_id: "", ...defaultValues });
    //     } else if (type === "create") {
    //         reset({ name: "", slug: "", parent_id: "" });
    //     }
    // }, [defaultValues?.id, type, reset]);

    const watchName = watch("name");

    useEffect(() => {
        const generatedSlug = (watchName || "")
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)+/g, '');

        setValue("slug", generatedSlug, {
            shouldValidate: false,
            shouldDirty: true,
        });
    }, [watchName, setValue]);

    // const handleFormSubmit = (data: CategoryFormData) => {
    //     const finalSlug = data.name
    //         .toLowerCase()
    //         .trim()
    //         .replace(/[^a-z0-9]+/g, '-')
    //         .replace(/(^-|-$)+/g, '');

    //     onSubmit({
    //         ...data,
    //         slug: finalSlug
    //     });
    // };

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
                    label="Category Name *"
                    name="name"
                    register={register}
                    error={errors.name}
                    inputProps={{ placeholder: "e.g., Engine Oils" }}
                />

                <InputField
                    label="URL Slug *"
                    name="slug"
                    register={register}
                    error={errors.slug}
                    inputProps={{
                        placeholder: "e.g., engine-oils",
                        readOnly: true, // Prevents manual editing but still submits data
                        style: { backgroundColor: '#f8fafc', color: '#64748b', cursor: 'not-allowed' }
                    }}
                />

                <div className="flex flex-col gap-1 w-full">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Parent Category (Optional)
                    </label>
                    <select
                        {...register("parent_id")}
                        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                        <option value="">-- None (Top Level Category) --</option>
                        {existingCategories
                            // Prevent a category from being its own parent
                            .filter(cat => cat.id !== defaultValues?.id)
                            .map((cat) => (
                                <option key={cat.id} value={cat.id}>
                                    {cat.name}
                                </option>
                            ))}
                    </select>
                    {errors.parent_id && <p className="mt-1 text-xs text-red-500">{errors.parent_id.message}</p>}
                </div>
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
                    {isSubmitting ? "Saving..." : type === "create" ? "Add Category" : "Save Changes"}
                </button>
            </div>
        </form>
    )
}
