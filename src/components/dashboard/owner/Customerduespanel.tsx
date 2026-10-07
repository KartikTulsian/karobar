"use client";

import { Users } from 'lucide-react'
import { useCustomers } from '@/hooks/usePeople'
import { useTenantStore } from '@/store/useTenantStore'
import DuesPanel, { toAmount } from './Duespanel'

export default function CustomerDuesPanel() {
  const tenantId = useTenantStore(s => s.activeTenant?.tenantId) || ""
  const { data: customers, isLoading, isError, refetch } = useCustomers(tenantId)

  const rows = (customers ?? []).map(c => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    due: toAmount(c.outstanding_due), // handles null / string / NaN
  }))

  return (
    <DuesPanel
      title="Customer Dues"
      icon={Users}
      iconClassName="text-orange-500"
      nameHeader="Customer"
      rows={rows}
      isLoading={isLoading}
      isError={isError}
      onRetry={() => refetch()}
      emptyText="No customer dues. All settled!"
      viewAllHref="/people/customers" // adjust to your route
    />
  )
}