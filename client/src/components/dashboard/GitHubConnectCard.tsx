import { motion } from "framer-motion";
import { authAPI } from "@/lib/api";
import { ArrowRight, GitBranch, Shield, Activity, Star, TrendingUp } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

// Fake heatmap data for blurred preview
const fakeWeeks = Array.from({ length: 13 }, () =>
  Array.from({ length: 7 }, () => Math.random())
);

export function GitHubConnectCard() {
  const { isDark } = useTheme();

  const connectGitHub = () => {
    window.location.href = authAPI.githubLinkUrl;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className={`group relative overflow-hidden rounded-2xl border p-6 backdrop-blur-sm transition-all duration-500 ${
        isDark
          ? "border-white/8 bg-white/[0.03] hover:border-white/12 hover:shadow-[0_0_40px_rgba(34,197,94,0.06)]"
          : "border-black/8 bg-white/70 hover:border-black/12 hover:shadow-[0_4px_30px_rgba(0,0,0,0.06)]"
      }`}
    >
      {/* Animated gradient background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-green-500/[0.04] blur-[60px] transition-all duration-700 group-hover:bg-green-500/[0.08]" />
        <div className={`absolute -bottom-20 -left-20 h-48 w-48 rounded-full blur-[60px] transition-all duration-700 ${
          isDark ? "bg-white/[0.02] group-hover:bg-white/[0.04]" : "bg-green-500/[0.02] group-hover:bg-green-500/[0.04]"
        }`} />
        <div className="absolute right-1/4 top-1/2 h-36 w-36 rounded-full bg-yellow-500/[0.02] blur-[60px]" />
      </div>

      <div className="relative">
        {/* GitHub icon with premium badge */}
        <div className="relative inline-flex">
          <div className={`flex h-14 w-14 items-center justify-center rounded-2xl border backdrop-blur-sm transition-all duration-300 ${
            isDark
              ? "border-white/8 bg-white/[0.04] group-hover:border-white/15 group-hover:bg-white/[0.06]"
              : "border-black/8 bg-black/[0.04] group-hover:border-black/12 group-hover:bg-black/[0.06]"
          }`}>
            <svg viewBox="0 0 24 24" className={`h-7 w-7 ${isDark ? "text-white" : "text-black"}`} fill="currentColor">
              <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
            </svg>
          </div>
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 shadow-[0_0_8px_rgba(234,179,8,0.4)]">
            <Star className="h-2.5 w-2.5 text-black" />
          </span>
        </div>

        <h3 className="mt-5 text-base font-bold tracking-tight">Connect GitHub</h3>
        <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">
          Link your account to import repos, track contributions, and visualize your coding activity.
        </p>

        {/* Feature badges */}
        <div className="mt-4 flex flex-wrap gap-2">
          <div className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-semibold ${
            isDark ? "border-green-500/10 bg-green-500/5 text-green-400" : "border-green-200 bg-green-50 text-green-600"
          }`}>
            <GitBranch className="h-2.5 w-2.5" /> Import Repos
          </div>
          <div className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-semibold ${
            isDark ? "border-yellow-500/10 bg-yellow-500/5 text-yellow-400" : "border-yellow-200 bg-yellow-50 text-yellow-600"
          }`}>
            <Activity className="h-2.5 w-2.5" /> Heatmap
          </div>
          <div className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-semibold ${
            isDark ? "border-white/[0.06] bg-white/[0.02] text-zinc-400" : "border-black/[0.06] bg-black/[0.02] text-zinc-500"
          }`}>
            <Shield className="h-2.5 w-2.5" /> Secure
          </div>
        </div>

        {/* Blurred heatmap preview */}
        <div className={`relative mt-5 overflow-hidden rounded-xl border p-3 ${
          isDark ? "border-white/[0.04] bg-white/[0.015]" : "border-black/[0.04] bg-black/[0.015]"
        }`}>
          <div className="flex gap-[3px] blur-[3px]">
            {fakeWeeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]">
                {week.map((val, di) => (
                  <div
                    key={di}
                    className={`h-[9px] w-[9px] rounded-[2px] ${
                      val > 0.8 ? "bg-green-500/70" :
                      val > 0.6 ? "bg-green-500/50" :
                      val > 0.35 ? "bg-green-500/25" :
                      val > 0.15 ? "bg-green-500/10" :
                      isDark ? "bg-white/[0.03]" : "bg-black/[0.03]"
                    }`}
                  />
                ))}
              </div>
            ))}
          </div>
          {/* Overlay */}
          <div className={`absolute inset-0 flex items-center justify-center ${
            isDark ? "bg-gradient-to-b from-transparent via-black/30 to-black/60" : "bg-gradient-to-b from-transparent via-white/40 to-white/70"
          }`}>
            <div className={`flex items-center gap-2 rounded-full border px-3 py-1.5 backdrop-blur-sm ${
              isDark ? "border-white/10 bg-black/60" : "border-black/10 bg-white/80"
            }`}>
              <TrendingUp className="h-3 w-3 text-green-500" />
              <span className={`text-[10px] font-semibold ${isDark ? "text-zinc-300" : "text-zinc-600"}`}>Unlock contribution heatmap</span>
            </div>
          </div>
        </div>

        <button
          onClick={connectGitHub}
          className={`mt-5 flex h-10 w-full items-center justify-center gap-2.5 rounded-xl font-semibold transition-all duration-300 ${
            isDark
              ? "bg-white text-black hover:bg-zinc-100 hover:shadow-[0_0_30px_rgba(255,255,255,0.1)]"
              : "bg-black text-white hover:bg-zinc-800 hover:shadow-[0_4px_20px_rgba(0,0,0,0.15)]"
          }`}
        >
          <span className="text-sm">Connect GitHub</span>
          <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
        </button>
      </div>
    </motion.div>
  );
}
