import React from 'react'
import { FieldError, FieldValues, Path, UseFormRegister } from 'react-hook-form';

type InputFieldProps<T extends FieldValues> = {
    label: string;
    type?: string;
    register: UseFormRegister<T>;
    name: Path<T>;
    defaultValue?: string | number;
    error?: FieldError;
    inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
    valueAsNumber?: boolean;
}

export default function InputField<T extends FieldValues>({
    label,
    type = "text",
    register,
    name,
    defaultValue,
    error,
    inputProps,
    valueAsNumber
}: InputFieldProps<T>) {
    return (
        <div className="flex flex-col gap-1 w-full">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {label}
            </label>
            <input
                type={type}
                step={type === "number" ? "0.01" : undefined}
                className={`w-full rounded-md border bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 dark:bg-slate-800 dark:text-white ${error
                        ? "border-red-500 focus:ring-red-500/20"
                        : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-500/20 dark:border-slate-700"
                    }`}
                {...register(name, { valueAsNumber })}
                defaultValue={defaultValue}
                {...inputProps}
            />
            {error?.message && (
                <p className="mt-1 text-xs text-red-500">{error.message}</p>
            )}
        </div>
    );
}
