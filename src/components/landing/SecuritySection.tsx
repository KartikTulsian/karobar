import { ShieldCheck, Database, GitBranch } from "lucide-react";

const points = [
  {
    icon: Database,
    title: "PostgreSQL at the core",
    description:
      "A relational schema built for automobile retail — every part, invoice, and payment is linked, never a loose spreadsheet row.",
  },
  {
    icon: ShieldCheck,
    title: "Row-Level Security, by default",
    description:
      "Every tenant's data is isolated at the database layer. Your shop's numbers are never visible to another business on the platform.",
  },
  {
    icon: GitBranch,
    title: "Built for multi-branch scale",
    description:
      "Add a second location, a third, a tenth. KAROBAR's multi-tenant architecture was designed for growth from day one.",
  },
];

export default function SecuritySection() {
  return (
    <section className="border-t border-zinc-200 bg-white py-24 dark:border-zinc-900 dark:bg-black">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="font-mono text-xs font-medium uppercase tracking-widest text-violet-600 dark:text-violet-400">
              Enterprise-grade, ground up
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
              Ironclad by architecture, not by promise
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
              KAROBAR is built on PostgreSQL with strict Row-Level Security,
              so tenant isolation isn&apos;t a setting you configure — it&apos;s
              enforced at the database itself.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {points.map((p) => (
              <div
                key={p.title}
                className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <p.icon className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                <h3 className="mt-4 text-sm font-semibold text-zinc-900 dark:text-white">
                  {p.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {p.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}