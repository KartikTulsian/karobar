import { BillDetail } from '@/types/billing'
import { Tenant } from '@/types/people'

// 1. Invoice Parties Component (To/From)
export function InvoiceParties({ bill, tenant }: { bill: BillDetail, tenant: Tenant }) {
    return (
        <div className="flex flex-col sm:flex-row justify-between gap-6 py-6 border-b border-slate-200 dark:border-slate-700/50">
            <div className="flex flex-col gap-1.5 w-1/2">
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Billed From</p>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">{tenant.name}</h3>
                {tenant.address && (
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {tenant.address}
                    </p>
                )}
                <div className="mt-1">
                    {tenant.phone && <p className="text-sm text-slate-600 dark:text-slate-400"><span className="font-medium">Ph:</span> {tenant.phone}</p>}
                    {tenant.email && <p className="text-sm text-slate-600 dark:text-slate-400"><span className="font-medium">Email:</span> {tenant.email}</p>}
                    {bill.is_gst_bill && tenant.gstin && (
                        <p className="text-sm text-slate-900 dark:text-slate-200 mt-1 font-medium bg-slate-100 dark:bg-slate-800/50 inline-block px-2 py-0.5 rounded">
                            GSTIN: {tenant.gstin}
                        </p>
                    )}
                </div>
            </div>

            <div className="flex flex-col gap-1.5 sm:text-right w-1/2">
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Billed To</p>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">{bill.customers?.name}</h3>
                {bill.customers?.address && (
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {bill.customers.address}
                    </p>
                )}
                
                <div className="mt-1">
                    {bill.customers?.phone && <p className="text-sm text-slate-600 dark:text-slate-400"><span className="font-medium">Ph:</span> {bill.customers.phone}</p>}
                    {bill.customers?.email && <p className="text-sm text-slate-600 dark:text-slate-400">{bill.customers.email}</p>}
                    {bill.is_gst_bill && bill.customers?.type === 'registered' && (
                        <p className="text-sm text-slate-900 dark:text-slate-200 mt-1 font-medium bg-slate-100 dark:bg-slate-800/50 inline-block px-2 py-0.5 rounded">
                            GSTIN: {bill.customers.gstin}
                        </p>
                    )}
                    {bill.reference_name && (
                        <div className="mt-3 block">
                            <div className="inline-flex flex-col text-left rounded-md bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 px-3 py-1.5">
                                <span className="font-bold uppercase tracking-wider text-[9px] text-indigo-600 dark:text-indigo-400 mb-0.5">
                                    Reference / C/O
                                </span>
                                <span className="text-sm font-medium text-indigo-900 dark:text-indigo-300">
                                    {bill.reference_name}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
