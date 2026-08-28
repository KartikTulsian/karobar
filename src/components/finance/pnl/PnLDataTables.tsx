import Table from "@/components/common/Table";
import { BillProfitability, CustomerProfitability, ItemProfitability, PnLDashboardData } from "@/types/finance";

interface PnLDataTablesProps {
    data: PnLDashboardData;
    viewMode: 'overview' | 'items' | 'entities';
}

export default function PnLDataTables({ data, viewMode }: PnLDataTablesProps) {

    // Helper formatter
    const fmt = (num: number) => `₹${num.toFixed(2)}`;

    // ==========================================
    // 1. BILL LEVEL (Overview Mode)
    // ==========================================
    const billColumns = [
        { header: "Date", accessor: "bill_date" },
        { header: "Bill No", accessor: "bill_number" },
        { header: "Customer", accessor: "customer_name" },
        { header: "Revenue", accessor: "revenue", className: "text-right" },
        { header: "COGS", accessor: "cogs", className: "text-right text-orange-500" },
        { header: "Gross Profit", accessor: "profit", className: "text-right font-semibold" },
        { header: "Margin %", accessor: "margin_pct", className: "text-right" },
    ];

    const renderBillRow = (row: BillProfitability) => (
        <tr key={row.bill_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20">
            <td className="px-5 py-4 text-xs">{row.bill_date}</td>
            <td className="px-5 py-4 font-mono text-xs text-indigo-600">{row.bill_number}</td>
            <td className="px-5 py-4 text-sm">{row.customer_name}</td>
            <td className="px-5 py-4 text-right text-sm">{fmt(row.revenue)}</td>
            <td className="px-5 py-4 text-right text-sm text-orange-500">{fmt(row.cogs)}</td>
            <td className="px-5 py-4 text-right text-sm font-semibold">{fmt(row.profit)}</td>
            <td className="px-5 py-4 text-right text-sm">
                <span className={`px-2 py-1 rounded-md text-xs font-medium ${row.margin_pct > 30 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                    {row.margin_pct.toFixed(1)}%
                </span>
            </td>
        </tr>
    );

    // ==========================================
    // 2. ITEM LEVEL (Products Mode)
    // ==========================================
    const itemColumns = [
        { header: "Product Name", accessor: "item_name" },
        { header: "Units Sold", accessor: "units_sold", className: "text-center" },
        { header: "Total Revenue", accessor: "total_revenue", className: "text-right" },
        { header: "Total COGS", accessor: "total_cost", className: "text-right text-orange-500" },
        { header: "Total Profit", accessor: "total_profit", className: "text-right font-semibold" },
        { header: "Avg Margin", accessor: "margin_pct", className: "text-right" },
    ];

    const renderItemRow = (row: ItemProfitability) => (
        <tr key={row.item_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20">
            <td className="px-5 py-4 text-sm font-medium">{row.item_name}</td>
            <td className="px-5 py-4 text-center text-sm">{row.units_sold}</td>
            <td className="px-5 py-4 text-right text-sm">{fmt(row.total_revenue)}</td>
            <td className="px-5 py-4 text-right text-sm text-orange-500">{fmt(row.total_cost)}</td>
            <td className="px-5 py-4 text-right text-sm font-semibold text-emerald-600">{fmt(row.total_profit)}</td>
            <td className="px-5 py-4 text-right text-sm">{row.margin_pct.toFixed(1)}%</td>
        </tr>
    );

    // ==========================================
    // 3. CUSTOMER LEVEL (Entities Mode)
    // ==========================================
    const customerColumns = [
        { header: "Customer Name", accessor: "customer_name" },
        { header: "Type", accessor: "customer_type" },
        { header: "Total Bills", accessor: "bill_count", className: "text-center" },
        { header: "Lifetime Value (Revenue)", accessor: "total_revenue", className: "text-right" },
        { header: "Gross Profit", accessor: "total_profit", className: "text-right font-semibold" },
    ];

    const renderCustomerRow = (row: CustomerProfitability) => (
        <tr key={row.customer_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20">
            <td className="px-5 py-4 text-sm font-medium">{row.customer_name}</td>
            <td className="px-5 py-4 text-xs uppercase tracking-wider text-slate-500">{row.customer_type}</td>
            <td className="px-5 py-4 text-center text-sm">{row.bill_count}</td>
            <td className="px-5 py-4 text-right text-sm">{fmt(row.total_revenue)}</td>
            <td className="px-5 py-4 text-right text-sm font-semibold text-emerald-600">{fmt(row.total_profit)}</td>
        </tr>
    );

    // ==========================================
    // DYNAMIC RENDER LOGIC (Bypassing TS Union Conflicts)
    // ==========================================
    const getTableContent = () => {
        if (viewMode === 'items') {
            return (
                <>
                    <div className="border-b border-slate-200 p-5 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Product Profitability Matrix</h3>
                    </div>
                    <Table columns={itemColumns} renderRow={renderItemRow} data={data.tables.itemLevel} />
                </>
            );
        } 
        
        if (viewMode === 'entities') {
            return (
                <>
                    <div className="border-b border-slate-200 p-5 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Customer Lifetime Value & Margins</h3>
                    </div>
                    <Table columns={customerColumns} renderRow={renderCustomerRow} data={data.tables.customerLevel} />
                </>
            );
        }

        return (
            <>
                <div className="border-b border-slate-200 p-5 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Bill-Level Profitability (Gross)</h3>
                </div>
                <Table columns={billColumns} renderRow={renderBillRow} data={data.tables.billLevel} />
            </>
        );
    };

    return (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 mt-6">
            {getTableContent()}
        </div>
    );
}