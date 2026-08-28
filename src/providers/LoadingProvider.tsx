"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { Loader2 } from "lucide-react";

interface LoadingContextType {
  isLoading: boolean;
  showLoader: (message?: string) => void;
  hideLoader: () => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("Processing...");

  // Call this to block the screen
  const showLoader = (msg = "Processing...") => {
    setMessage(msg);
    setIsLoading(true);
  };

  // Call this to unblock the screen
  const hideLoader = () => {
    setIsLoading(false);
  };

  return (
    <LoadingContext.Provider value={{ isLoading, showLoader, hideLoader }}>
      {children}

      {/* The Global Blocker Overlay */}
      {isLoading && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/30 backdrop-blur-sm transition-all duration-300">
          <div className="flex flex-col items-center justify-center rounded-2xl bg-white/95 px-8 py-6 shadow-2xl ring-1 ring-slate-900/5 dark:bg-slate-900/95 dark:ring-white/10">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-500" />
            <p className="mt-4 text-sm font-semibold tracking-wide text-slate-700 dark:text-slate-200">
              {message}
            </p>
          </div>
        </div>
      )}
    </LoadingContext.Provider>
  );
}

// Custom hook to use the loader anywhere
export function useLoading() {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error("useLoading must be used within a LoadingProvider");
  }
  return context;
}