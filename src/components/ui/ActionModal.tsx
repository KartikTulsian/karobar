"use client";

import { X } from 'lucide-react';
import React, { useEffect } from 'react'

interface ActionModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

export default function ActionModal({ isOpen, onClose, title, children }: ActionModalProps) {

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }

        return () => {
            document.body.style.overflow = "unset";
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div 
            onMouseDown={onClose}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
        >
            <div 
                onMouseDown={(e) => e.stopPropagation()}
                className="relative flex w-full max-w-4xl max-h-[90vh] flex-col rounded-xl bg-slate-50 shadow-2xl dark:bg-slate-900 animate-in zoom-in-95 duration-200"
            >

                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 rounded-t-xl dark:border-slate-800 dark:bg-slate-900">
                    <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
                        {title}
                    </h2>
                    <button
                        onClick={onClose}
                        className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Scrollable Content Area */}
                <div className="flex-1 overflow-y-auto p-6">
                    {children}
                </div>
            </div>
        </div>
    );
}
