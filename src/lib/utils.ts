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

export function getUtcStartOfDateIso(dateString: string | undefined | null): string | null {
    const cleanDate = dateString?.trim().split('T')[0];
    if (!cleanDate) return null;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
        throw new Error(`Invalid date value: ${dateString}`);
    }

    const utcDate = new Date(`${cleanDate}T00:00:00.000Z`);
    if (Number.isNaN(utcDate.getTime()) || utcDate.toISOString().slice(0, 10) !== cleanDate) {
        throw new Error(`Invalid date value: ${dateString}`);
    }

    return utcDate.toISOString();
}

export function calculateInventoryUnitCost(
    unitCost: number,
    discountPct: number,
    gstRate: number,
    isGstRegistered: boolean
): number {
    const safeUnitCost = Number(unitCost) || 0;
    const safeDiscountPct = Number(discountPct) || 0;
    const safeGstRate = Number(gstRate) || 0;
    const discountedCost = safeUnitCost * (1 - safeDiscountPct / 100);

    if (isGstRegistered) {
        return Number(discountedCost.toFixed(2));
    }

    return Number((discountedCost * (1 + safeGstRate / 100)).toFixed(2));
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
// ==========================================================================
// QUANTITIES (decimal-safe)
// Stock and bill quantities can be fractions (0.5 m, 2.25 kg). JavaScript adds decimals badly
// (0.1 + 0.2 = 0.30000000000000004), and the database stores exactly 3 decimals.
// So EVERY sum / difference / FIFO step of a quantity goes through these helpers.
// ==========================================================================

export const QTY_DECIMALS = 3;
const FACTOR = 10 ** QTY_DECIMALS;

/** Rounds to 3 decimals (the precision the database keeps). Safe for null / NaN / strings. */
export function roundQty(value: unknown): number {
    const n = Number(value);
    if (!Number.isFinite(n)) return 0;
    // the tiny epsilon makes 1.0005 round up the way people expect, then +0 turns -0 into 0
    const sign = n < 0 ? -1 : 1;
    return sign * Math.round(Math.abs(n) * FACTOR + 1e-9) / FACTOR + 0;
}

/** Sum of quantities, rounded. */
export function sumQty(values: unknown[]): number {
    return roundQty(values.reduce<number>((total, v) => total + (Number(v) || 0), 0));
}

/** a - b, rounded. */
export function subQty(a: unknown, b: unknown): number {
    return roundQty((Number(a) || 0) - (Number(b) || 0));
}

/** True when two quantities are the same at database precision. */
export function sameQty(a: unknown, b: unknown): boolean {
    return roundQty(a) === roundQty(b);
}

/** 0.5 -> "0.5", 2 -> "2", 2.250 -> "2.25", never "2.2999999". */
export function formatQty(value: unknown): string {
    return roundQty(value).toLocaleString("en-IN", { maximumFractionDigits: QTY_DECIMALS });
}

// ---- Units --------------------------------------------------------------

export const UNITS = ["Pcs", "Set", "Kg", "Litre", "Ml", "Mtr", "Foot", "Box", "Pack", "Dozen", "Gm"] as const;
export type Unit = (typeof UNITS)[number];

const UNIT_ALIASES: Record<string, Unit> = {
    ltr: "Litre", l: "Litre", lt: "Litre", liter: "Litre", litres: "Litre", liters: "Litre",
    m: "Mtr", mtr: "Mtr", meter: "Mtr", meters: "Mtr", metre: "Mtr", metres: "Mtr",
    ft: "Foot", feet: "Foot", foot: "Foot", fts: "Foot",
    pc: "Pcs", pcs: "Pcs", piece: "Pcs", pieces: "Pcs", nos: "Pcs", no: "Pcs",
    kg: "Kg", kgs: "Kg", gm: "Gm", gms: "Gm", gram: "Gm", grams: "Gm", g: "Gm",
};

/** Maps whatever is stored or scanned ("ft", "feet", "ltr") to a unit our dropdowns know; falls back to Pcs. */
export function normalizeUnit(raw?: string | null): Unit {
    const cleaned = (raw || "").trim().toLowerCase().replace(/\./g, "");
    if (!cleaned) return "Pcs";
    if (UNIT_ALIASES[cleaned]) return UNIT_ALIASES[cleaned];
    const titled = (cleaned.charAt(0).toUpperCase() + cleaned.slice(1)) as Unit;
    return (UNITS as readonly string[]).includes(titled) ? titled : "Pcs";
}