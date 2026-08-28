"use client";

import { UploadAssetCategory } from "@/types/storage";
import { Loader2, UploadCloud, X } from "lucide-react";
import { useRef, useState } from "react";

interface ImageUploaderProps {
    value: string[]; // Array of currently uploaded public URLs
    onChange: (urls: string[]) => void;
    maxImages?: number; // 1 for receipts/avatars, 5 for items, etc.
    category: UploadAssetCategory;
    tenantId?: string;
    entityId?: string; // If creating a new item, you can pass a temporary UUID
}

export default function ImageUploader({
    value = [],
    onChange,
    maxImages = 1,
    category,
    tenantId,
    entityId,
}: ImageUploaderProps) {

    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Fallback ID if the entity doesn't exist yet (e.g., creating a new product)
    const [uploadSessionId] = useState(() => crypto.randomUUID());
    const activeEntityId = entityId || uploadSessionId;

    // Client-side WebP Compression Helper
    const compressToWebP = (file: File): Promise<File> => {
        return new Promise((resolve, reject) => {
            const img = new window.Image();
            img.src = URL.createObjectURL(file);
            img.onload = () => {
                const canvas = document.createElement("canvas");
                // Optional: Scale down massive images here (e.g., max 1920x1920)
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext("2d");
                if (!ctx) return reject("Canvas context failed");

                ctx.drawImage(img, 0, 0);
                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".webp", {
                                type: "image/webp",
                            });
                            resolve(newFile);
                        } else {
                            reject("Compression failed");
                        }
                    },
                    "image/webp",
                    0.8 // 80% quality compression
                );
            };
            img.onerror = (err) => reject(err);
        });
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;

        // Prevent exceeding max images limit
        if (value.length + files.length > maxImages) {
            alert(`You can only upload up to ${maxImages} image(s).`);
            return;
        }

        setIsUploading(true);
        const newUrls: string[] = [...value];

        try {
            for (const file of files) {
                // 1. Compress file locally in the browser
                const compressedFile = await compressToWebP(file);

                // 2. Fetch the Presigned URL from our Next.js API route
                const presignRes = await fetch("/api/upload/presign", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        filename: compressedFile.name,
                        contentType: compressedFile.type,
                        category,
                        tenantId,
                        entityId: activeEntityId,
                    }),
                });

                if (!presignRes.ok) throw new Error("Failed to get upload authorization");
                const { uploadUrl, publicUrl } = await presignRes.json();

                // 3. Execute the Direct-to-R2 HTTP PUT request (bypassing our server)
                const uploadRes = await fetch(uploadUrl, {
                    method: "PUT",
                    body: compressedFile,
                    headers: {
                        "Content-Type": compressedFile.type,
                    },
                });

                if (!uploadRes.ok) throw new Error("Direct Cloudflare upload failed");

                // 4. Save the resulting Public CDN URL
                newUrls.push(publicUrl);
            }

            onChange(newUrls);
        } catch (error) {
            console.error("Upload error:", error);
            alert("Failed to upload image. Please try again.");
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const removeImage = (indexToRemove: number) => {
        onChange(value.filter((_, idx) => idx !== indexToRemove));
    };

    return (
        <div className="flex w-full flex-col gap-3">
            {/* Hidden File Input */}
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/png, image/jpeg, image/webp"
                multiple={maxImages > 1}
                className="hidden"
            />

            <div className="flex flex-wrap gap-4">
                {/* Render Existing Images */}
                {value.map((url, idx) => (
                    <div key={idx} className="group relative h-24 w-24 overflow-hidden rounded-md border border-slate-200 shadow-sm dark:border-slate-700">
                        <img src={url} alt={`Upload ${idx + 1}`} className="h-full w-full object-cover" />
                        <button
                            type="button"
                            onClick={() => removeImage(idx)}
                            className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity hover:bg-red-600 group-hover:opacity-100"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                ))}

                {/* Upload Button */}
                {value.length < maxImages && (
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-slate-300 bg-slate-50 text-slate-500 transition-colors hover:border-indigo-500 hover:bg-indigo-50 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:border-indigo-500 dark:hover:bg-slate-800"
                    >
                        {isUploading ? (
                            <>
                                <Loader2 className="h-6 w-6 animate-spin" />
                                <span className="text-[10px] font-medium">Uploading...</span>
                            </>
                        ) : (
                            <>
                                <UploadCloud className="h-6 w-6" />
                                <span className="text-[10px] font-medium">
                                    {maxImages > 1 ? "Add Image" : "Upload"}
                                </span>
                            </>
                        )}
                    </button>
                )}
            </div>
        </div>
    );
}
