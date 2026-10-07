import RecentBillsPanel from './RecentBillsPanel'
import OwnerStatsGrid from './OwnerStatsGrid'
import TenantHeader from './TenantHeader'
import LowStockPanel from './LowStockPanel'
import RevenueChart from './RevenueChart'
import Customerduespanel from './Customerduespanel'
import Supplierduespanel from './Supplierduespanel'

export default function OwnerDashboard() {
  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 p-4 sm:p-6 lg:p-8">
 
      {/* Zone 1: Shop Context Header */}
      <TenantHeader />
 
      {/* Zone 2: KPI Stats (4 performance cards + 3 balance/alert cards) */}
      <OwnerStatsGrid />
 
      {/* Zone 3: Revenue chart + Low stock (equal height) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-stretch">
        <div className="lg:col-span-2 [&>*]:h-full">
          <RevenueChart />
        </div>
        <div className="[&>*]:h-full">
          <LowStockPanel />
        </div>
      </div>
 
      {/* Zone 4: Recent bills at full width so invoice numbers and status badges fit without scrolling */}
      <RecentBillsPanel />
 
      {/* Zone 5: Dues */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Customerduespanel />
        <Supplierduespanel />
      </div>
    </div>
  )
}