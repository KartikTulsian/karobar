"use client";

import { AlertTriangle } from "lucide-react";

interface DeleteConfirmFormProps {
    itemName: string;
    itemType?: string;
    isDeleting: boolean;
    onCancel: () => void;
    onConfirm: () => void;
}

export default function DeleteConfirmForm({ itemName, itemType = "Item", isDeleting, onCancel, onConfirm }: DeleteConfirmFormProps) {
    return (
        <div className="flex flex-col items-center justify-center p-4 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-500" />
            </div>
            <h3 className="mb-2 text-lg font-bold text-slate-900 dark:text-white">Delete {itemType}</h3>
            <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
                Are you sure you want to delete <strong>{itemName}</strong>? This action cannot be undone and will permanently remove this {itemType.toLowerCase()} from your records.
            </p>
            <div className="flex w-full items-center justify-center gap-3">
                <button
                    onClick={onCancel}
                    disabled={isDeleting}
                    className="rounded-md border border-slate-300 bg-white px-5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                    Cancel
                </button>
                <button
                    onClick={onConfirm}
                    disabled={isDeleting}
                    className="rounded-md bg-red-600 px-5 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:bg-red-400"
                >
                    {isDeleting ? "Deleting..." : `Yes, Delete ${itemType}`}
                </button>
            </div>
        </div>
    );
}