import { PaymentBatchSummary } from '@/types/finance';
import { CustomerProfileData } from '@/types/people'
import { Building2, FileText, Mail, MapPin, Phone, StickyNote, User } from 'lucide-react';

export default function CustomerDetailsCard({ customer, payments, showProfit = false }: { customer: CustomerProfileData, payments: PaymentBatchSummary[], showProfit?: boolean }) {

    const isFlying = customer.type === 'flying';

    const rawWriteOffs = customer.total_write_offs || 0;
    const totalWriteOffs = Math.max(0, rawWriteOffs);
    const totalAdvance = customer.advance_balance;

    const totalPaid = Math.max(0, customer.total_purchases - customer.outstanding_due - rawWriteOffs);
    const totalBillsCount = customer.bills?.length || 0;
    // const avgPayment = customer.visit_count > 0 ? (customer.total_purchases / customer.visit_count) : 0;

    const globalTotalProfit = customer.bills?.reduce((sum, bill) => sum + (bill.total_profit || 0), 0) || 0;

    const lastPayment = payments.length > 0 ? payments[0] : null;
    const lastPaymentText = lastPayment 
        ? `₹${lastPayment.total_amount.toLocaleString('en-IN')} (on ${new Date(lastPayment.paid_at).toLocaleDateString('en-IN')})`
        : "No payments yet";

    const addressParts = [
        customer.address, 
        customer.city, 
        customer.state_code, 
        customer.pincode, 
        customer.country
    ].filter(Boolean);
    const fullAddress = addressParts.join(', ');

    const fullPhone = customer.phone ? `${customer.country_code || '+91'} ${customer.phone}` : null;

    const lastVisited = customer.last_purchase_at 
        ? new Date(customer.last_purchase_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) 
        : 'First Visit';

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                
                {/* LEFT: IDENTITY (Span 1 on large screens) */}
                <div className="xl:col-span-1 flex flex-col gap-4">
                    <div className="flex items-center gap-4">
                        <div className="h-14 w-14 shrink-0 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 rounded-2xl flex items-center justify-center">
                            {customer.company_name ? <Building2 className="h-7 w-7" /> : <User className="h-7 w-7" />}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{customer.name}</h2>
                            {customer.company_name && <p className="text-sm text-slate-500">{customer.company_name}</p>}
                            <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                {customer.type}
                            </span>
                        </div>
                    </div>

                    {/* Compact Contact Info */}
                    <div className="space-y-2 mt-2">
                        {fullPhone && <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400"><Phone className="h-4 w-4 text-indigo-400" /> {fullPhone}</div>}
                        {customer.email && <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400"><Mail className="h-4 w-4 text-indigo-400" /> {customer.email}</div>}
                        {fullAddress && <div className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-400"><MapPin className="h-4 w-4 text-indigo-400 mt-0.5" /> {fullAddress}</div>}
                        {customer.gstin && (
                            <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                                <FileText className="h-4 w-4 text-amber-500 shrink-0" /> 
                                <span>GST: <span className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-200 ml-1">{customer.gstin}</span></span>
                            </div>
                        )}
                    </div>

                    {customer.notes && (
                        <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-100 dark:border-amber-900/30">
                            <p className="text-xs font-bold text-amber-800 dark:text-amber-500 uppercase mb-1 flex items-center gap-1.5"><StickyNote className="h-3 w-3"/> Notes</p>
                            <p className="text-sm text-amber-900 dark:text-amber-200">{customer.notes}</p>
                        </div>
                    )}
                </div>

                {/* RIGHT: STATS (Span 2) */}
                <div className="xl:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-3">
                    <StatCard label="Total Purchases" value={`₹${customer.total_purchases.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
                    <StatCard label="Outstanding" value={`₹${customer.outstanding_due.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} highlight={customer.outstanding_due > 0} />
                    <StatCard label="Visits" value={customer.visit_count.toString()} />
                    {/* <StatCard label="Payment Circulation" value={avgPayment.toFixed(2).toString()} /> */}
                    <StatCard label="Invoices" value={totalBillsCount.toString()} />
                    {!isFlying && (
                        <>
                            <StatCard label="Total Paid" value={`₹${totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} isSuccess={true}/>
                            {showProfit ? (
                                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/30 flex flex-col justify-center animate-in fade-in zoom-in-95 duration-200">
                                    <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-500 uppercase tracking-wider mb-1">Total Net Profit</p>
                                    <p className="text-lg font-black text-emerald-700 dark:text-emerald-400">
                                        ₹{globalTotalProfit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </p>
                                </div>
                            ) : (
                                <StatCard label="Total Advance" value={`₹${totalAdvance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} highlight={totalAdvance > 0} />
                            )}
                            <StatCard label="Credit Limit" value={`₹${customer.credit_limit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
                            <StatCard label="Total Write-offs" value={`₹${totalWriteOffs.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} highlight={totalWriteOffs > 0} />
                            
                            <StatCard label="Last Visited" value={lastVisited} />
                            <StatCard label="Last Payment" value={lastPaymentText} colSpan={2} />
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

// function StatCard({ label, value, highlight, colSpan = 1 }: { label: string, value: string, highlight?: boolean, colSpan?: number }) {
//     return (
//         <div className={`p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 ${colSpan === 2 ? 'md:col-span-2' : ''}`}>
//             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
//             <p className={`text-lg font-black ${highlight ? 'text-red-600' : 'text-slate-900 dark:text-white'}`}>{value}</p>
//         </div>
//     )
// }

function StatCard({ label, value, highlight, isSuccess, colSpan = 1 }: { label: string, value: string, highlight?: boolean, isSuccess?: boolean, colSpan?: number }) {
    
    // Determine dynamic text colors
    let valueColorClass = "text-slate-900 dark:text-white";
    if (highlight) valueColorClass = "text-red-600 dark:text-red-400";
    if (isSuccess) valueColorClass = "text-emerald-700 dark:text-emerald-400";

    return (
        <div className={`p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/50 flex flex-col justify-center ${colSpan === 2 ? 'md:col-span-2' : ''}`}>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
            <p className={`text-lg font-black ${valueColorClass}`}>{value}</p>
        </div>
    )
}