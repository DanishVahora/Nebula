import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  GitFork,
  Star,
  Users,
  BookOpen,
  ExternalLink,
  Lock,
  Globe,
  RefreshCw,
  Unlink,
  TrendingUp,
  Activity,
  Code2,
  Download,
} from "lucide-react";
import { githubAPI, authAPI } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";

interface GitHubStats {
  totalRepos: number;
  followers: number;
  following: number;
  totalStars: number;
  totalForks: number;
  topLanguages: { name: string; count: number }[];
  recentRepos: {
    id: number;
    name: string;
    fullName: string;
    description: string | null;
    isPrivate: boolean;
    htmlUrl: string;
    language: string | null;
    stars: number;
    forks: number;
    updatedAt: string;
  }[];
  contributions: Record<string, number>;
  profile: {
    login: string;
    name: string;
    avatar: string;
    bio: string;
  };
}

const langColors: Record<string, { bg: string; text: string; bar: string }> = {
  TypeScript: { bg: "bg-blue-500/10", text: "text-blue-400", bar: "bg-blue-500" },
  JavaScript: { bg: "bg-yellow-500/10", text: "text-yellow-400", bar: "bg-yellow-500" },
  Python: { bg: "bg-green-500/10", text: "text-green-400", bar: "bg-green-500" },
  Rust: { bg: "bg-orange-500/10", text: "text-orange-400", bar: "bg-orange-500" },
  Go: { bg: "bg-cyan-500/10", text: "text-cyan-400", bar: "bg-cyan-500" },
  Java: { bg: "bg-red-500/10", text: "text-red-400", bar: "bg-red-500" },
  "C++": { bg: "bg-pink-500/10", text: "text-pink-400", bar: "bg-pink-500" },
  C: { bg: "bg-zinc-500/10", text: "text-zinc-400", bar: "bg-zinc-500" },
  Ruby: { bg: "bg-red-600/10", text: "text-red-500", bar: "bg-red-600" },
  HTML: { bg: "bg-orange-600/10", text: "text-orange-500", bar: "bg-orange-600" },
  CSS: { bg: "bg-purple-500/10", text: "text-purple-400", bar: "bg-purple-500" },
  Shell: { bg: "bg-emerald-500/10", text: "text-emerald-400", bar: "bg-emerald-500" },
  PHP: { bg: "bg-indigo-500/10", text: "text-indigo-400", bar: "bg-indigo-500" },
  Kotlin: { bg: "bg-violet-500/10", text: "text-violet-400", bar: "bg-violet-500" },
};

const defaultLang = { bg: "bg-zinc-500/10", text: "text-zinc-400", bar: "bg-zinc-500" };

