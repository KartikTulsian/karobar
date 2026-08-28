import { Boxes, ScanLine, Truck, LineChart, ArrowUpRight } from "lucide-react";

const features = [
  {
    icon: Boxes,
    eyebrow: "Inventory",
    title: "Smart Inventory",
    description:
      "Track every part by brand, category, and compatibility. KAROBAR watches your stock and flags reorder points before shelves go empty.",
    accent: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-500/10",
    span: "lg:col-span-3",
  },
  {
    icon: ScanLine,
    eyebrow: "Billing",
    title: "Intelligent Billing & AI",
    description:
      "Bill a customer in seconds at the counter. Scan a supplier bill with AI and it's itemized and reconciled — no manual entry.",
    accent: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-50 dark:bg-violet-500/10",
    span: "lg:col-span-3",
  },
  {
    icon: Truck,
    eyebrow: "Supply Chain",
    title: "Supply Chain & CRM",
    description:
      "See exactly who owes you and who you owe. Purchase orders, vendor payments, and customer dues live in one place.",
    accent: "text-fuchsia-600 dark:text-fuchsia-400",
    bg: "bg-fuchsia-50 dark:bg-fuchsia-500/10",
    span: "lg:col-span-2",
  },
  {
    icon: LineChart,
    eyebrow: "Finance",
    title: "Financial Analytics",
    description:
      "Real profit and loss, not a guess. Daily summaries and expense tracking update automatically as bills come in.",
    accent: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-500/10",
    span: "lg:col-span-4",
  },
];

export default function FeatureGrid() {
  return (
    <section className="border-t border-zinc-200 bg-white py-24 dark:border-zinc-900 dark:bg-black">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="font-mono text-xs font-medium uppercase tracking-widest text-violet-600 dark:text-violet-400">
            Four pillars, one ledger
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
            Everything the shop floor and the back office both need
          </h2>
          <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
            No more juggling a stock register, a bill book, and a
            spreadsheet. Every module writes to the same source of truth.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-4 lg:grid-cols-6">
          {features.map((f) => (
            <div
              key={f.title}
              className={`group relative overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 p-7 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700 ${f.span}`}
            >
              <div
                className={`inline-flex h-11 w-11 items-center justify-center rounded-lg ${f.bg}`}
              >
                <f.icon className={`h-5 w-5 ${f.accent}`} />
              </div>

              <p className="mt-6 font-mono text-[11px] uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                {f.eyebrow}
              </p>
              <h3 className="mt-1 text-xl font-semibold text-zinc-900 dark:text-white">
                {f.title}
              </h3>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                {f.description}
              </p>

              <ArrowUpRight className="absolute right-6 top-6 h-4 w-4 -translate-y-1 translate-x-1 text-zinc-300 opacity-0 transition-all group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100 dark:text-zinc-700" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}