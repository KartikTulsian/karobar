import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getLocalDateString(dateString: string | undefined | null): string {
    if (!dateString) return "";
    const date = new Date(dateString);
    const offset = date.getTimezoneOffset() * 60000; 
    return new Date(date.getTime() - offset).toISOString().split('T')[0];
}

export function isSameLocalDate(dbTimestamp: string, targetDate: string): boolean {
    if (!dbTimestamp || !targetDate) return false;
    return getLocalDateString(dbTimestamp) === targetDate;
}

export function mergeDateWithOriginalTime(newDateStr: string, originalTimestamp: string | undefined | null): string {
    if (!originalTimestamp) return newDateStr; // Fallback if no original time exists
    
    // If the user didn't actually change the date, return the exact original DB string to be safe
    if (getLocalDateString(originalTimestamp) === newDateStr) {
        return originalTimestamp;
    }
    
    // If they changed the date, extract the original time portion (e.g., "16:35:00.000Z") and stitch it
    const originalTime = new Date(originalTimestamp).toISOString().split('T')[1];
    return `${newDateStr}T${originalTime}`;
}