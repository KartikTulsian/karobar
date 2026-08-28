import { Tenant } from '@/types/people';
import { PurchaseOrderDetail } from '@/types/purchases'
import Image from 'next/image';
import Link from 'next/link';


export default function POHeader({ po, tenant }: { po: PurchaseOrderDetail, tenant: Tenant }) {

    const documentTitle = po.is_gst_supply ? "GST PURCHASE ORDER" : "PURCHASE ORDER";
    const initial = tenant.name ? tenant.name.charAt(0).toUpperCase() : "K";

    return (
        <div className="flex flex-col md:flex-row justify-between items-start gap-4 border-b border-slate-200 dark:border-slate-700/50 pb-6">
            <div className="flex items-center gap-4">
                {tenant.logo_url ? (
                    <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white dark:bg-transparent">
                        <Image
                            src={tenant.logo_url}
                            alt={tenant.name}
                            fill
                            className="object-contain"
                            sizes="56px"
                        />
                    </div>
                ) : (
                    <div className="h-14 w-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-1 ring-white/10">
                        <span className="text-white font-black text-3xl">{initial}</span>
                    </div>
                )}
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">{tenant.name}</h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold tracking-widest uppercase">Purchase Department</p>
                </div>
            </div>

            <div className="text-left md:text-right">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-widest mb-1">{documentTitle}</h2>
                <div className="flex flex-col gap-1 text-sm mt-2">
                    {(po.supplier_id && po.suppliers) && (
                        <p className="text-slate-600 dark:text-slate-300 mb-1 border-b border-slate-100 dark:border-slate-800/60 pb-2">
                            <span className="font-medium text-slate-400">Supplier:</span>{' '}
                            <Link
                                href={`/people/suppliers/${po.supplier_id}`}
                                className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline transition-all"
                            >
                                {po.suppliers.name}
                            </Link>
                        </p>
                    )}
                    <p className="text-slate-600 dark:text-slate-300">
                        <span className="font-medium text-slate-400">PO No:</span> <span className="text-indigo-600 dark:text-indigo-400 font-bold">#{po.po_number}</span>
                    </p>
                    <p className="text-slate-600 dark:text-slate-300">
                        <span className="font-medium text-slate-400">Date:</span> {new Date(po.order_date).toLocaleDateString('en-GB')}
                    </p>
                    {po.vehicle_no && (
                        <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                            <p className="text-slate-600 dark:text-slate-300 flex items-center justify-start md:justify-end gap-2">
                                <span className="font-medium text-slate-400 text-xs uppercase tracking-wider">Dispatch / LR No:</span>
                                <span className="font-bold text-slate-800 dark:text-slate-200 uppercase bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                                    {po.vehicle_no}
                                </span>
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
