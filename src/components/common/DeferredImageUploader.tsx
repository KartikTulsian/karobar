"use client";

import React from 'react';
import { X, UploadCloud } from 'lucide-react';
import Image from 'next/image';

interface DeferredImageUploaderProps {
    value: (File | string)[]; // Accepts both raw Files (new) and string URLs (existing)
    onChange: (items: (File | string)[]) => void;
    maxImages?: number;
}

export default function DeferredImageUploader({ value, onChange, maxImages = 4 }: DeferredImageUploaderProps) {
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const newFiles = Array.from(e.target.files);
        
        if (value.length + newFiles.length > maxImages) {
            alert(`You can only upload up to ${maxImages} images.`);
            return;
        }
        onChange([...value, ...newFiles]);
        e.target.value = ''; // Reset input
    };

    const handleRemove = (indexToRemove: number) => {
        onChange(value.filter((_, index) => index !== indexToRemove));
    };

    // Helper to render previews safely
    const getPreviewUrl = (item: File | string) => {
        if (typeof item === 'string') return item;
        return URL.createObjectURL(item);
    };

    return (
        <div className="flex flex-wrap gap-4">
            {value.map((item, idx) => (
                <div key={idx} className="group relative h-24 w-24 overflow-hidden rounded-lg border border-slate-200 shadow-sm dark:border-slate-700">
                    <Image 
                        src={getPreviewUrl(item)} 
                        alt={`Preview ${idx}`} 
                        fill 
                        className="object-cover" 
                    />
                    <button
                        type="button"
                        onClick={() => handleRemove(idx)}
                        className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white opacity-0 backdrop-blur-md transition-opacity group-hover:opacity-100 hover:bg-red-500"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            ))}

            {value.length < maxImages && (
                <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 transition-colors hover:border-indigo-500 hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:border-indigo-400">
                    <UploadCloud className="h-6 w-6 text-slate-400" />
                    <span className="text-[10px] font-medium text-slate-500">Upload</span>
                    <input 
                        type="file" 
                        accept="image/png, image/jpeg, image/webp" 
                        multiple 
                        className="hidden" 
                        onChange={handleFileChange} 
                    />
                </label>
            )}
        </div>
    );
}