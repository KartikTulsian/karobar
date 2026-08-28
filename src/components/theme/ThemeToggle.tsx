"use client";

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';


export default function ThemeToggle() {
    const { theme, setTheme } = useTheme();
  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="relative p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
      title="Toggle Theme"
    >
      {/* Sun icon shows in dark mode, rotates away in light mode */}
      <Sun className="h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      {/* Moon icon shows in light mode, rotates away in dark mode */}
      <Moon className="absolute left-2 top-2 h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
    </button>
  )
}
