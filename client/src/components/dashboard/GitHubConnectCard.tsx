import { motion } from "framer-motion";
import { authAPI } from "@/lib/api";
import { ArrowRight, GitBranch, Shield, Zap } from "lucide-react";

export function GitHubConnectCard() {
  const connectGitHub = () => {
    window.location.href = authAPI.githubLinkUrl;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0a0a0a] p-6 transition-all duration-300 hover:border-white/[0.12]"
    >
      {/* Animated gradient background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-green-500/[0.05] blur-3xl transition-all duration-700 group-hover:bg-green-500/[0.1]" />
        <div className="absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-red-500/[0.04] blur-3xl transition-all duration-700 group-hover:bg-red-500/[0.08]" />
        <div className="absolute right-1/4 top-1/2 h-32 w-32 rounded-full bg-yellow-500/[0.03] blur-3xl" />
      </div>

      <div className="relative">
        {/* GitHub icon with pulse ring */}
        <div className="relative inline-flex">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] shadow-xl transition-all duration-300 group-hover:border-white/20 group-hover:bg-white/[0.08]">
            <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="currentColor">
              <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
            </svg>
          </div>
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]">
            <Zap className="h-2.5 w-2.5 text-black" />
          </span>
        </div>

        <h3 className="mt-4 text-base font-bold text-white">Connect GitHub</h3>
        <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">
          Link your GitHub to import repos, track contributions, and sync coding activity.
        </p>

        {/* Features row */}
        <div className="mt-3 flex flex-wrap gap-2">
          <div className="flex items-center gap-1 rounded-full border border-green-500/15 bg-green-500/5 px-2 py-0.5 text-[9px] font-medium text-green-400">
            <GitBranch className="h-2.5 w-2.5" /> Import Repos
          </div>
          <div className="flex items-center gap-1 rounded-full border border-yellow-500/15 bg-yellow-500/5 px-2 py-0.5 text-[9px] font-medium text-yellow-400">
            <Shield className="h-2.5 w-2.5" /> Secure OAuth
          </div>
        </div>

        <button
          onClick={connectGitHub}
          className="mt-5 flex h-9 items-center gap-2 rounded-xl bg-white px-4 text-xs font-semibold text-black shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all duration-200 hover:bg-zinc-100 hover:shadow-[0_0_30px_rgba(255,255,255,0.15)]"
        >
          Connect GitHub
          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
        </button>
      </div>
    </motion.div>
  );
}
