"use client";

import { useState } from "react";
import { Crown, Wrench, UserCircle, Check, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

const roles = [
  {
    key: "owner",
    label: "Owner",
    icon: Crown,
    heading: "Full financial control",
    description:
      "See profit margins, net worth, and every rupee moving through every branch. Grant or revoke staff access in one screen.",
    points: [
      "Real-time P&L across all locations",
      "Platform-wide user & role administration",
      "Complete audit trail on every transaction",
    ],
    panelTitle: "Owner Console",
    rows: [
      { label: "Net Profit (MTD)", value: "₹6,42,110", tone: "up" },
      { label: "Staff Accounts", value: "8 active", tone: "neutral" },
      { label: "Branches", value: "3 connected", tone: "neutral" },
    ],
  },
  {
    key: "staff",
    label: "Staff",
    icon: Wrench,
    heading: "Fast POS, nothing extra",
    description:
      "Counter staff get a focused billing and inventory view built for speed — no profit figures, no financial reports, no distractions.",
    points: [
      "One-tap billing with barcode & search",
      "Live stock lookup across the shop",
      "Profit and cost fields hidden entirely",
    ],
    panelTitle: "Counter POS",
    rows: [
      { label: "Item: Clutch Plate", value: "In stock · 12", tone: "neutral" },
      { label: "Cost Price", value: "Restricted", tone: "locked" },
      { label: "Today's Bills", value: "34 issued", tone: "neutral" },
    ],
  },
  {
    key: "customer",
    label: "Customer",
    icon: UserCircle,
    heading: "A portal of their own",
    description:
      "Customers claim their profile with a phone number and get a secure view of every past bill and any outstanding dues — no calls to the shop required.",
    points: [
      "Full purchase history, searchable by date",
      "Outstanding dues shown clearly, in real time",
      "Secure \"Claim Profile\" verification flow",
    ],
    panelTitle: "Customer Portal",
    rows: [
      { label: "Outstanding Due", value: "₹0.00", tone: "up" },
      { label: "Last Purchase", value: "Aug 14, 2026", tone: "neutral" },
      { label: "Bills on File", value: "17 records", tone: "neutral" },
    ],
  },
] as const;

export default function RoleShowcase() {
  const [active, setActive] = useState<(typeof roles)[number]["key"]>("owner");
  const role = roles.find((r) => r.key === active)!;

  return (
    <section className="border-t border-zinc-200 bg-zinc-50 py-24 dark:border-zinc-900 dark:bg-zinc-950/40">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="font-mono text-xs font-medium uppercase tracking-widest text-violet-600 dark:text-violet-400">
            One login, three experiences
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
            KAROBAR adapts to who&apos;s signed in
          </h2>
          <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
            The same platform, three purpose-built interfaces — so nobody
            sees more than their role requires.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="mt-10 inline-flex rounded-xl border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-950">
          {roles.map((r) => (
            <button
              key={r.key}
              onClick={() => setActive(r.key)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                active === r.key
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
              )}
            >
              <r.icon className="h-4 w-4" />
              {r.label}
            </button>
          ))}
        </div>

        <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-2 lg:items-center">
          {/* Copy */}
          <div>
            <h3 className="text-2xl font-semibold text-zinc-900 dark:text-white">
              {role.heading}
            </h3>
            <p className="mt-3 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
              {role.description}
            </p>
            <ul className="mt-6 space-y-3">
              {role.points.map((p) => (
                <li key={p} className="flex items-start gap-3 text-sm text-zinc-700 dark:text-zinc-300">
                  <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-violet-100 dark:bg-violet-500/15">
                    <Check className="h-3 w-3 text-violet-600 dark:text-violet-400" />
                  </span>
                  {p}
                </li>
              ))}
            </ul>
          </div>

          {/* Mock panel */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <role.icon className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                <span className="text-sm font-semibold text-zinc-900 dark:text-white">
                  {role.panelTitle}
                </span>
              </div>
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                {role.label} view
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {role.rows.map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between rounded-lg bg-zinc-50 px-4 py-3 dark:bg-zinc-950"
                >
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">
                    {row.label}
                  </span>
                  <span
                    className={cn(
                      "flex items-center gap-1.5 font-mono text-sm font-medium",
                      row.tone === "up" && "text-emerald-600 dark:text-emerald-400",
                      row.tone === "neutral" && "text-zinc-900 dark:text-white",
                      row.tone === "locked" && "text-zinc-400 dark:text-zinc-600"
                    )}
                  >
                    {row.tone === "locked" && <Lock className="h-3 w-3" />}
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}