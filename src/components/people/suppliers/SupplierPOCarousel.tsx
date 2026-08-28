import { SupplierProfileData } from '@/types/people'
import React, { useCallback, useEffect, useState } from 'react'
import SupplierPOCard from './SupplierPOCard';
import ExpandedPOModal from './ExpandedPOModal';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface SupplierPOCarouselProps {
    supplier: SupplierProfileData;
    activeOrderId: string | null;
    onOrderChange: (orderId: string) => void;
}

export default function SupplierPOCarousel({ supplier, activeOrderId, onOrderChange }: SupplierPOCarouselProps) {

    const { purchase_orders } = supplier;

    const [currentIndex, setCurrentIndex] = useState(0);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        if (activeOrderId && purchase_orders) {
            const index = purchase_orders.findIndex(po => po.id === activeOrderId);
            if (index !== -1) {
                // eslint-disable-next-line react-hooks/set-state-in-effect
                setCurrentIndex(index);
            }
        }
    }, [activeOrderId, purchase_orders]);

    const handleNext = useCallback((e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (!purchase_orders) return;
        const nextIndex = (currentIndex + 1) % purchase_orders.length;
        setCurrentIndex(nextIndex);
        onOrderChange(purchase_orders[nextIndex].id);
    }, [currentIndex, purchase_orders, onOrderChange]);

    const handlePrev = useCallback((e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (!purchase_orders) return;
        const prevIndex = (currentIndex - 1 + purchase_orders.length) % purchase_orders.length;
        setCurrentIndex(prevIndex);
        onOrderChange(purchase_orders[prevIndex].id);
    }, [currentIndex, purchase_orders, onOrderChange]);

    // Global Keyboard Navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const activeTag = document.activeElement?.tagName;
            if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT') {
                return;
            }
            
            if (e.key === 'ArrowRight') handleNext();
            if (e.key === 'ArrowLeft') handlePrev();
            if (e.key === 'Escape') setIsModalOpen(false);
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleNext, handlePrev]);

    if (!purchase_orders || purchase_orders.length === 0) return null;

    const currentOrder = purchase_orders[currentIndex];

    return (
        <div className="relative w-full flex flex-col items-center">

            <div className="w-full bg-slate-100/50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 py-10 flex flex-col items-center justify-center">
                <div className="flex items-center justify-center gap-4 sm:gap-12 w-full px-4">
                    <button
                        onClick={handlePrev}
                        className="p-3 sm:p-4 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:shadow-md transition-all active:scale-95 z-10"
                    >
                        <ChevronLeft className="h-6 w-6" />
                    </button>

                    <SupplierPOCard
                        order={currentOrder}
                        onClick={() => setIsModalOpen(true)}
                    />

                    <button
                        onClick={handleNext}
                        className="p-3 sm:p-4 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:shadow-md transition-all active:scale-95 z-10"
                    >
                        <ChevronRight className="h-6 w-6" />
                    </button>
                </div>

                <div className="mt-8 text-sm font-semibold tracking-widest uppercase text-slate-400">
                    Viewing {currentIndex + 1} of {purchase_orders.length} Orders
                </div>
            </div>

            {isModalOpen && (
                <ExpandedPOModal
                    order={currentOrder}
                    supplier={supplier}
                    onClose={() => setIsModalOpen(false)}
                    onNext={handleNext}
                    onPrev={handlePrev}
                />
            )}
        </div>
    );
}
