import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { LogOut, Bell, Search, Command, Sun, Moon } from "lucide-react";
import { motion } from "framer-motion";

const roleBadge: Record<string, { dark: string; light: string }> = {
  STUDENT: { dark: "bg-green-500/10 text-green-400 border-green-500/20", light: "bg-green-50 text-green-600 border-green-200" },
  TEACHER: { dark: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20", light: "bg-yellow-50 text-yellow-600 border-yellow-200" },
  ADMIN: { dark: "bg-red-500/10 text-red-400 border-red-500/20", light: "bg-red-50 text-red-600 border-red-200" },
};

export function Topbar() {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const badge = roleBadge[user?.role || "STUDENT"] || roleBadge.STUDENT;

  return (
    <header
      className={`sticky top-0 z-30 flex h-14 items-center justify-between border-b px-8 backdrop-blur-xl transition-colors duration-300 ${
        isDark ? "border-white/8 bg-black/60" : "border-black/8 bg-white/60"
      }`}
    >
      {/* Left: Search bar */}
      <div className="flex items-center gap-3">
        <div
          className={`group flex h-8 w-60 items-center gap-2.5 rounded-lg border px-3 transition-colors ${
            isDark ? "border-white/8 bg-white/[0.03] hover:border-white/12" : "border-black/8 bg-black/[0.03] hover:border-black/12"
          }`}
        >
          <Search className="h-3.5 w-3.5 text-zinc-400" />
          <span className="text-xs text-zinc-400">Search...</span>
          <div
            className={`ml-auto flex items-center gap-1 rounded border px-1.5 py-0.5 ${
              isDark ? "border-white/8 bg-white/[0.04]" : "border-black/8 bg-black/[0.04]"
            }`}
          >
            <Command className="h-2.5 w-2.5 text-zinc-400" />
            <span className="text-[9px] font-medium text-zinc-400">K</span>
          </div>
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-3">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className={`relative flex h-8 w-8 items-center justify-center rounded-lg border transition-all duration-300 ${
            isDark
              ? "border-white/8 text-zinc-400 hover:bg-white/[0.06] hover:text-yellow-400"
              : "border-black/8 text-zinc-500 hover:bg-black/[0.04] hover:text-zinc-700"
          }`}
        >
          <motion.div
            key={isDark ? "moon" : "sun"}
            initial={{ scale: 0, rotate: -90, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            exit={{ scale: 0, rotate: 90, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </motion.div>
        </button>

        {/* Notification bell */}
        <button
          className={`relative flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
            isDark ? "border-white/8 text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200" : "border-black/8 text-zinc-500 hover:bg-black/[0.04] hover:text-zinc-700"
          }`}
        >
          <Bell className="h-4 w-4" />
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-red-500" />
        </button>

        <div className={`h-5 w-px ${isDark ? "bg-white/8" : "bg-black/8"}`} />

        {/* User section */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            {user?.avatar ? (
              <img src={user.avatar} alt="" className={`h-7 w-7 rounded-lg border object-cover ${isDark ? "border-white/10" : "border-black/10"}`} />
            ) : (
              <div className={`flex h-7 w-7 items-center justify-center rounded-lg border text-[11px] font-semibold ${
                isDark ? "border-white/10 bg-white/5 text-zinc-300" : "border-black/10 bg-black/5 text-zinc-600"
              }`}>
                {user?.name?.[0] || user?.email?.[0] || "U"}
              </div>
            )}
            <div className="hidden sm:block">
              <p className="text-[13px] font-medium leading-none">{user?.name || "User"}</p>
              <span className={`mt-1 inline-block rounded border px-1.5 py-px text-[9px] font-semibold uppercase tracking-wider ${isDark ? badge.dark : badge.light}`}>
                {user?.role || "STUDENT"}
              </span>
            </div>
          </div>

          <button
            onClick={logout}
            className={`flex h-8 items-center gap-2 rounded-lg border px-3 text-xs font-medium transition-colors ${
              isDark
                ? "border-white/8 text-zinc-500 hover:border-red-500/20 hover:bg-red-500/5 hover:text-red-400"
                : "border-black/8 text-zinc-500 hover:border-red-500/20 hover:bg-red-50 hover:text-red-500"
            }`}
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
