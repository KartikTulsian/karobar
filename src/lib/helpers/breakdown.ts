import { DatabaseBill, SupplierPOSummary } from "@/types/people";

// ==========================================================================
// Breakdown of a customer's bills / a supplier's POs by vehicle, reference, month, status or payment method.
// Pure functions over rows the page has ALREADY loaded, so it never touches the database.
// ==========================================================================

export type BreakdownDim = "vehicle" | "reference" | "month" | "status" | "payment";

export const BREAKDOWN_DIMS: { value: BreakdownDim; label: string }[] = [
    { value: "vehicle", label: "Vehicle" },
    { value: "reference", label: "Reference" },
    { value: "month", label: "Month" },
    { value: "status", label: "Status" },
    { value: "payment", label: "Payment method" },
];

export interface BreakdownDoc {
    id: string;
    number: string;
    date: string;
    status: string;
    total: number;
    paid: number;
    due: number;
    vehicle: string | null;
    reference: string | null;
    payment: string | null;
    notes: string | null;
    counts: boolean; // false for draft / cancelled: shown, but never adds to totals or due
}

export interface BreakdownGroup {
    key: string;
    label: string;
    count: number;       // documents that count (not draft / cancelled)
    ignored: number;     // draft / cancelled documents in this group
    total: number;
    paid: number;
    due: number;
    ids: string[];       // every document in the group, so clicking it can filter the table
}

const n = (v: unknown) => Number(v) || 0;
const round2 = (v: number) => Math.round(v * 100) / 100;
const NONE = "(none)";

export function billsToDocs(bills: DatabaseBill[]): BreakdownDoc[] {
    return bills.map((b) => ({
        id: b.id,
        number: b.bill_number,
        date: b.bill_date,
        status: b.status,
        total: n(b.grand_total),
        paid: n(b.amount_paid),
        due: n(b.amount_due),
        vehicle: b.vehicle_no,
        reference: b.reference_name,
        payment: b.payment_method,
        notes: b.notes,
        counts: b.status !== "cancelled" && b.status !== "draft",
    }));
}

export function ordersToDocs(orders: SupplierPOSummary[]): BreakdownDoc[] {
    return orders.map((o) => ({
        id: o.id,
        number: o.po_number,
        date: o.order_date,
        status: o.status,
        total: n(o.total_amount),
        paid: n(o.amount_paid),
        due: n(o.amount_due),
        vehicle: o.vehicle_no,
        reference: o.reference_name,
        payment: o.payment_method,
        notes: o.notes,
        counts: o.status !== "cancelled" && o.status !== "draft",
    }));
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const titleCase = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/** key = what makes two documents "the same group"; label = what we show. */
function keyOf(doc: BreakdownDoc, dim: BreakdownDim): { key: string; label: string } {
    switch (dim) {
        case "vehicle": {
            const raw = (doc.vehicle || "").trim();
            // MH12AB1234, mh 12 ab-1234 and MH-12-AB-1234 are the same vehicle
            const key = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
            return key ? { key, label: raw.toUpperCase() } : { key: "", label: NONE };
        }
        case "reference": {
            const raw = (doc.reference || "").trim().replace(/\s+/g, " ");
            const key = raw.toLowerCase();
            return key ? { key, label: raw } : { key: "", label: NONE };
        }
        case "month": {
            const ym = (doc.date || "").slice(0, 7);
            if (!/^\d{4}-\d{2}$/.test(ym)) return { key: "", label: NONE };
            return { key: ym, label: `${MONTHS[Number(ym.slice(5)) - 1]} ${ym.slice(0, 4)}` };
        }
        case "status":
            return { key: doc.status, label: titleCase(doc.status) };
        case "payment":
            return doc.payment ? { key: doc.payment, label: titleCase(doc.payment) } : { key: "", label: NONE };
    }
}

export function buildBreakdown(docs: BreakdownDoc[], dim: BreakdownDim): BreakdownGroup[] {
    const map = new Map<string, BreakdownGroup & { spellings: Map<string, number> }>();

    for (const doc of docs) {
        const { key, label } = keyOf(doc, dim);
        let g = map.get(key);
        if (!g) {
            g = { key, label, count: 0, ignored: 0, total: 0, paid: 0, due: 0, ids: [], spellings: new Map() };
            map.set(key, g);
        }
        g.ids.push(doc.id);
        g.spellings.set(label, (g.spellings.get(label) || 0) + 1);
        if (doc.counts) {
            g.count += 1;
            g.total += doc.total;
            g.paid += doc.paid;
            g.due += doc.due;
        } else {
            g.ignored += 1;
        }
    }

    const groups = Array.from(map.values()).map(({ spellings, ...g }) => {
        // show the spelling people typed most often for that group
        const label = Array.from(spellings.entries()).sort((a, b) => b[1] - a[1])[0][0];
        return { ...g, label, total: round2(g.total), paid: round2(g.paid), due: round2(g.due) };
    });

    // biggest outstanding first; "(none)" always last
    return groups.sort((a, b) => (a.key === "" ? 1 : b.key === "" ? -1 : b.due - a.due || b.total - a.total));
}

export function sumGroups(groups: BreakdownGroup[]) {
    return groups.reduce(
        (s, g) => ({ count: s.count + g.count, total: round2(s.total + g.total), paid: round2(s.paid + g.paid), due: round2(s.due + g.due) }),
        { count: 0, total: 0, paid: 0, due: 0 },
    );
}

/** Ids of documents that pass the selected group and the search text; null = no filter is active. */
export function filterIds(docs: BreakdownDoc[], dim: BreakdownDim, selectedKey: string | null, search: string): Set<string> | null {
    const q = search.trim().toLowerCase();
    if (selectedKey === null && !q) return null;

    const ids = new Set<string>();
    for (const doc of docs) {
        if (selectedKey !== null && keyOf(doc, dim).key !== selectedKey) continue;
        if (q) {
            const hay = [doc.number, doc.vehicle, doc.reference, doc.notes].filter(Boolean).join(" ").toLowerCase();
            if (!hay.includes(q)) continue;
        }
        ids.add(doc.id);
    }
    return ids;
}