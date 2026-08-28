import { ArrowRight, TrendingUp, AlertTriangle } from "lucide-react";
import Link from "next/link";

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-zinc-50 dark:bg-black">
      {/* Faint ledger-rule backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.05] dark:opacity-[0.07]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to bottom, transparent, transparent 39px, currentColor 39px, currentColor 40px)",
          color: "#71717a",
        }}
      />

      {/* Soft brand-gradient glow, top of hero only */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[60rem] -translate-x-1/2 rounded-full opacity-20 blur-3xl dark:opacity-25"
        style={{
          background:
            "linear-gradient(90deg, #2563eb, #7c3aed, #d946ef, #f97316)",
        }}
      />

      <div className="relative mx-auto grid max-w-7xl grid-cols-1 gap-16 px-6 pb-24 pt-20 md:pt-28 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8 lg:px-8">
        {/* Copy column */}
        <div className="flex flex-col justify-center">
          <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-500 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-violet-600" />
            </span>
            Built for Indian automobile retail
          </div>

          <h1 className="font-sans text-4xl font-semibold tracking-tight text-zinc-900 dark:text-white sm:text-5xl lg:text-[3.4rem] lg:leading-[1.05]">
            The operating system for
            <span className="block bg-gradient-to-r from-blue-600 via-violet-600 to-orange-500 bg-clip-text text-transparent">
              modern automobile businesses
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
            KAROBAR unifies inventory, POS billing, customer accounts, and
            GST finance into one multi-tenant platform — so spare parts
            shops, mechanics, and service centers stop reconciling five
            different registers and start running one ledger of truth.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/signup"
              className="group inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 via-violet-600 to-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-sm shadow-violet-600/20 transition-opacity hover:opacity-90"
            >
              Start for Free
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-white px-6 py-3 text-sm font-semibold text-zinc-800 transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:bg-transparent dark:text-zinc-200 dark:hover:bg-zinc-900"
            >
              Sign In
            </Link>
          </div>

          <p className="mt-5 text-xs text-zinc-500 dark:text-zinc-500">
            No credit card required · Live in under 10 minutes · Data isolated
            per tenant
          </p>
        </div>

        {/* Signature visual: carbon-copy invoice stack, bar chart echoing the logo mark */}
        <div className="relative flex items-center justify-center lg:justify-end">
          <div className="relative w-full max-w-md">
            {/* Bottom carbon sheet — pink */}
            <div className="absolute inset-x-6 -bottom-3 h-full rounded-xl border border-fuchsia-200/60 bg-fuchsia-100/70 shadow-sm dark:border-fuchsia-900/30 dark:bg-fuchsia-950/20" />
            {/* Middle carbon sheet — amber */}
            <div className="absolute inset-x-3 -bottom-1.5 h-full rotate-1 rounded-xl border border-amber-200/60 bg-amber-100/70 shadow-sm dark:border-amber-900/30 dark:bg-amber-950/20" />

            {/* Top sheet: the live dashboard */}
            <div className="relative -rotate-1 rounded-xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
              {/* Stamp badge, brand gradient ring */}
              <div
                className="absolute -right-4 -top-4 flex h-16 w-16 -rotate-12 items-center justify-center rounded-full text-center font-mono text-[9px] font-bold uppercase leading-tight text-white shadow-lg"
                style={{
                  background:
                    "conic-gradient(from 180deg, #2563eb, #7c3aed, #d946ef, #f97316, #2563eb)",
                }}
              >
                <span className="flex h-[calc(100%-4px)] w-[calc(100%-4px)] items-center justify-center rounded-full bg-white dark:bg-zinc-950">
                  <span className="bg-gradient-to-br from-blue-600 via-violet-600 to-orange-500 bg-clip-text text-transparent">
                    GST
                    <br />
                    Ready
                  </span>
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-dashed border-zinc-200 pb-3 dark:border-zinc-800">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-wider text-zinc-400">
                    Today&apos;s Summary
                  </p>
                  <p className="mt-0.5 font-mono text-xl font-semibold text-zinc-900 dark:text-white">
                    ₹1,84,320
                  </p>
                </div>
                <div className="flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                  <TrendingUp className="h-3.5 w-3.5" />
                  12.4%
                </div>
              </div>

              {/* Mini bar chart — same rising silhouette and color sweep as the KAROBAR mark */}
              <div className="mt-4 flex h-20 items-end gap-1.5">
                {[
                  { h: 38, c: "#3b82f6" },
                  { h: 52, c: "#6d28d9" },
                  { h: 46, c: "#7c3aed" },
                  { h: 68, c: "#a21caf" },
                  { h: 58, c: "#c026d3" },
                  { h: 95, c: "#e11d48" },
                  { h: 80, c: "#f97316" },
                ].map((bar, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t-sm"
                    style={{ height: `${bar.h}%`, backgroundColor: bar.c }}
                  />
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-900/40 dark:bg-amber-950/30">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  <span className="font-mono text-xs text-amber-800 dark:text-amber-300">
                    Low stock — Brake Pad (MRF)
                  </span>
                </div>
                <span className="font-mono text-xs font-semibold text-amber-800 dark:text-amber-300">
                  4 left
                </span>
              </div>

              <div className="mt-3 space-y-1.5 font-mono text-[11px] text-zinc-400">
                <div className="flex justify-between">
                  <span>Invoice #INV-2291</span>
                  <span>₹4,200.00</span>
                </div>
                <div className="flex justify-between">
                  <span>Invoice #INV-2290</span>
                  <span>₹1,150.00</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}