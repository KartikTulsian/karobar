import Image from 'next/image'
import Link from 'next/link'
import ThemeToggle from '../theme/ThemeToggle'

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/80 backdrop-blur-md dark:border-zinc-900 dark:bg-black/80">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/logo/karobar_full_bgr.png"
            alt="KAROBAR"
            width={106}
            height={36}
            className="h-9 w-35"
            priority
          />
        </Link>
 
        <nav className="hidden items-center gap-8 md:flex">
          <Link href="#features" className="text-sm text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white">
            Features
          </Link>
          <Link href="#pricing" className="text-sm text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white">
            Pricing
          </Link>
        </nav>
 
        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          <span aria-hidden className="hidden h-5 w-px bg-zinc-200 dark:bg-zinc-800 sm:block" />
          <Link href="/login" className="hidden text-sm font-medium text-zinc-700 transition-colors hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white sm:inline-flex">
            Sign In
          </Link>
          <Link href="/signup" className="inline-flex items-center rounded-lg bg-gradient-to-r from-blue-600 via-violet-600 to-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90">
            Start for Free
          </Link>
        </div>
      </div>
    </header>
  )
}
