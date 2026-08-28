import { CustomerProfileData } from '@/types/people'
import { ChevronLeft, ChevronRight } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react'
import ExpandedBillModal from './ExpandedBillModal';
import CustomerMiniReceipt from './CustomerMiniReceipt';
import { PaymentBatchSummary } from '@/types/finance';

interface BillCarouselProps {
    customer: CustomerProfileData;
    activeBillId: string | null;
    onBillChange: (billId: string) => void;
    payments: PaymentBatchSummary[];
    showProfit?: boolean;
}

export default function BillCarousel({ customer, activeBillId, onBillChange, payments, showProfit = false }: BillCarouselProps) {

    const { bills } = customer;
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // 1. SYNC STATE: If the parent (Table) changes the active ID, update our Carousel index
    useEffect(() => {
        if (activeBillId) {
            const index = bills.findIndex(b => b.id === activeBillId);
            if (index !== -1) {
                // eslint-disable-next-line react-hooks/set-state-in-effect
                setCurrentIndex(index);
            }
        }
    }, [activeBillId, bills]);

    // 2. CAROUSEL CONTROLS
    const handleNext = useCallback((e?: React.MouseEvent) => {
        if (e) e.stopPropagation();// Prevent modal from closing when clicking modal arrows
        const nextIndex = (currentIndex + 1) % bills.length;
        setCurrentIndex(nextIndex);
        onBillChange(bills[nextIndex].id); //update the table highlight
    }, [currentIndex, bills, onBillChange]);

    const handlePrev = useCallback((e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        const prevIndex = (currentIndex - 1 + bills.length) % bills.length;
        setCurrentIndex(prevIndex);
        onBillChange(bills[prevIndex].id); // Update the table highlight
    }, [currentIndex, bills, onBillChange]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {

            const activeElement = document.activeElement?.tagName;
            if (activeElement === 'INPUT' || activeElement === 'TEXTAREA' || activeElement === 'SELECT') {
                return; 
            }
            
            if (e.key === 'ArrowRight') handleNext();
            if (e.key === 'ArrowLeft') handlePrev();
            if (e.key === 'Escape') setIsModalOpen(false);
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleNext, handlePrev]);

    if (!bills || bills.length === 0) return null;

    const currentBill = bills[currentIndex];

    // Helper for Status Colors
    const getStatusColor = (status: string) => {
        if (status === 'paid') return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10';
        if (status === 'overdue') return 'text-red-600 bg-red-50 dark:bg-red-500/10';
        if (status === 'partial') return 'text-amber-600 bg-amber-50 dark:bg-amber-500/10';
        return 'text-blue-600 bg-blue-50 dark:bg-blue-500/10';
    };

    return (
        <div className="relative w-full flex flex-col items-center pt-4">

            {/* --- THE MINIATURE RECEIPT CARD --- */}
            <div className="w-full bg-slate-100/50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 py-10 flex flex-col items-center justify-center">

                <div className="flex items-center justify-center gap-4 sm:gap-12 w-full px-4">

                    {/* Left Arrow */}
                    <button
                        onClick={handlePrev}
                        className="p-3 sm:p-4 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:shadow-md transition-all active:scale-95 z-10"
                    >
                        <ChevronLeft className="h-6 w-6" />
                    </button>

                    {/* The Scaled-Up Card */}
                    
                    <CustomerMiniReceipt 
                        bill={currentBill} 
                        onClick={() => setIsModalOpen(true)} 
                    />

                    {/* Right Arrow */}
                    <button
                        onClick={handleNext}
                        className="p-3 sm:p-4 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:shadow-md transition-all active:scale-95 z-10"
                    >
                        <ChevronRight className="h-6 w-6" />
                    </button>
                </div>

                <div className="mt-8 text-sm font-semibold tracking-widest uppercase text-slate-400">
                    Viewing {currentIndex + 1} of {bills.length} Bills
                </div>
            </div>

            {/* --- THE FLOATING MODAL (EXPANDED BILL) --- */}
            {isModalOpen && (
                <ExpandedBillModal 
                    bill={currentBill}
                    customer={customer}
                    onClose={() => setIsModalOpen(false)}
                    onNext={handleNext}
                    onPrev={handlePrev}
                    payments={payments}
                    showProfit={showProfit}
                />
            )}
        </div>
    );
}
