import RecentBillsPanel from './RecentBillsPanel'
import OwnerStatsGrid from './OwnerStatsGrid'
import TenantHeader from './TenantHeader'
import LowStockPanel from './LowStockPanel'
import RevenueChart from './RevenueChart'

export default function OwnerDashboard() {
  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      
      {/* Zone 1: Shop Context Header */}
      <TenantHeader />
      
      {/* Zone 2: KPI Stats Grid */}
      <OwnerStatsGrid />

      {/* Zone 3: Main Data Panels */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        
        {/* Revenue Chart (Takes 2/3 of space on desktop) */}
        <div className="lg:col-span-2">
           <RevenueChart />
        </div>

        {/* Actionable Lists (Takes 1/3 of space on desktop) */}
        <div className="flex flex-col gap-6">
          <RecentBillsPanel />
          <LowStockPanel />
        </div>
        
      </div>
    </div>
  )
}
