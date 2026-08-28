"use client";

import { useIsMutating } from "@tanstack/react-query";

export default function GlobalMutationLoader() {
  const isMutating = useIsMutating();

  if (isMutating === 0) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-md">
      {/* Inner Glass Card */}
      <div className="relative flex flex-col items-center justify-center w-64 p-8 overflow-hidden bg-white/90 shadow-2xl rounded-3xl dark:bg-slate-900/90 ring-1 ring-slate-900/5 dark:ring-white/10 backdrop-blur-xl">
        
        {/* Subtle Background Glow (Light Bloom) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-blue-500/20 rounded-full blur-2xl"></div>

        {/* Custom Premium Spinner */}
        <div className="relative flex items-center justify-center w-14 h-14 mb-5">
          {/* Track Ring */}
          <div className="absolute inset-0 rounded-full border-[3px] border-slate-100 dark:border-slate-800"></div>
          {/* Spinning Ring */}
          <div className="absolute inset-0 rounded-full border-[3px] border-blue-600 border-t-transparent animate-spin"></div>
          {/* Inner Pulsing Dot */}
          <div className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-pulse"></div>
        </div>

        {/* Typography */}
        <h3 className="text-[11px] font-bold tracking-[0.2em] uppercase text-slate-800 dark:text-slate-100">
          Processing
        </h3>
        <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400 text-center">
          Please Wait...
        </p>
      </div>
    </div>
  );
}