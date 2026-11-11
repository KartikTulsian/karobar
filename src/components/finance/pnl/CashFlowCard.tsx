import { useCashFlow } from "@/hooks/useCashFlow";
import { CashFlowGroup, CashFlowRow } from "@/types/finance";
import { ArrowDownLeft, ArrowUpRight, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const inr = (v: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v);
const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
 
type Preset = "this_month" | "last_month" | "3m" | "6m" | "year";
const PRESETS: { value: Preset; label: string; group: CashFlowGroup }[] = [
    { value: "this_month", label: "This month", group: "day" },
    { value: "last_month", label: "Last month", group: "day" },
    { value: "3m", label: "3 months", group: "month" },
    { value: "6m", label: "6 months", group: "month" },
    { value: "year", label: "12 months", group: "month" },
];
 
function rangeFor(p: Preset): { start: string; end: string } {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    switch (p) {
        case "this_month": return { start: iso(new Date(y, m, 1)), end: iso(now) };
        case "last_month": return { start: iso(new Date(y, m - 1, 1)), end: iso(new Date(y, m, 0)) };
        case "3m": return { start: iso(new Date(y, m - 2, 1)), end: iso(now) };
        case "6m": return { start: iso(new Date(y, m - 5, 1)), end: iso(now) };
        case "year": return { start: iso(new Date(y, m - 11, 1)), end: iso(now) };
    }
}
 
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function periodLabel(period: string, group: CashFlowGroup) {
    const [y, m, d] = period.split("-").map(Number);
    if (group === "month") return `${MONTHS[m - 1]} ${String(y).slice(2)}`;
    if (group === "week") return `Wk ${d} ${MONTHS[m - 1]}`;
    return `${d} ${MONTHS[m - 1]}`;
}
 
const sum = (rows: CashFlowRow[], k: keyof Omit<CashFlowRow, "period">) => rows.reduce((s, r) => s + r[k], 0);
 
export default function CashFlowCard({ tenantId }: { tenantId: string }) {
    const [preset, setPreset] = useState<Preset>("6m");
    const [groupOverride, setGroupOverride] = useState<CashFlowGroup | null>(null);
 
    const defaultGroup = PRESETS.find((p) => p.value === preset)!.group;
    const group = groupOverride ?? defaultGroup;
    const { start, end } = useMemo(() => rangeFor(preset), [preset]);
 
    const { data: rows = [], isLoading, isError } = useCashFlow(tenantId, start, end, group);
 
    const totalIn = sum(rows, "total_in");
    const totalOut = sum(rows, "total_out");
    const net = totalIn - totalOut;
 
    const chartData = rows.map((r) => ({ name: periodLabel(r.period, group), "Money in": r.total_in, "Money out": r.total_out }));
 
    const pickPreset = (p: Preset) => { setPreset(p); setGroupOverride(null); };
 
    return (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h3 className="flex items-center gap-2 font-bold text-slate-900 dark:text-white"><Wallet className="h-4 w-4 text-indigo-600" /> Money In &amp; Out</h3>
                    <p className="text-xs text-slate-500">Actual money received and paid (from the cash book), not bills raised.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
                        {PRESETS.map((p) => (
                            <button key={p.value} onClick={() => pickPreset(p.value)}
                                className={`rounded-md px-3 py-1 text-xs font-semibold ${preset === p.value ? "bg-white text-indigo-700 shadow-sm dark:bg-slate-700 dark:text-indigo-300" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"}`}>{p.label}</button>
                        ))}
                    </div>
                    <select value={group} onChange={(e) => setGroupOverride(e.target.value as CashFlowGroup)}
                        className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                        <option value="day">By day</option><option value="week">By week</option><option value="month">By month</option>
                    </select>
                </div>
            </div>
 
            {isLoading ? (
                <div className="flex h-48 items-center justify-center text-sm text-slate-400">Loading…</div>
            ) : isError ? (
                <div className="flex h-48 items-center justify-center text-sm text-red-500">Failed to load cash flow.</div>
            ) : (
                <div className="flex flex-col gap-5 p-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 dark:border-emerald-900/40 dark:bg-emerald-500/10">
                            <p className="flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400"><ArrowDownLeft className="h-3.5 w-3.5" /> Money in</p>
                            <p className="text-xl font-bold text-slate-900 dark:text-white">{inr(totalIn)}</p>
                            <p className="text-xs text-slate-500">Customers {inr(sum(rows, "customer_receipts"))}</p>
                        </div>
                        <div className="rounded-xl border border-red-100 bg-red-50/60 p-4 dark:border-red-900/40 dark:bg-red-500/10">
                            <p className="flex items-center gap-1 text-xs font-medium text-red-700 dark:text-red-400"><ArrowUpRight className="h-3.5 w-3.5" /> Money out</p>
                            <p className="text-xl font-bold text-slate-900 dark:text-white">{inr(totalOut)}</p>
                            <p className="text-xs text-slate-500">Suppliers {inr(sum(rows, "supplier_payments"))} · Expenses {inr(sum(rows, "expenses"))}</p>
                        </div>
                        <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                            <p className="text-xs font-medium text-slate-500">Net cash movement</p>
                            <p className={`text-xl font-bold ${net >= 0 ? "text-emerald-600" : "text-red-500"}`}>{net >= 0 ? "+" : "−"}{inr(Math.abs(net))}</p>
                            <p className="text-xs text-slate-500">In minus out for this period</p>
                        </div>
                    </div>
 
                    {rows.length === 0 ? (
                        <p className="py-6 text-center text-sm text-slate-400">No money movement in this period.</p>
                    ) : (
                        <>
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => (v >= 100000 ? `${(v / 100000).toFixed(1)}L` : v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
                                        <Tooltip formatter={(v) => inr(Number(v))} />
                                        <Legend />
                                        <Bar dataKey="Money in" fill="#10b981" radius={[3, 3, 0, 0]} />
                                        <Bar dataKey="Money out" fill="#ef4444" radius={[3, 3, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
 
                            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                                <table className="w-full min-w-[820px] whitespace-nowrap text-right text-sm">
                                    <thead className="bg-slate-50 text-xs uppercase text-slate-400 dark:bg-slate-800/60">
                                        <tr>
                                            <th className="px-3 py-2 text-left font-semibold">Period</th>
                                            <th className="px-3 py-2 font-semibold text-emerald-600">From customers</th>
                                            <th className="px-3 py-2 font-semibold text-emerald-600">Other in</th>
                                            <th className="px-3 py-2 font-semibold text-emerald-700">Total in</th>
                                            <th className="px-3 py-2 font-semibold text-red-500">To suppliers</th>
                                            <th className="px-3 py-2 font-semibold text-red-500">Expenses</th>
                                            <th className="px-3 py-2 font-semibold text-red-500">Refunds / other</th>
                                            <th className="px-3 py-2 font-semibold text-red-600">Total out</th>
                                            <th className="px-3 py-2 font-semibold">Net</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {[...rows].reverse().map((r) => {
                                            const n = r.total_in - r.total_out;
                                            return (
                                                <tr key={r.period}>
                                                    <td className="px-3 py-2 text-left font-medium text-slate-800 dark:text-slate-100">{periodLabel(r.period, group)}</td>
                                                    <td className="px-3 py-2">{inr(r.customer_receipts)}</td>
                                                    <td className="px-3 py-2">{inr(r.supplier_refunds + r.other_in)}</td>
                                                    <td className="px-3 py-2 font-semibold text-emerald-700">{inr(r.total_in)}</td>
                                                    <td className="px-3 py-2">{inr(r.supplier_payments)}</td>
                                                    <td className="px-3 py-2">{inr(r.expenses)}</td>
                                                    <td className="px-3 py-2">{inr(r.customer_refunds + r.other_out)}</td>
                                                    <td className="px-3 py-2 font-semibold text-red-600">{inr(r.total_out)}</td>
                                                    <td className={`px-3 py-2 font-semibold ${n >= 0 ? "text-emerald-600" : "text-red-500"}`}>{n < 0 ? "−" : ""}{inr(Math.abs(n))}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot className="border-t border-slate-200 bg-slate-50 font-bold dark:border-slate-700 dark:bg-slate-800">
                                        <tr>
                                            <td className="px-3 py-2 text-left">Total</td>
                                            <td className="px-3 py-2">{inr(sum(rows, "customer_receipts"))}</td>
                                            <td className="px-3 py-2">{inr(sum(rows, "supplier_refunds") + sum(rows, "other_in"))}</td>
                                            <td className="px-3 py-2 text-emerald-700">{inr(totalIn)}</td>
                                            <td className="px-3 py-2">{inr(sum(rows, "supplier_payments"))}</td>
                                            <td className="px-3 py-2">{inr(sum(rows, "expenses"))}</td>
                                            <td className="px-3 py-2">{inr(sum(rows, "customer_refunds") + sum(rows, "other_out"))}</td>
                                            <td className="px-3 py-2 text-red-600">{inr(totalOut)}</td>
                                            <td className={`px-3 py-2 ${net >= 0 ? "text-emerald-600" : "text-red-500"}`}>{net < 0 ? "−" : ""}{inr(Math.abs(net))}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}