import Table from '@/components/common/Table';
import { GSTDashboardData, GSTSummaryRow, GSTHsnSummaryRow, SupplierItcAuditRow } from '@/types/finance';

interface GstDataTablesProps {
    data: GSTDashboardData;
    viewMode: 'overview' | 'hsn' | 'suppliers';
}

export default function GstDataTables({ data, viewMode }: GstDataTablesProps) {

    const formatVal = (val: number) => {
        const formatted = Math.abs(val).toFixed(2);
        return val < 0 ? `-₹${formatted}` : `₹${formatted}`;
    }

    // ==========================================
    // 1. GSTR-3B OVERVIEW TABLE
    // ==========================================
    const overviewColumns = [
        { header: "Description", accessor: "description" },
        { header: "Records", accessor: "record_count", className: "text-center" },
        { header: "Taxable Value", accessor: "taxable_value", className: "text-right" },
        { header: "CGST", accessor: "cgst", className: "text-right text-slate-500" },
        { header: "SGST", accessor: "sgst", className: "text-right text-slate-500" },
        { header: "IGST", accessor: "igst", className: "text-right text-slate-500" },
        { header: "Total Tax", accessor: "total_tax", className: "text-right font-bold" },
    ];

    const renderOverviewRow = (row: GSTSummaryRow) => (
        <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
            <td className="px-5 py-4 font-medium text-slate-900 dark:text-white whitespace-nowrap">{row.description}</td>
            <td className="px-5 py-4 text-center"><span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">{row.record_count}</span></td>
            <td className="px-5 py-4 text-right font-medium text-slate-700 dark:text-slate-300">{formatVal(row.taxable_value)}</td>
            <td className="px-5 py-4 text-right text-slate-500 dark:text-slate-400">{formatVal(row.cgst)}</td>
            <td className="px-5 py-4 text-right text-slate-500 dark:text-slate-400">{formatVal(row.sgst)}</td>
            <td className="px-5 py-4 text-right text-slate-500 dark:text-slate-400">{formatVal(row.igst)}</td>
            <td className={`px-5 py-4 text-right font-semibold whitespace-nowrap ${row.total_tax < 0 ? 'text-red-500' : 'text-emerald-600'}`}>{formatVal(row.total_tax)}</td>
        </tr>
    );

    // ==========================================
    // 2. HSN SUMMARY (GSTR-1 TABLE 12)
    // ==========================================
    const hsnColumns = [
        { header: "HSN / SAC", accessor: "hsn_code" },
        { header: "Qty", accessor: "total_qty", className: "text-center" },
        { header: "Unit", accessor: "unit", className: "text-center" },
        { header: "Rate %", accessor: "gst_rate", className: "text-center" },
        { header: "Taxable Value", accessor: "taxable_value", className: "text-right" },
        { header: "Total Tax", accessor: "total_tax", className: "text-right font-semibold text-emerald-600" },
    ];

    const renderHsnRow = (row: GSTHsnSummaryRow) => (
        <tr key={`hsn-${row.hsn_code}-${row.gst_rate}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
            <td className="px-5 py-4 font-medium text-slate-900 dark:text-white">{row.hsn_code}</td>
            <td className="px-5 py-4 text-center text-sm">{row.total_qty.toFixed(2)}</td>
            <td className="px-5 py-4 text-center text-xs uppercase text-slate-500">{row.unit}</td>
            <td className="px-5 py-4 text-center text-sm">{row.gst_rate}%</td>
            <td className="px-5 py-4 text-right text-sm text-slate-700 dark:text-slate-300">{formatVal(row.taxable_value)}</td>
            <td className="px-5 py-4 text-right text-sm font-semibold text-emerald-600 dark:text-emerald-400">{formatVal(row.total_tax)}</td>
        </tr>
    );

    // ==========================================
    // 3. SUPPLIER ITC AUDIT (GSTR-2B)
    // ==========================================
    const supplierColumns = [
        { header: "Supplier Name", accessor: "supplier_name" },
        { header: "GSTIN", accessor: "gstin" },
        { header: "PO Count", accessor: "po_count", className: "text-center" },
        { header: "Purchases (Taxable)", accessor: "taxable_value", className: "text-right" },
        { header: "Claimed ITC", accessor: "total_itc", className: "text-right font-semibold text-blue-600" },
    ];

    const renderSupplierRow = (row: SupplierItcAuditRow) => (
        <tr key={row.supplier_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
            <td className="px-5 py-4 font-medium text-slate-900 dark:text-white">{row.supplier_name}</td>
            <td className="px-5 py-4 text-sm text-slate-500">{row.gstin || 'Unregistered'}</td>
            <td className="px-5 py-4 text-center text-sm">{row.po_count}</td>
            <td className="px-5 py-4 text-right text-sm text-slate-700 dark:text-slate-300">{formatVal(row.taxable_value)}</td>
            <td className="px-5 py-4 text-right text-sm font-semibold text-blue-600 dark:text-blue-400">{formatVal(row.total_itc)}</td>
        </tr>
    );

    // ==========================================
    // DYNAMIC RENDER LOGIC
    // ==========================================
    const getTableContent = () => {
        if (viewMode === 'hsn') {
            return (
                <>
                    <div className="border-b border-slate-200 p-5 dark:border-slate-800">
                        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Table 12: HSN/SAC Summary of Outward Supplies</h3>
                    </div>
                    <Table columns={hsnColumns} renderRow={renderHsnRow} data={data.hsn_summary || []} />
                </>
            );
        }

        if (viewMode === 'suppliers') {
            return (
                <>
                    <div className="border-b border-slate-200 p-5 dark:border-slate-800">
                        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">GSTR-2B Audit: Input Tax Credit by Supplier</h3>
                    </div>
                    <Table columns={supplierColumns} renderRow={renderSupplierRow} data={data.supplier_audit || []} />
                </>
            );
        }

        return (
            <>
                <div className="border-b border-slate-200 p-5 dark:border-slate-800">
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">GSTR-3B Details of Outward and Inward Supplies</h3>
                </div>
                <Table columns={overviewColumns} renderRow={renderOverviewRow} data={data.breakdown || []} />
            </>
        );
    };

    return (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 mt-6">
            {getTableContent()}
        </div>
    );
}