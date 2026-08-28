import Image from "next/image";
import { Playfair_Display } from "next/font/google";
import { cn } from "@/lib/utils";
import Link from "next/link";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["700", "800"],
});

const columns = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "Pricing", href: "#pricing" },
      { label: "Sign In", href: "/login" },
      { label: "Register", href: "/register" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Contact Sales", href: "/contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms of Service", href: "/terms" },
      { label: "Privacy Policy", href: "/privacy" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="relative border-t border-zinc-200 bg-white dark:border-zinc-900 dark:bg-black">
      {/* Hairline brand gradient, top of footer only — the one place outside the hero the full mark color appears */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-blue-600 via-violet-600 to-orange-500" />

      <div className="mx-auto max-w-7xl px-6 py-14 lg:px-8">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-5">
          <div className="col-span-2">
            <div className="flex items-center gap-2">
              <Image
                src="/logo/karobar_full_bgr.png"
                alt="KAROBAR"
                width={72}
                height={32}
                className="h-8 w-30"
              />
              {/* <span
                className={cn(playfair.className, "text-lg font-extrabold tracking-tight text-zinc-900 dark:text-white")}
              >
                Karobar
              </span> */}
            </div>
            <p
              className={cn(
                playfair.className,
                "mt-3 text-xs italic tracking-wide text-zinc-500 dark:text-zinc-500"
              )}
            >
              Apka Dhanda, Hamara Karobar.
            </p>
            <p className="mt-4 max-w-xs text-sm text-zinc-500 dark:text-zinc-400">
              The multi-tenant ERP built for spare parts shops, mechanics,
              and vehicle service centers.
            </p>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="font-mono text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                {col.title}
              </h4>
              <ul className="mt-4 space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-zinc-600 transition-colors hover:text-violet-600 dark:text-zinc-400 dark:hover:text-violet-400"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-zinc-100 pt-8 dark:border-zinc-900 sm:flex-row sm:items-center">
          <p className="font-mono text-xs text-zinc-400 dark:text-zinc-600">
            © {new Date().getFullYear()} KAROBAR. Built for the shop floor.
          </p>
        </div>
      </div>
    </footer>
  );
}