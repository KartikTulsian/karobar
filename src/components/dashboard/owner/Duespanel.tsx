import Link from 'next/link'
import { TriangleAlert } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { DueRow } from '@/types/finance'

interface Props {
  title: string
  icon: LucideIcon
  iconClassName: string
  /** Tailwind classes for the avatar chip, e.g. "bg-orange-100 text-orange-700 ..." */
  avatarClassName: string
  /** Tailwind bg class for the share-of-largest-due bar, e.g. "bg-orange-400" */
  barClassName: string
  nameHeader: string
  rows: DueRow[]
  isLoading: boolean
  isError?: boolean
  onRetry?: () => void
  emptyText: string
  viewAllHref: string
  maxRows?: number
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val)
 
/** Safely converts a nullable / string / malformed DB numeric into a finite number (0 if invalid). */
export const toAmount = (value: number | string | null | undefined): number => {
  const n = Number(value ?? 0)
  return Number.isFinite(n) ? n : 0
}
 
const initials = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('') || '?'
 
// Keeps the body the same height in loading / error / empty states to avoid layout shift
const BODY_MIN_H = 'min-h-[26rem]'
 
export default function Duespanel({
  title,
  icon: Icon,
  iconClassName,
  avatarClassName,
  barClassName,
  nameHeader,
  rows,
  isLoading,
  isError = false,
  onRetry,
  emptyText,
  viewAllHref,
  maxRows = 8,
}: Props) {
  const sorted = [...rows].filter(r => r.due > 0).sort((a, b) => b.due - a.due)
  const visible = sorted.slice(0, maxRows)
  const total = sorted.reduce((s, r) => s + r.due, 0)
  const max = visible[0]?.due || 1
 
  const subtitle = isLoading
    ? 'Loading…'
    : isError
      ? 'Unable to load'
      : `${sorted.length} pending`
 
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${avatarClassName}`}>
            <Icon className={`h-5 w-5 ${iconClassName}`} strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="text-lg font-semibold leading-tight text-slate-900 dark:text-white">{title}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
          </div>
        </div>
        {!isLoading && !isError && (
          <div className="text-right">
            <p className="text-xs text-slate-500 dark:text-slate-400">Total</p>
            <p className="text-lg font-bold tabular-nums text-slate-900 dark:text-white">{formatCurrency(total)}</p>
          </div>
        )}
      </div>
 
      {/* Column labels */}
      <div className="flex items-center justify-between bg-slate-50 px-5 py-2 text-xs font-medium uppercase tracking-wide text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
        <span>{nameHeader}</span>
        <span>Due</span>
      </div>
 
      <div className={`flex-1 ${BODY_MIN_H}`}>
        {isLoading ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800" aria-busy="true">
            {Array.from({ length: maxRows }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3">
                <div className="h-9 w-9 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-40 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                  <div className="h-2 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="flex h-full min-h-[22rem] flex-col items-center justify-center gap-3 px-5 text-center">
            <TriangleAlert className="h-8 w-8 text-red-500" strokeWidth={1.5} />
            <p className="text-sm font-medium text-slate-900 dark:text-white">Couldn&apos;t load {title.toLowerCase()}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">This isn&apos;t the same as having no dues.</p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Retry
              </button>
            )}
          </div>
        ) : visible.length === 0 ? (
          <div className="flex h-full min-h-[22rem] items-center justify-center px-5">
            <p className="text-center text-sm text-slate-500 dark:text-slate-400">{emptyText}</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {visible.map(r => (
              <li key={r.id} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${avatarClassName} ${iconClassName}`}>
                  {initials(r.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="truncate font-medium text-slate-900 dark:text-white" title={r.name}>{r.name}</p>
                    <p className="whitespace-nowrap font-semibold tabular-nums text-slate-900 dark:text-white">
                      {formatCurrency(r.due)}
                    </p>
                  </div>
                  <div className="mt-1.5 flex items-center gap-3">
                    {r.phone && (
                      <span className="shrink-0 text-xs tabular-nums text-slate-500 dark:text-slate-400">{r.phone}</span>
                    )}
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className={`h-full rounded-full ${barClassName}`}
                        style={{ width: `${Math.max(4, (r.due / max) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
 
      {!isLoading && !isError && sorted.length > maxRows && (
        <Link
          href={viewAllHref}
          className="block border-t border-slate-200 px-5 py-3 text-center text-sm font-medium text-indigo-600 hover:bg-slate-50 dark:border-slate-800 dark:text-indigo-400 dark:hover:bg-slate-800/40"
        >
          View all {sorted.length} →
        </Link>
      )}
    </div>
  )
}