// ─── Contribution Heatmap ──────────────────────────────
function ContributionHeatmap({ contributions }: { contributions: Record<string, number> }) {
  const { isDark } = useTheme();

  const { weeks } = useMemo(() => {
    const result: { date: string; count: number }[][] = [];
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 91);

    let currentWeek: { date: string; count: number }[] = [];
    let max = 0;

    for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().slice(0, 10);
      const dayOfWeek = d.getDay();
      const count = contributions[dateStr] || 0;
      if (count > max) max = count;

      if (dayOfWeek === 0 && currentWeek.length > 0) {
        result.push(currentWeek);
        currentWeek = [];
      }
      currentWeek.push({ date: dateStr, count });
    }
    if (currentWeek.length > 0) result.push(currentWeek);

    return { weeks: result, maxCount: max };
  }, [contributions]);

  const totalContributions = Object.values(contributions).reduce((a, b) => a + b, 0);

  const getColor = (count: number) => {
    if (count === 0) return isDark ? "bg-white/[0.03] border-white/[0.015]" : "bg-black/[0.03] border-black/[0.03]";
    if (count <= 2) return "bg-green-500/20 border-green-500/10";
    if (count <= 5) return "bg-green-500/40 border-green-500/15";
    if (count <= 10) return "bg-green-500/60 border-green-500/20";
    return "bg-green-500/80 border-green-500/25";
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold tracking-tight">Contribution Activity</h4>
          <p className={`mt-0.5 text-[10px] ${isDark ? "text-zinc-600" : "text-zinc-400"}`}>Last 90 days</p>
        </div>
        <div className={`flex items-center gap-2.5 rounded-xl border px-3 py-1.5 ${
          isDark ? "border-green-500/10 bg-green-500/5" : "border-green-200 bg-green-50"
        }`}>
          <Activity className={`h-3.5 w-3.5 ${isDark ? "text-green-400" : "text-green-600"}`} />
          <span className={`text-base font-bold ${isDark ? "text-green-400" : "text-green-600"}`}>{totalContributions}</span>
          <span className={`text-[10px] ${isDark ? "text-green-500/50" : "text-green-600/50"}`}>contributions</span>
        </div>
      </div>

      <div className="flex gap-[3px] overflow-x-auto pb-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {week.map((day) => (
              <motion.div
                key={day.date}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: wi * 0.012, duration: 0.15 }}
                className={`h-[12px] w-[12px] rounded-[3px] border ${getColor(day.count)} transition-all duration-200 hover:scale-[1.3] hover:brightness-125`}
                title={`${day.date}: ${day.count} contributions`}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className={`mt-3 flex items-center gap-2 text-[9px] ${isDark ? "text-zinc-600" : "text-zinc-400"}`}>
        <span>Less</span>
        <div className={`h-[10px] w-[10px] rounded-[2px] border ${isDark ? "border-white/[0.015] bg-white/[0.03]" : "border-black/[0.03] bg-black/[0.03]"}`} />
        <div className="h-[10px] w-[10px] rounded-[2px] border border-green-500/10 bg-green-500/20" />
        <div className="h-[10px] w-[10px] rounded-[2px] border border-green-500/15 bg-green-500/40" />
        <div className="h-[10px] w-[10px] rounded-[2px] border border-green-500/20 bg-green-500/60" />
        <div className="h-[10px] w-[10px] rounded-[2px] border border-green-500/25 bg-green-500/80" />
        <span>More</span>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────
