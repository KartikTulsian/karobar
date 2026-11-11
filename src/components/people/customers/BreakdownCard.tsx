"use client";

import { BREAKDOWN_DIMS, BreakdownDim, BreakdownDoc, BreakdownGroup, buildBreakdown, filterIds, sumGroups } from "@/lib/helpers/breakdown";
import { BarChart3, Search, X } from "lucide-react";
import { useMemo, useState } from "react";

const money = (v: number) => `₹${v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * State for the breakdown + the table filter, in one place so the page stays small.
 * Everything is computed from `docs` (already loaded by the page): zero extra database reads.
 */
export function useDocBreakdown(docs: BreakdownDoc[]) {
    const [dim, setDimState] = useState<BreakdownDim>("vehicle");
    const [selectedKey, setSelectedKey] = useState<string | null>(null);
    const [search, setSearch] = useState("");

    const groups = useMemo(() => buildBreakdown(docs, dim), [docs, dim]);
    const visibleIds = useMemo(() => filterIds(docs, dim, selectedKey, search), [docs, dim, selectedKey, search]);

    const setDim = (d: BreakdownDim) => { setDimState(d); setSelectedKey(null); }; // a key from another grouping means nothing here
    const clear = () => { setSelectedKey(null); setSearch(""); };

    return { dim, setDim, selectedKey, setSelectedKey, search, setSearch, groups, visibleIds, clear };
}

type State = ReturnType<typeof useDocBreakdown>;

interface Props {
    state: State;
    docLabel: string;          // "bills" | "orders"
    shownCount: number;        // how many documents the table below is showing now
    totalCount: number;
}

export default function BreakdownCard({ state, docLabel, shownCount, totalCount }: Props) {
    const { dim, setDim, selectedKey, setSelectedKey, search, setSearch, groups, clear } = state;
    const totals = useMemo(() => sumGroups(groups), [groups]);
    const selected: BreakdownGroup | undefined = groups.find((g) => g.key === selectedKey);
    const filtered = selectedKey !== null || search.trim() !== "";

    return (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/50 lg:flex-row lg:items-center lg:justify-between">
                <h3 className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                    <BarChart3 className="h-4 w-4 text-indigo-600" /> Breakdown
                    <span className="text-xs font-normal text-slate-400">click a row to filter the {docLabel} below</span>
                </h3>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
                        {BREAKDOWN_DIMS.map((d) => (
                            <button key={d.value} type="button" onClick={() => setDim(d.value)}
                                className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${dim === d.value ? "bg-white text-indigo-700 shadow-sm dark:bg-slate-700 dark:text-indigo-300" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"}`}>
                                {d.label}
                            </button>
                        ))}
                    </div>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search number, vehicle, note…"
                            className="w-full rounded-md border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white sm:w-56" />
                    </div>
                </div>
            </div>

            {filtered && (
                <div className="flex flex-wrap items-center gap-2 border-b border-indigo-100 bg-indigo-50/60 px-4 py-2 text-xs text-indigo-800 dark:border-indigo-900/40 dark:bg-indigo-500/10 dark:text-indigo-300">
                    <span>Showing {shownCount} of {totalCount} {docLabel}</span>
                    {selected && <span className="rounded bg-white px-2 py-0.5 font-semibold dark:bg-slate-800">{selected.label}: due {money(selected.due)}</span>}
                    {search.trim() && <span className="rounded bg-white px-2 py-0.5 dark:bg-slate-800">“{search.trim()}”</span>}
                    <button type="button" onClick={clear} className="ml-auto inline-flex items-center gap-1 font-semibold hover:underline"><X className="h-3 w-3" /> Clear filter</button>
                </div>
            )}

            <div className="max-h-80 overflow-auto">
                <table className="w-full whitespace-nowrap text-left text-sm">
                    <thead className="sticky top-0 border-b border-slate-100 bg-white text-xs uppercase text-slate-400 dark:border-slate-800 dark:bg-slate-900">
                        <tr>
                            <th className="px-4 py-2.5 font-semibold">{BREAKDOWN_DIMS.find((d) => d.value === dim)?.label}</th>
                            <th className="px-4 py-2.5 text-right font-semibold">{docLabel}</th>
                            <th className="px-4 py-2.5 text-right font-semibold">Total</th>
                            <th className="px-4 py-2.5 text-right font-semibold">Paid</th>
                            <th className="px-4 py-2.5 text-right font-semibold">Due</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {groups.map((g) => {
                            const active = selectedKey === g.key;
                            return (
                                <tr key={g.key || "__none"} onClick={() => setSelectedKey(active ? null : g.key)}
                                    className={`cursor-pointer transition-colors ${active ? "border-l-4 border-l-indigo-600 bg-indigo-50 dark:bg-indigo-500/10" : "border-l-4 border-l-transparent hover:bg-slate-50 dark:hover:bg-slate-800/30"}`}>
                                    <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-white">
                                        {g.label}
                                        {g.ignored > 0 && <span className="ml-2 text-[10px] font-normal text-slate-400">+{g.ignored} draft/cancelled</span>}
                                    </td>
                                    <td className="px-4 py-2.5 text-right text-slate-600 dark:text-slate-300">{g.count}</td>
                                    <td className="px-4 py-2.5 text-right text-slate-700 dark:text-slate-200">{money(g.total)}</td>
                                    <td className="px-4 py-2.5 text-right text-emerald-600">{money(g.paid)}</td>
                                    <td className={`px-4 py-2.5 text-right font-semibold ${g.due > 0 ? "text-red-500" : "text-slate-400"}`}>{money(g.due)}</td>
                                </tr>
                            );
                        })}
                        {groups.length === 0 && (
                            <tr><td colSpan={5} className="py-8 text-center text-slate-400">Nothing to break down yet.</td></tr>
                        )}
                    </tbody>
                    {groups.length > 0 && (
                        <tfoot className="sticky bottom-0 border-t border-slate-200 bg-slate-50 text-sm font-bold dark:border-slate-700 dark:bg-slate-800">
                            <tr>
                                <td className="px-4 py-2.5 text-slate-700 dark:text-slate-200">All</td>
                                <td className="px-4 py-2.5 text-right">{totals.count}</td>
                                <td className="px-4 py-2.5 text-right">{money(totals.total)}</td>
                                <td className="px-4 py-2.5 text-right text-emerald-600">{money(totals.paid)}</td>
                                <td className="px-4 py-2.5 text-right text-red-500">{money(totals.due)}</td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
        </div>
    );
}