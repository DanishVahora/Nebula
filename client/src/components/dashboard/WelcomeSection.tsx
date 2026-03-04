import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { motion } from "framer-motion";
import { FolderOpen, ClipboardList, TrendingUp, Zap } from "lucide-react";
import { userAPI } from "@/lib/api";

export function WelcomeSection() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const firstName = user?.name?.split(" ")[0] || "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const [workspaceCount, setWorkspaceCount] = useState<number | null>(null);
  const [pendingCount, setPendingCount] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [wsRes, asRes] = await Promise.all([
          userAPI.getWorkspaces(),
          userAPI.getAssignments(),
        ]);
        setWorkspaceCount(wsRes.data.workspaces.length);
        setPendingCount(
          asRes.data.assignments.filter((a: { status: string }) => a.status === "pending").length
        );
      } catch {
        setWorkspaceCount(0);
        setPendingCount(0);
      }
    })();
  }, []);

  const quickStats = [
    {
      label: "Active Workspaces",
      value: workspaceCount,
      icon: FolderOpen,
      darkColor: "text-green-400",
      lightColor: "text-green-600",
      darkBg: "bg-green-500/10",
      lightBg: "bg-green-50",
      glow: "hover:shadow-[0_0_20px_rgba(34,197,94,0.12)]",
    },
    {
      label: "Pending Tasks",
      value: pendingCount,
      icon: ClipboardList,
      darkColor: "text-yellow-400",
      lightColor: "text-yellow-600",
      darkBg: "bg-yellow-500/10",
      lightBg: "bg-yellow-50",
      glow: "hover:shadow-[0_0_20px_rgba(234,179,8,0.12)]",
    },
    {
      label: "Performance",
      value: "A+",
      icon: TrendingUp,
      darkColor: "text-green-400",
      lightColor: "text-green-600",
      darkBg: "bg-green-500/10",
      lightBg: "bg-green-50",
      glow: "hover:shadow-[0_0_20px_rgba(34,197,94,0.12)]",
    },
    {
      label: "Streak",
      value: "7d",
      icon: Zap,
      darkColor: "text-red-400",
      lightColor: "text-red-600",
      darkBg: "bg-red-500/10",
      lightBg: "bg-red-50",
      glow: "hover:shadow-[0_0_20px_rgba(239,68,68,0.12)]",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {/* Welcome header */}
      <div
        className={`rounded-2xl border p-7 backdrop-blur-sm transition-colors duration-300 ${
          isDark ? "border-white/8 bg-white/[0.03]" : "border-black/8 bg-white/70"
        }`}
      >
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {greeting},{" "}
              <span className="bg-gradient-to-r from-green-400 to-green-500 bg-clip-text text-transparent">
                {firstName}
              </span>
            </h1>
            <p className={`mt-1.5 text-sm ${isDark ? "text-zinc-500" : "text-zinc-500"}`}>
              Here's what's happening in your workspace today.
            </p>
          </div>

          {/* Date badge */}
          <div
            className={`hidden rounded-lg border px-3 py-2 sm:block ${
              isDark ? "border-white/8 bg-white/[0.04]" : "border-black/8 bg-black/[0.03]"
            }`}
          >
            <p className={`text-[11px] font-medium ${isDark ? "text-zinc-500" : "text-zinc-500"}`}>
              {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
            </p>
          </div>
        </div>
      </div>

      {/* Quick stats row */}
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {quickStats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 + i * 0.06 }}
            className={`group rounded-xl border p-4 backdrop-blur-sm transition-all duration-300 ${stat.glow} ${
              isDark
                ? "border-white/8 bg-white/[0.03] hover:border-white/12"
                : "border-black/8 bg-white/70 hover:border-black/12"
            }`}
          >
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${isDark ? stat.darkBg : stat.lightBg}`}>
              <stat.icon className={`h-4 w-4 ${isDark ? stat.darkColor : stat.lightColor}`} />
            </div>
            <p className="mt-3 text-3xl font-bold tracking-tight">
              {stat.value === null ? (
                <span className={`inline-block h-8 w-10 animate-pulse rounded ${isDark ? "bg-white/5" : "bg-black/5"}`} />
              ) : (
                stat.value
              )}
            </p>
            <p className={`mt-0.5 text-[11px] font-medium ${isDark ? "text-zinc-500" : "text-zinc-500"}`}>
              {stat.label}
            </p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
