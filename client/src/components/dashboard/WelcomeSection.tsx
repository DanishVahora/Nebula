import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { Sparkles, Activity, TrendingUp } from "lucide-react";

export function WelcomeSection() {
  const { user } = useAuth();
  const firstName = user?.name?.split(" ")[0] || "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-br from-[#0a0a0a] via-[#0d0d0d] to-[#0a0a0a] p-6"
    >
      {/* Animated gradient blobs */}
      <div className="pointer-events-none absolute -left-20 -top-20 h-40 w-40 rounded-full bg-green-500/[0.04] blur-3xl" />
      <div className="pointer-events-none absolute -right-10 top-0 h-32 w-32 rounded-full bg-red-500/[0.03] blur-3xl" />
      <div className="pointer-events-none absolute -bottom-10 left-1/3 h-28 w-28 rounded-full bg-yellow-500/[0.03] blur-3xl" />

      <div className="relative flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-white">
              {greeting}, {firstName}
            </h1>
            <motion.div
              animate={{ rotate: [0, 14, -8, 14, -4, 10, 0] }}
              transition={{ duration: 2, delay: 0.5 }}
            >
              <Sparkles className="h-4 w-4 text-yellow-500" />
            </motion.div>
          </div>
          <p className="mt-1.5 text-sm text-zinc-500">
            Here's what's happening in your workspace today.
          </p>

          {/* Quick stats row */}
          <div className="mt-4 flex items-center gap-4">
            <div className="flex items-center gap-1.5 rounded-lg border border-green-500/10 bg-green-500/5 px-2.5 py-1">
              <Activity className="h-3 w-3 text-green-400" />
              <span className="text-[10px] font-medium text-green-400">Active</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg border border-yellow-500/10 bg-yellow-500/5 px-2.5 py-1">
              <TrendingUp className="h-3 w-3 text-yellow-400" />
              <span className="text-[10px] font-medium text-yellow-400">On track</span>
            </div>
          </div>
        </div>

        {/* Date badge */}
        <div className="hidden rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-2 sm:block">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
            {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
