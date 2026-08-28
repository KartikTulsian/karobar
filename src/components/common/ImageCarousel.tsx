"use client";

import { useState } from 'react';
import { ChevronLeft, ChevronRight, ImageIcon } from 'lucide-react';
import Image from 'next/image';

interface ImageCarouselProps {
  images: string[];
  altText?: string;
}

export default function ImageCarousel({ images, altText = "Image" }: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!images || images.length === 0) {
    return (
      <div className="flex aspect-square w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50">
        <ImageIcon className="mb-2 h-10 w-10 text-slate-300 dark:text-slate-600" />
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No images available</p>
      </div>
    );
  }

  const nextImage = () => setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  const prevImage = () => setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));

  return (
    <div className="relative w-full">
      <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg bg-slate-50 dark:bg-slate-800">
        <Image
          src={images[currentIndex]}
          alt={`${altText} ${currentIndex + 1}`}
          fill
          sizes="(max-width: 768px) 100vw, 400px"
          priority={currentIndex === 0}
          className="object-contain"
        />
      </div>

      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={prevImage}
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full border border-slate-200 bg-white/90 p-1.5 text-slate-700 shadow-sm backdrop-blur-sm transition-transform hover:scale-110 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-300"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={nextImage}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full border border-slate-200 bg-white/90 p-1.5 text-slate-700 shadow-sm backdrop-blur-sm transition-transform hover:scale-110 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-300"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}
      <p className="mt-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400">
        Image {currentIndex + 1} of {images.length}
      </p>
    </div>
  );
}