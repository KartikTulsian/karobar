import { PaymentBatchSummary } from '@/types/finance';
import { SupplierProfileData } from '@/types/people'
import { Building2, Phone, Mail, MapPin, FileText, StickyNote, User } from 'lucide-react';

export default function SuppliersDetailsCard({ supplier, payments }: { supplier: SupplierProfileData, payments: PaymentBatchSummary[] }) {

    // Financial Math
    const rawWriteOffs = supplier.total_write_offs || 0;
    const totalWriteOffs = Math.max(0, rawWriteOffs);
    const totalAdvance = supplier.advance_balance;
    const totalPaid = Math.max(0, supplier.total_purchases - supplier.outstanding_due - rawWriteOffs);
    const totalOrdersCount = supplier.purchase_orders?.length || 0;

    const lastPayment = payments.length > 0 ? payments[0] : null;
    const lastPaymentText = lastPayment
        ? `₹${lastPayment.total_amount.toLocaleString('en-IN')} (on ${new Date(lastPayment.paid_at).toLocaleDateString('en-IN')})`
        : "No payments yet";

    // Smart Address Builder (ignores null/empty values)
    const addressParts = [
        supplier.address,
        supplier.city,
        supplier.state_code,
        supplier.pincode,
        supplier.country
    ].filter(Boolean);
    const fullAddress = addressParts.length > 0 ? addressParts.join(', ') : null;

    // Format Phone
    const fullPhone = supplier.phone ? `${supplier.country_code || '+91'} ${supplier.phone}` : null;

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

                {/* LEFT: IDENTITY (Span 1 on large screens) */}
                <div className="xl:col-span-1 flex flex-col gap-4">
                    <div className="flex items-center gap-4">
                        <div className="h-14 w-14 shrink-0 bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 rounded-2xl flex items-center justify-center">
                            {supplier.company_name ? <Building2 className="h-7 w-7" /> : <User className="h-7 w-7" />}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{supplier.name}</h2>
                            {supplier.company_name && <p className="text-sm text-slate-500 dark:text-slate-400">{supplier.company_name}</p>}

                            <div className="flex flex-wrap gap-2 mt-1.5">
                                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                    Vendor
                                </span>
                                {supplier.payment_terms && (
                                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                        Terms: {supplier.payment_terms}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Compact Contact Info */}
                    <div className="space-y-2 mt-2">
                        {fullPhone && (
                            <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                                <Phone className="h-4 w-4 text-amber-500" /> {fullPhone}
                            </div>
                        )}
                        {supplier.email && (
                            <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400 break-all">
                                <Mail className="h-4 w-4 text-amber-500" /> {supplier.email}
                            </div>
                        )}
                        {fullAddress && (
                            <div className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-400">
                                <MapPin className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" /> <span className="leading-relaxed">{fullAddress}</span>
                            </div>
                        )}
                        {supplier.gstin && (
                            <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                                <FileText className="h-4 w-4 text-amber-500 shrink-0" />
                                <span>GST: <span className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-200 ml-1">{supplier.gstin}</span></span>
                            </div>
                        )}
                    </div>

                    {/* Internal Notes */}
                    {supplier.notes && (
                        <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-100 dark:border-amber-900/30">
                            <p className="text-xs font-bold text-amber-800 dark:text-amber-500 uppercase mb-1 flex items-center gap-1.5">
                                <StickyNote className="h-3 w-3" /> Notes
                            </p>
                            <p className="text-sm text-amber-900 dark:text-amber-200/80 leading-relaxed whitespace-pre-wrap font-medium">
                                {supplier.notes}
                            </p>
                        </div>
                    )}
                </div>

                {/* RIGHT: STATS (Span 2) */}
                <div className="xl:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-3">
                    <StatCard
                        label="Total Purchases"
                        value={`₹${supplier.total_purchases.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    />
                    <StatCard
                        label="Outstanding Payable"
                        value={`₹${supplier.outstanding_due.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        highlight={supplier.outstanding_due > 0}
                    />
                    <StatCard
                        label="Total Paid"
                        value={`₹${totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        isSuccess={true}
                    />
                    <StatCard
                        label="Total Write-offs"
                        value={`₹${totalWriteOffs.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        highlight={totalWriteOffs > 0}
                    />
                    <StatCard
                        label="Purchase Orders"
                        value={totalOrdersCount.toString()}
                    />
                    <StatCard label="Total Advance" value={`₹${totalAdvance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} highlight={totalAdvance > 0} />
                    <StatCard label="Last Payment" value={lastPaymentText} colSpan={2} />
                </div>
            </div>
        </div>
    );
}

function StatCard({ label, value, highlight, isSuccess, colSpan = 1 }: { label: string, value: string, highlight?: boolean, isSuccess?: boolean, colSpan?: number }) {

    // Determine dynamic text colors
    let valueColorClass = "text-slate-900 dark:text-white";
    if (highlight) valueColorClass = "text-red-600 dark:text-red-400";
    if (isSuccess) valueColorClass = "text-emerald-700 dark:text-emerald-400";

    return (
        <div className={`p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/50 ${colSpan === 2 ? 'md:col-span-2' : ''}`}>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
            <p className={`text-lg font-black ${valueColorClass}`}>{value}</p>
        </div>
    )
}
