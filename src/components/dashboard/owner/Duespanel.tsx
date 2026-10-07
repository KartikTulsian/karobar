import Link from 'next/link'
import { TriangleAlert } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { DueRow } from '@/types/finance'

interface Props {
  title: string
  icon: LucideIcon
  iconClassName: string
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

// Keeps the body the same height in loading / error / empty states to avoid layout shift
const BODY_MIN_H = 'min-h-[22rem]'

export default function DuesPanel({
  title,
  icon: Icon,
  iconClassName,
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

  const subtitle = isLoading
    ? 'Loading…'
    : isError
      ? 'Unable to load'
      : `${sorted.length} pending · ${formatCurrency(total)} total`

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
        </div>
        <Icon className={`h-6 w-6 ${iconClassName}`} strokeWidth={1.5} />
      </div>

      <div className={BODY_MIN_H}>
        {isLoading ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800" aria-busy="true">
            {Array.from({ length: maxRows }).map((_, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-4">
                <div className="space-y-2">
                  <div className="h-3.5 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                  <div className="h-3 w-20 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                </div>
                <div className="h-4 w-16 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
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
          <div className="flex min-h-[22rem] items-center justify-center px-5">
            <p className="text-center text-sm text-slate-500 dark:text-slate-400">{emptyText}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="px-5 py-3 font-medium">{nameHeader}</th>
                  <th className="px-5 py-3 text-right font-medium">Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {visible.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-5 py-3">
                      <p className="font-medium text-slate-900 dark:text-white">{r.name}</p>
                      {r.phone && <p className="text-xs text-slate-500 dark:text-slate-400">{r.phone}</p>}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-right font-semibold text-slate-900 dark:text-white">
                      {formatCurrency(r.due)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!isLoading && !isError && sorted.length > maxRows && (
        <Link
          href={viewAllHref}
          className="block border-t border-slate-200 px-5 py-3 text-center text-sm font-medium text-indigo-600 hover:bg-slate-50 dark:border-slate-800 dark:text-indigo-400 dark:hover:bg-slate-800/40"
        >
          View all {sorted.length}
        </Link>
      )}
    </div>
  )
}