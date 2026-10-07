"use client";

import { Truck } from 'lucide-react'
import { useSuppliers } from '@/hooks/usePeople'
import { useTenantStore } from '@/store/useTenantStore'
import Duespanel, { toAmount } from './Duespanel'

export default function SupplierDuesPanel() {
  const tenantId = useTenantStore(s => s.activeTenant?.tenantId) || ""
  const { data: suppliers, isLoading, isError, refetch } = useSuppliers(tenantId)
 
  const rows = (suppliers ?? []).map(s => ({
    id: s.id,
    name: s.name,
    phone: s.phone,
    due: toAmount(s.outstanding_due), // handles null / string / NaN
  }))
 
  return (
    <Duespanel
      title="Supplier Dues"
      icon={Truck}
      iconClassName="text-rose-500"
      avatarClassName="bg-rose-100 dark:bg-rose-500/10"
      barClassName="bg-rose-400"
      nameHeader="Supplier"
      rows={rows}
      isLoading={isLoading}
      isError={isError}
      onRetry={() => refetch()}
      emptyText="No supplier dues. You're all paid up!"
      viewAllHref="/people/suppliers" // adjust to your route
    />
  )
}