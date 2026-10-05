// lib/inventoryPricing.ts
// Helpers for "latest batch" prices and the min/max price GUIDE.
// The guide is a reminder only: nothing here is used in any bill or stock calculation.
import { InventoryItem, ItemBatch, PriceGuide } from "@/types/inventory";

type PricingItem = Pick<InventoryItem, "default_sell_price" | "min_sell_price" | "max_sell_price" | "batches">;

const num = (v: unknown): number | null => {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
};

const asGuide = (min: unknown, max: unknown): PriceGuide | null => {
    const g = { min: num(min), max: num(max) };
    return g.min === null && g.max === null ? null : g;
};

/** The most recently received batch THAT STILL HAS STOCK (sold-out batches are ignored). */
export function getLatestBatch(batches?: ItemBatch[] | null): ItemBatch | null {
    const inStock = (batches ?? []).filter((b) => Number(b.stock_qty) > 0);
    if (inStock.length === 0) return null;
    return inStock.reduce((latest, b) =>
        new Date(b.created_at).getTime() > new Date(latest.created_at).getTime() ? b : latest
    );
}

/**
 * Cost, sell price and guide according to the latest batch with stock.
 * No batch with stock -> sell price = item default price, no cost, guide = item's own guide.
 */
export function getLatestPricing(item: PricingItem) {
    const latest = getLatestBatch(item.batches);
    return {
        hasBatch: latest !== null,
        cost: latest ? Number(latest.buy_price) : null,
        sell: latest ? Number(latest.sell_price) : Number(item.default_sell_price),
        guide:
            asGuide(latest?.min_sell_price, latest?.max_sell_price) ??
            asGuide(item.min_sell_price, item.max_sell_price),
    };
}

/**
 * Guide to show on a bill line (display only, allocation is not touched): the batch(es) allocated to the line
 * (widest range if several), else the batch that would be allocated first (oldest with stock),
 * else the item's own guide.
 */
export function getBillPriceGuide(item: PricingItem, allocatedBatchIds: string[] = []): PriceGuide | null {
    const batches = item.batches ?? [];
    let candidates = batches.filter((b) => allocatedBatchIds.includes(b.id));

    if (candidates.length === 0) {
        const inStock = batches
            .filter((b) => Number(b.stock_qty) > 0)
            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        candidates = inStock.length ? [inStock[0]] : [];
    }

    const mins = candidates.map((b) => num(b.min_sell_price)).filter((v): v is number => v !== null);
    const maxs = candidates.map((b) => num(b.max_sell_price)).filter((v): v is number => v !== null);

    return (
        asGuide(mins.length ? Math.min(...mins) : null, maxs.length ? Math.max(...maxs) : null) ??
        asGuide(item.min_sell_price, item.max_sell_price)
    );
}

/** "₹18 – ₹25", "Min ₹18", "Max ₹25", or "" when there is no guide. */
export function formatGuide(g: PriceGuide | null | undefined): string {
    if (!g) return "";
    const fmt = (n: number) => `₹${Number.isInteger(n) ? n : n.toFixed(2)}`;
    if (g.min !== null && g.max !== null) return `${fmt(g.min)} – ${fmt(g.max)}`;
    if (g.min !== null) return `Min ${fmt(g.min)}`;
    if (g.max !== null) return `Max ${fmt(g.max)}`;
    return "";
}