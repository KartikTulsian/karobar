"use client";

import { useUserBusinesses } from '@/hooks/usePeople';
import { useTenantStore } from '@/store/useTenantStore';
import { Building2, Check, ChevronsUpDown, PlusCircle, ShieldCheck, Store } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react'

export function ShopSwitcher() {

  const { activeTenant, availableTenants, setActiveTenant, setAvailableTenants } = useTenantStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { data: businesses } = useUserBusinesses();

  useEffect(() => {
    if (!businesses) return;

    setAvailableTenants(businesses);

    if (businesses.length === 0) {
      return;
    }

    if (!activeTenant) {
      setActiveTenant(businesses[0]);
      return;
    }

    if (!businesses.some((tenant) => tenant.tenantId === activeTenant.tenantId)) {
      setActiveTenant(businesses[0]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businesses, setAvailableTenants, setActiveTenant]);

  const otherTenants = availableTenants?.filter(t => t.tenantId !== activeTenant?.tenantId) || [];

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Main Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-1.5 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900/50 dark:hover:bg-slate-800 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
      >
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-indigo-600 text-white shadow-sm">
            <Building2 className="h-4 w-4" />
          </div>
          <div className="flex flex-col text-left text-sm leading-tight truncate">
            <span className="truncate font-bold text-slate-900 dark:text-slate-50">
              {activeTenant?.businessName || "Select Business"}
            </span>
            <span className="truncate text-xs font-medium text-slate-500 flex items-center gap-1">
              <ShieldCheck className="h-3 w-3 text-emerald-500" />
              Role: {activeTenant?.role || 'None'}
            </span>
          </div>
        </div>
        <ChevronsUpDown className="h-4 w-4 text-slate-400 shrink-0 ml-1 mr-1" />
      </button>

      {/* Interactive Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-full min-w-[240px] rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-950 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-2">
            <div className="px-2 py-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Your Businesses
            </div>

            <div className="mt-1 flex flex-col gap-1 max-h-64 overflow-y-auto">
              {/* The active tenant (shown as selected) */}
              {activeTenant && (
                <button className="flex w-full items-center justify-between rounded-md bg-indigo-50 dark:bg-indigo-900/20 px-2 py-2 text-sm text-indigo-900 dark:text-indigo-100 cursor-default">
                  <div className="flex items-center gap-2 truncate">
                    <Store className="h-4 w-4 text-indigo-500" />
                    <span className="truncate font-semibold">{activeTenant.businessName}</span>
                  </div>
                  <Check className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                </button>
              )}

              {/* Other available tenants */}
              {otherTenants.length > 0 ? (
                otherTenants.map((tenant) => (
                  <button
                    key={tenant.tenantId}
                    onClick={() => {
                      setActiveTenant(tenant);
                      setIsOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Store className="h-4 w-4 text-slate-400" />
                    <span className="truncate">{tenant.businessName}</span>
                  </button>
                ))
              ) : (
                <div className="px-2 py-4 text-sm text-slate-500 dark:text-slate-400 italic text-center border-t border-slate-100 dark:border-slate-800/60 mt-1">
                  No other shops present.
                </div>
              )}
            </div>
          </div>

          {/* Add New Shop Button */}
          <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-2">
            <Link
              href="/onboarding/tenant"
              onClick={() => setIsOpen(false)}
              className="flex w-full items-center justify-center gap-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-2 text-sm text-slate-700 dark:text-slate-300 hover:border-indigo-500 hover:text-indigo-600 dark:hover:border-indigo-500 dark:hover:text-indigo-400 transition-colors shadow-sm"
            >
              <PlusCircle className="h-4 w-4" />
              <span className="font-semibold">Register New Shop</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
