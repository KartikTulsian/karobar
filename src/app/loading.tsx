export default function GlobalLoading() {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/20 backdrop-blur-sm">
      {/* Sleek Floating Pill */}
      <div className="relative flex items-center gap-4 px-6 py-4 bg-white/80 shadow-xl rounded-full dark:bg-slate-900/80 ring-1 ring-black/5 dark:ring-white/10 backdrop-blur-xl">
        
        {/* Sleek Dual-Speed Spinner */}
        <div className="relative w-6 h-6">
          <div className="absolute inset-0 rounded-full border-2 border-slate-200 dark:border-slate-700"></div>
          {/* Outer fast spin */}
          <div className="absolute inset-0 rounded-full border-2 border-indigo-600 border-r-transparent border-b-transparent animate-spin"></div>
        </div>

        {/* Minimal Typography */}
        <h3 className="text-xs font-bold tracking-widest uppercase text-slate-700 dark:text-slate-300 pr-2">
          Loading
        </h3>
      </div>
    </div>
  );
}