export function GitHubOverview() {
  const { refreshUser } = useAuth();
  const { isDark } = useTheme();
  const [stats, setStats] = useState<GitHubStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const { data } = await githubAPI.getStats();
      setStats(data.stats);
    } catch {
      //
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  const disconnectGitHub = async () => {
    setDisconnecting(true);
    try {
      await authAPI.disconnectGitHub();
      await refreshUser();
    } catch {} finally {
      setDisconnecting(false);
    }
  };

  if (loading) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className={`flex items-center justify-center rounded-2xl border py-24 backdrop-blur-sm ${
          isDark ? "border-white/[0.04] bg-white/[0.015]" : "border-black/[0.04] bg-white/70"
        }`}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-transparent border-t-green-500" />
          <p className={`text-xs font-medium ${isDark ? "text-zinc-600" : "text-zinc-400"}`}>Loading GitHub data...</p>
        </div>
      </motion.div>
    );
  }

  if (!stats) return null;

  const statCards = [
    { label: "Repositories", value: stats.totalRepos, icon: BookOpen, darkColor: "text-white", lightColor: "text-zinc-800", darkAccent: "border-white/8 bg-white/[0.03]", lightAccent: "border-black/8 bg-white/70" },
    { label: "Followers", value: stats.followers, icon: Users, darkColor: "text-green-400", lightColor: "text-green-600", darkAccent: "border-green-500/10 bg-green-500/[0.04]", lightAccent: "border-green-200 bg-green-50/50" },
    { label: "Total Stars", value: stats.totalStars, icon: Star, darkColor: "text-yellow-400", lightColor: "text-yellow-600", darkAccent: "border-yellow-500/10 bg-yellow-500/[0.04]", lightAccent: "border-yellow-200 bg-yellow-50/50" },
    { label: "Total Forks", value: stats.totalForks, icon: GitFork, darkColor: "text-red-400", lightColor: "text-red-600", darkAccent: "border-red-500/10 bg-red-500/[0.04]", lightAccent: "border-red-200 bg-red-50/50" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="space-y-5"
    >
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className={`relative flex h-11 w-11 items-center justify-center rounded-xl ${
            isDark ? "bg-white/[0.04] border border-white/8" : "bg-black/[0.04] border border-black/8"
          }`}>
            <svg viewBox="0 0 24 24" className={`h-5 w-5 ${isDark ? "text-white" : "text-black"}`} fill="currentColor">
              <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
            </svg>
            <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-green-500">
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-base font-bold tracking-tight">GitHub Overview</h2>
              <span className={`rounded-full border px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                isDark ? "border-green-500/15 bg-green-500/10 text-green-400" : "border-green-200 bg-green-50 text-green-600"
              }`}>
                Connected
              </span>
            </div>
            <p className={`mt-0.5 text-[11px] ${isDark ? "text-zinc-600" : "text-zinc-400"}`}>@{stats.profile.login}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchStats}
            className={`group flex h-8 items-center gap-2 rounded-xl border px-3 text-[11px] font-medium transition-all duration-300 ${
              isDark
                ? "border-white/[0.04] bg-white/[0.02] text-zinc-500 hover:border-green-500/10 hover:bg-green-500/[0.03] hover:text-green-400"
                : "border-black/[0.04] bg-black/[0.02] text-zinc-500 hover:border-green-500/15 hover:bg-green-50 hover:text-green-600"
            }`}
          >
            <RefreshCw className="h-3 w-3 transition-transform duration-300 group-hover:rotate-180" /> Refresh
          </button>
          <button
            onClick={disconnectGitHub}
            disabled={disconnecting}
            className={`flex h-8 items-center gap-2 rounded-xl border px-3 text-[11px] font-medium transition-all duration-300 disabled:opacity-40 ${
              isDark
                ? "border-red-500/15 text-red-400/70 hover:bg-red-500/[0.04] hover:text-red-400"
                : "border-red-200 text-red-500/70 hover:bg-red-50 hover:text-red-500"
            }`}
          >
            <Unlink className="h-3 w-3" /> {disconnecting ? "..." : "Disconnect"}
          </button>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.07 }}
            className={`group relative overflow-hidden rounded-2xl border p-5 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] ${
              isDark ? stat.darkAccent : stat.lightAccent
            }`}
          >
            <div className="relative">
              <stat.icon className={`h-4 w-4 opacity-50 ${isDark ? stat.darkColor : stat.lightColor}`} />
              <p className="mt-3 text-3xl font-bold tracking-tight">{stat.value.toLocaleString()}</p>
              <p className={`mt-1 text-[11px] font-medium ${isDark ? "text-zinc-600" : "text-zinc-400"}`}>{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Heatmap + Languages */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* Contribution heatmap */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className={`overflow-hidden rounded-2xl border p-5 backdrop-blur-sm lg:col-span-2 ${
            isDark ? "border-white/8 bg-white/[0.025]" : "border-black/8 bg-white/70"
          }`}
        >
          <ContributionHeatmap contributions={stats.contributions} />
        </motion.div>

        {/* Top Languages */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className={`overflow-hidden rounded-2xl border p-5 backdrop-blur-sm ${
            isDark ? "border-white/8 bg-white/[0.025]" : "border-black/8 bg-white/70"
          }`}
        >
          <div className="mb-4 flex items-center gap-2.5">
            <Code2 className="h-4 w-4 text-zinc-500" />
            <h4 className="text-xs font-bold tracking-tight">Language Distribution</h4>
          </div>
          <div className="space-y-3.5">
            {stats.topLanguages.map((lang, i) => {
              const maxCount = stats.topLanguages[0]?.count || 1;
              const pct = Math.round((lang.count / maxCount) * 100);
              const colors = langColors[lang.name] || defaultLang;
              return (
                <motion.div
                  key={lang.name}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + i * 0.05 }}
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2.5">
                      <span className={`flex h-5 w-5 items-center justify-center rounded-md ${colors.bg}`}>
                        <span className={`h-2 w-2 rounded-full ${colors.bar}`} />
                      </span>
                      <span className="font-semibold">{lang.name}</span>
                    </div>
                    <span className={`font-medium ${isDark ? "text-zinc-600" : "text-zinc-400"}`}>{lang.count}</span>
                  </div>
                  <div className={`mt-2 h-1.5 overflow-hidden rounded-full ${isDark ? "bg-white/[0.04]" : "bg-black/[0.04]"}`}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ delay: 0.65 + i * 0.05, duration: 0.8, ease: "easeOut" }}
                      className={`h-full rounded-full ${colors.bar} opacity-60`}
                    />
                  </div>
                </motion.div>
              );
            })}
            {stats.topLanguages.length === 0 && (
              <p className={`py-6 text-center text-[11px] ${isDark ? "text-zinc-600" : "text-zinc-400"}`}>No language data</p>
            )}
          </div>
        </motion.div>
      </div>

      {/* Recent repos */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.65 }}
        className={`overflow-hidden rounded-2xl border p-5 backdrop-blur-sm ${
          isDark ? "border-white/8 bg-white/[0.025]" : "border-black/8 bg-white/70"
        }`}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <TrendingUp className="h-4 w-4 text-zinc-500" />
            <h4 className="text-xs font-bold tracking-tight">Recent Repositories</h4>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-[10px] font-medium ${isDark ? "text-zinc-600" : "text-zinc-400"}`}>{stats.recentRepos.length} repos</span>
            <button className={`flex h-7 items-center gap-1.5 rounded-lg border px-2.5 text-[10px] font-medium transition-all duration-300 ${
              isDark
                ? "border-white/[0.04] bg-white/[0.02] text-zinc-500 hover:border-green-500/10 hover:text-green-400"
                : "border-black/[0.04] bg-black/[0.02] text-zinc-500 hover:border-green-500/15 hover:text-green-600"
            }`}>
              <Download className="h-3 w-3" /> Import
            </button>
          </div>
        </div>
        <div className="space-y-2.5">
          {stats.recentRepos.map((repo, i) => {
            const colors = langColors[repo.language || ""] || defaultLang;
            return (
              <motion.a
                key={repo.id}
                href={repo.htmlUrl}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 + i * 0.04 }}
                className={`group/repo flex items-center justify-between rounded-xl border px-4 py-3.5 transition-all duration-300 ${
                  isDark
                    ? "border-white/[0.04] bg-white/[0.015] hover:border-white/[0.08] hover:bg-white/[0.03]"
                    : "border-black/[0.04] bg-black/[0.01] hover:border-black/[0.08] hover:bg-black/[0.02]"
                }`}
              >
                <div className="flex items-center gap-3.5 overflow-hidden">
                  {repo.isPrivate ? (
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                      isDark ? "border-yellow-500/10 bg-yellow-500/5" : "border-yellow-200 bg-yellow-50"
                    }`}>
                      <Lock className={`h-3.5 w-3.5 ${isDark ? "text-yellow-500/70" : "text-yellow-600/70"}`} />
                    </div>
                  ) : (
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                      isDark ? "border-white/[0.04] bg-white/[0.02]" : "border-black/[0.04] bg-black/[0.02]"
                    }`}>
                      <Globe className={`h-3.5 w-3.5 ${isDark ? "text-zinc-600" : "text-zinc-400"}`} />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5">
                      <p className="truncate text-[13px] font-semibold tracking-tight">{repo.name}</p>
                      {repo.isPrivate && (
                        <span className={`shrink-0 rounded border px-1.5 py-px text-[8px] font-bold uppercase tracking-wider ${
                          isDark ? "border-yellow-500/15 bg-yellow-500/5 text-yellow-500/70" : "border-yellow-200 bg-yellow-50 text-yellow-600/70"
                        }`}>
                          Private
                        </span>
                      )}
                    </div>
                    {repo.description && (
                      <p className={`mt-0.5 truncate text-[11px] ${isDark ? "text-zinc-600" : "text-zinc-400"}`}>{repo.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  {repo.language && (
                    <span className={`flex items-center gap-1.5 rounded-md ${colors.bg} px-2 py-0.5 text-[10px] font-semibold ${colors.text}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${colors.bar}`} />
                      {repo.language}
                    </span>
                  )}
                  {repo.stars > 0 && (
                    <span className={`flex items-center gap-1 text-[10px] font-medium ${isDark ? "text-yellow-500/60" : "text-yellow-600/60"}`}>
                      <Star className="h-3 w-3" />{repo.stars}
                    </span>
                  )}
                  {repo.forks > 0 && (
                    <span className={`flex items-center gap-1 text-[10px] font-medium ${isDark ? "text-zinc-600" : "text-zinc-400"}`}>
                      <GitFork className="h-3 w-3" />{repo.forks}
                    </span>
                  )}
                  <ExternalLink className={`h-3.5 w-3.5 transition-all duration-200 ${isDark ? "text-zinc-700 group-hover/repo:text-white" : "text-zinc-400 group-hover/repo:text-black"}`} />
                </div>
              </motion.a>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}
