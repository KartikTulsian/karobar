;
import Table from '@/components/common/Table';
import { SalesReportItem } from '@/types/reports';

interface SalesDataTableProps {
    data: SalesReportItem[];
}

export default function SalesDataTable({ data }: SalesDataTableProps) {
    
    const columns = [
        { header: "SKU", accessor: "sku", sortable: true },
        { header: "Product Name", accessor: "productName", sortable: true },
        { header: "Brand", accessor: "brand", sortable: true, className: "hidden sm:table-cell" },
        { header: "Category", accessor: "category", sortable: true, className: "hidden md:table-cell" },
        { header: "Sold Qty", accessor: "soldQty", sortable: true, className: "text-center" },
        { header: "Sold Amount", accessor: "soldAmount", sortable: true, className: "text-right" },
        { header: "Instock Qty", accessor: "inStockQty", sortable: true, className: "text-center hidden lg:table-cell" },
    ];

    const renderRow = (item: SalesReportItem) => (
        <tr
            key={item.id}
            className="cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
        >
            <td className="px-5 py-4 font-mono text-xs whitespace-nowrap text-gray-500 dark:text-gray-400">
                {item.sku}
            </td>
            <td className="px-5 py-4 text-sm font-medium text-gray-900 dark:text-white">
                {item.productName}
            </td>
            <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300 hidden sm:table-cell">
                {item.brand}
            </td>
            <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300 hidden md:table-cell">
                {item.category}
            </td>
            <td className="px-5 py-4 text-center">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                    {item.soldQty}
                </span>
            </td>
            <td className="px-5 py-4 text-right font-medium text-gray-900 dark:text-white">
                ₹{item.soldAmount.toFixed(2)}
            </td>
            <td className="px-5 py-4 text-center hidden lg:table-cell">
                 <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                    item.inStockQty > 10 
                    ? 'bg-green-50 text-green-700 ring-green-600/10 dark:bg-green-500/10 dark:text-green-400'
                    : 'bg-red-50 text-red-700 ring-red-600/10 dark:bg-red-500/10 dark:text-red-400'
                }`}>
                    {item.inStockQty}
                </span>
            </td>
        </tr>
    );

    return (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800 transition-colors">
            <div className="border-b border-gray-200 p-5 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Item Sales Breakdown</h3>
            </div>
            
            {data.length === 0 ? (
                <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                    No sales recorded for the selected filters.
                </div>
            ) : (
                <Table columns={columns} renderRow={renderRow} data={data} />
            )}
        </div>
    );
}