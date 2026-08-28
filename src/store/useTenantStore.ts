// src/store/useTenantStore.ts
import { ActiveTenantContext } from '@/types/people';
import { create } from 'zustand';

interface TenantState {
  activeTenant: ActiveTenantContext | null;
  availableTenants: ActiveTenantContext[];
  setActiveTenant: (tenant: ActiveTenantContext) => void;
  setAvailableTenants: (tenants: ActiveTenantContext[]) => void;
  clearStore: () => void;
}

export const useTenantStore = create<TenantState>((set) => ({
  activeTenant: null,
  availableTenants: [],
  setActiveTenant: (tenant) => set({ activeTenant: tenant }),
  setAvailableTenants: (tenants) => set({ availableTenants: tenants }),
  clearStore: () => set({ activeTenant: null, availableTenants: [] }),
}));