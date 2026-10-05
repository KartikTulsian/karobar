// lib/keyboardNav.ts
// Keyboard helpers shared by BillForm and PurchaseOrderForm (suggestion lists, Excel-like line-item grid, Enter = Tab).
// Nothing here touches form data or calculations: it only moves focus / highlights options.
import type React from "react";
import { useEffect, useRef } from "react";

// ---------------------------------------------------------------- suggestion lists (customer / item search)

/** Highlighted option: the stored index if it is a valid, enabled option, otherwise the first enabled one (-1 if none). */
export function resolveHighlight(raw: number, count: number, isDisabled?: (i: number) => boolean): number {
    const ok = (i: number) => i >= 0 && i < count && !isDisabled?.(i);
    if (ok(raw)) return raw;
    for (let i = 0; i < count; i++) if (ok(i)) return i;
    return -1;
}

interface ListKeyOptions {
    open: boolean;                              // is the suggestion list showing?
    count: number;                              // number of options
    raw: number;                                // stored highlight index
    setRaw: (i: number) => void;
    isDisabled?: (i: number) => boolean;        // options that cannot be chosen are skipped
    onSelect: (i: number) => void;
    onClose: () => void;
}

/** Up/Down move the highlight (wrapping), Enter picks it, Esc closes. Returns true when the key was used. */
export function listKeyDown(e: React.KeyboardEvent, o: ListKeyOptions): boolean {
    if (!o.open || e.ctrlKey || e.metaKey || e.altKey || e.nativeEvent.isComposing) return false;

    if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation(); // do not also close a surrounding modal
        o.onClose();
        return true;
    }
    if (o.count === 0) return false;

    const current = resolveHighlight(o.raw, o.count, o.isDisabled);

    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const step = e.key === "ArrowDown" ? 1 : -1;
        let next = current;
        for (let n = 0; n < o.count; n++) {
            next = (next + step + o.count) % o.count;
            if (!o.isDisabled?.(next)) { o.setRaw(next); break; }
        }
        return true;
    }
    if (e.key === "Enter" && current >= 0) {
        e.preventDefault();
        o.onSelect(current);
        return true;
    }
    return false;
}

// ---------------------------------------------------------------- Excel-like line-item grid
// Every grid input carries data-grid-row={rowIndex} and data-grid-col="name".

/** Focus (and select the text of) the cell at row/col. Returns false if it does not exist or is not editable. */
export function focusCell(root: ParentNode | null | undefined, row: number, col: string): boolean {
    const el = root?.querySelector<HTMLInputElement>(`[data-grid-row="${row}"][data-grid-col="${col}"]`);
    if (!el || el.disabled || el.readOnly) return false;
    el.focus();
    el.select?.();
    return document.activeElement === el;
}

interface GridKeyOptions {
    cols: string[];        // every grid column name, left to right (Up/Down work in all of them)
    skipOnEnter?: string[]; // columns Enter walks past (optional boxes such as price guides; Tab still reaches them)
    rowCount: number;
    addRow: () => void;    // called when Enter is pressed in the last cell of the last row
}

/** Put on the grid wrapper: Up/Down = same column in the row above/below, Enter = next cell (then next row, then a new row). */
export function gridKeyDown(e: React.KeyboardEvent<HTMLElement>, o: GridKeyOptions): void {
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || e.nativeEvent.isComposing) return;
    const target = e.target as HTMLElement;
    const col = target.dataset.gridCol;
    const row = Number(target.dataset.gridRow);
    if (!col || Number.isNaN(row)) return;
    const root = e.currentTarget;

    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        if (target.tagName === "SELECT") return; // keep the native "change option" behaviour
        e.preventDefault();                      // also stops number boxes from adding / subtracting 1
        focusCell(root, row + (e.key === "ArrowDown" ? 1 : -1), col);
        return;
    }

    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        const walk = o.cols.filter((name) => !o.skipOnEnter?.includes(name));
        const c = o.cols.indexOf(col);
        for (let j = c + 1; j < o.cols.length; j++) {
            if (o.skipOnEnter?.includes(o.cols[j])) continue;
            if (focusCell(root, row, o.cols[j])) return;                                                  // next cell in this row
        }
        if (row < o.rowCount - 1) {                                                                       // first cell of next row
            for (const first of walk) if (focusCell(root, row + 1, first)) return;
        } else {
            o.addRow();                                                                                   // end of the grid
        }
    }
}

/** After a row is added, focus its cell once React has rendered it. */
export function useGridFocus(rowCount: number) {
    const gridRef = useRef<HTMLDivElement>(null);
    const pending = useRef<{ row: number; col: string } | null>(null);

    useEffect(() => {
        if (pending.current) {
            focusCell(gridRef.current, pending.current.row, pending.current.col);
            pending.current = null;
        }
    }, [rowCount]);

    return { gridRef, focusLater: (row: number, col: string) => { pending.current = { row, col }; } };
}

// ---------------------------------------------------------------- whole form

/** Move focus to the next field in the form (what Tab would do). */
export function focusNextField(from: HTMLElement): void {
    const form = from.closest("form");
    if (!form) return;
    const fields = Array.from(form.querySelectorAll<HTMLElement>("input, select, textarea, button")).filter((el) => {
        const f = el as HTMLInputElement;
        return !f.disabled && f.type !== "hidden" && el.tabIndex >= 0 && el.offsetParent !== null;
    });
    fields[fields.indexOf(from) + 1]?.focus();
}

/**
 * <form onKeyDown>: Ctrl+Enter saves, Enter moves to the next field (never submits by accident).
 * Notes boxes and buttons keep their normal Enter behaviour; keys already used by a list or the grid are left alone.
 */
export function formKeyDown(e: React.KeyboardEvent<HTMLFormElement>): void {
    if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
    const el = e.target as HTMLElement;

    if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        e.currentTarget.requestSubmit();
        return;
    }
    if (e.defaultPrevented || el.tagName === "TEXTAREA" || el.tagName === "BUTTON") return;

    e.preventDefault();
    focusNextField(el);
}