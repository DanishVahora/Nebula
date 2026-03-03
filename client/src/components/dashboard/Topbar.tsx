import { useAuth } from "@/contexts/AuthContext";
import { LogOut, Bell, Zap } from "lucide-react";
import { motion } from "framer-motion";

const roleBadge: Record<string, { color: string; glow: string }> = {
  STUDENT: { color: "bg-green-500/10 text-green-400 border-green-500/20", glow: "shadow-green-500/10" },
  TEACHER: { color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20", glow: "shadow-yellow-500/10" },
  ADMIN: { color: "bg-red-500/10 text-red-400 border-red-500/20", glow: "shadow-red-500/10" },
};

export function Topbar() {
  const { user, logout } = useAuth();
  const badge = roleBadge[user?.role || "STUDENT"] || roleBadge.STUDENT;

  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-white/[0.06] bg-[#030303]/80 px-6 backdrop-blur-xl"
    >
      <div className="flex items-center gap-2.5">
        <Zap className="h-3.5 w-3.5 text-yellow-500" />
        <h2 className="text-sm font-medium text-zinc-400">Student Dashboard</h2>
      </div>

      <div className="flex items-center gap-3">
        {/* Notification bell */}
        <button className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.06] text-zinc-500 transition-all duration-200 hover:border-white/[0.12] hover:text-white">
          <Bell className="h-3.5 w-3.5" />
          <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]">
            <span className="h-1 w-1 rounded-full bg-white" />
          </span>
        </button>

        <div className="h-5 w-px bg-white/[0.06]" />

        {/* User section */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            {user?.avatar ? (
              <div className="relative">
                <img src={user.avatar} alt="" className="h-7 w-7 rounded-full border border-white/[0.1] object-cover" />
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#030303] bg-green-500" />
              </div>
            ) : (
              <div className="relative">
                <div className="flex h-7 w-7 items-center justify-center rounded-full border border-white/[0.1] bg-white/[0.05] text-xs font-medium text-white">
                  {user?.name?.[0] || user?.email?.[0] || "U"}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#030303] bg-green-500" />
              </div>
            )}
            <div className="hidden sm:block">
              <p className="text-xs font-medium leading-none text-white">{user?.name || "User"}</p>
              <div className="mt-1">
                <span className={`rounded-full border px-1.5 py-px text-[9px] font-semibold shadow-sm ${badge.color} ${badge.glow}`}>
                  {user?.role || "STUDENT"}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-white/[0.06] px-2.5 text-xs text-zinc-500 transition-all duration-200 hover:border-red-500/30 hover:bg-red-500/5 hover:text-red-400"
          >
            <LogOut className="h-3 w-3" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>
    </motion.header>
  );
}
