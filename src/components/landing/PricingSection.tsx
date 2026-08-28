import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

const tiers = [
  {
    name: "Starter",
    tagline: "For a single shop getting off paper registers",
    price: "₹0",
    period: "/month",
    cta: "Start for Free",
    href: "/register?plan=starter",
    highlighted: false,
    features: [
      "1 shop, 1 counter",
      "Basic POS billing",
      "Up to 100 bills / month",
      "Manual GST invoice export",
      "Community support",
    ],
  },
  {
    name: "Pro",
    tagline: "For busy hubs that can't afford downtime",
    price: "₹1,499",
    period: "/month",
    cta: "Start 14-day Trial",
    href: "/register?plan=pro",
    highlighted: true,
    features: [
      "Unlimited bills & invoices",
      "AI-powered bill scanning",
      "Up to 5 staff accounts",
      "Customer portal & dues tracking",
      "One-click GST filing exports",
      "Priority email support",
    ],
  },
  {
    name: "Enterprise",
    tagline: "For multi-branch owners running a network",
    price: "Custom",
    period: "",
    cta: "Talk to Sales",
    href: "/contact",
    highlighted: false,
    features: [
      "Unlimited branches & staff",
      "Advanced analytics & forecasting",
      "Full API access",
      "B2B supplier networking",
      "Dedicated onboarding",
      "SLA-backed support",
    ],
  },
];

export default function PricingSection() {
  return (
    <section className="border-t border-zinc-200 bg-zinc-50 py-24 dark:border-zinc-900 dark:bg-zinc-950/40">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-mono text-xs font-medium uppercase tracking-widest text-violet-600 dark:text-violet-400">
            Pricing
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
            Priced for the counter, not the boardroom
          </h2>
          <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
            Start free with a single shop. Upgrade the moment your ledger
            gets busier.
          </p>
        </div>

        <div className="mx-auto mt-14 grid max-w-5xl grid-cols-1 gap-6 lg:grid-cols-3">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={cn(
                "relative flex flex-col rounded-2xl p-8",
                tier.highlighted
                  ? "bg-gradient-to-br from-blue-600 via-violet-600 to-orange-500 shadow-lg shadow-violet-600/20"
                  : "border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
              )}
            >
              {/* Inner card so only a 1px gradient ring shows on the highlighted tier */}
              <div
                className={cn(
                  "flex h-full flex-col",
                  tier.highlighted &&
                    "rounded-[14px] bg-white p-7 dark:bg-zinc-950"
                )}
              >
                {tier.highlighted && (
                  <span className="absolute -top-3 left-8 rounded-full bg-gradient-to-r from-blue-600 via-violet-600 to-orange-500 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                    Most Popular
                  </span>
                )}

                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                  {tier.name}
                </h3>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  {tier.tagline}
                </p>

                <div className="mt-6 flex items-baseline gap-1">
                  <span className="font-mono text-4xl font-semibold text-zinc-900 dark:text-white">
                    {tier.price}
                  </span>
                  {tier.period && (
                    <span className="text-sm text-zinc-500 dark:text-zinc-400">
                      {tier.period}
                    </span>
                  )}
                </div>

                <Link
                  href={tier.href}
                  className={cn(
                    "mt-6 inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-all",
                    tier.highlighted
                      ? "bg-gradient-to-r from-blue-600 via-violet-600 to-orange-500 text-white hover:opacity-90"
                      : "border border-zinc-300 text-zinc-800 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
                  )}
                >
                  {tier.cta}
                </Link>

                <ul className="mt-8 space-y-3 border-t border-zinc-100 pt-6 dark:border-zinc-800">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm text-zinc-600 dark:text-zinc-400">
                      <Check
                        className={cn(
                          "mt-0.5 h-4 w-4 flex-none",
                          tier.highlighted
                            ? "text-violet-600 dark:text-violet-400"
                            : "text-violet-600 dark:text-violet-400"
                        )}
                      />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}