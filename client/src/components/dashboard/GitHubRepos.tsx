import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Star,
  GitFork,
  Lock,
  Globe,
  Download,
  Loader2,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
import { githubAPI } from "@/lib/api";
import { useTheme } from "@/contexts/ThemeContext";

interface Repo {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  isPrivate: boolean;
  htmlUrl: string;
  cloneUrl: string;
  language: string | null;
  stars: number;
  forks: number;
  updatedAt: string;
  defaultBranch: string;
}

const langColors: Record<string, string> = {
  TypeScript: "bg-blue-400",
  JavaScript: "bg-yellow-400",
  Python: "bg-green-400",
  Rust: "bg-orange-400",
  Go: "bg-cyan-400",
  Java: "bg-red-400",
  "C++": "bg-pink-400",
  C: "bg-zinc-400",
  Ruby: "bg-red-500",
  HTML: "bg-orange-500",
  CSS: "bg-purple-400",
  Shell: "bg-emerald-400",
  Swift: "bg-orange-300",
  Kotlin: "bg-violet-400",
  PHP: "bg-indigo-400",
};

export function GitHubRepos() {
  const { isDark } = useTheme();
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState<number | null>(null);
  const [importedIds, setImportedIds] = useState<Set<number>>(new Set());

  const fetchRepos = async () => {
    setLoading(true);
    try {
      const { data } = await githubAPI.getRepos(1, 50);
      setRepos(data.repos);
    } catch {
      // Handle error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRepos();
  }, []);

  const importRepo = async (repo: Repo) => {
    setImporting(repo.id);
    try {
      await githubAPI.importRepo({
        repoName: repo.fullName,
        repoUrl: repo.htmlUrl,
        language: repo.language || undefined,
        description: repo.description || undefined,
      });
      setImportedIds((prev) => new Set(prev).add(repo.id));
    } catch {
      // Handle error
    } finally {
      setImporting(null);
    }
  };

  if (loading) {
    return (
      <div className="mt-6 flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3">
          <div className={`h-5 w-5 animate-spin rounded-full border-2 ${
            isDark ? "border-zinc-800 border-t-white" : "border-zinc-200 border-t-black"
          }`} />
          <p className={`text-xs ${isDark ? "text-zinc-600" : "text-zinc-400"}`}>Fetching repositories...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-zinc-500">
          {repos.length} repositories found
        </p>
        <button
          onClick={fetchRepos}
          className={`flex h-8 items-center gap-1.5 rounded-xl border px-3 text-[10px] font-medium transition-all duration-300 ${
            isDark
              ? "border-white/8 bg-white/2 text-zinc-500 hover:border-white/12 hover:text-white"
              : "border-black/8 bg-black/2 text-zinc-500 hover:border-black/12 hover:text-black"
          }`}
        >
          <RefreshCw className="h-3 w-3" />
          Refresh
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {repos.map((repo, i) => {
          const isImported = importedIds.has(repo.id);
          const isImporting = importing === repo.id;

          return (
            <motion.div
              key={repo.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className={`group flex items-center justify-between rounded-2xl border px-5 py-4 backdrop-blur-sm transition-all duration-300 ${
                isDark
                  ? "border-white/8 bg-white/3 hover:border-white/12 hover:shadow-[0_0_30px_rgba(255,255,255,0.02)]"
                  : "border-black/8 bg-white/70 hover:border-black/12 hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)]"
              }`}
            >
              <div className="flex items-center gap-4 overflow-hidden">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                  isDark ? "border-white/8 bg-white/2" : "border-black/8 bg-black/2"
                }`}>
                  {repo.isPrivate ? (
                    <Lock className={`h-4 w-4 ${isDark ? "text-yellow-500/60" : "text-yellow-600/60"}`} />
                  ) : (
                    <Globe className={`h-4 w-4 ${isDark ? "text-zinc-600" : "text-zinc-400"}`} />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5">
                    <a
                      href={repo.htmlUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`truncate text-sm font-semibold tracking-tight transition-colors hover:text-blue-400 ${
                        isDark ? "text-white" : "text-zinc-900"
                      }`}
                    >
                      {repo.name}
                    </a>
                    {repo.isPrivate && (
                      <span className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[9px] font-medium ${
                        isDark
                          ? "border-yellow-500/20 bg-yellow-500/5 text-yellow-500/70"
                          : "border-yellow-300 bg-yellow-50 text-yellow-600"
                      }`}>
                        Private
                      </span>
                    )}
                  </div>
                  {repo.description && (
                    <p className={`mt-0.5 truncate text-xs ${isDark ? "text-zinc-600" : "text-zinc-400"}`}>
                      {repo.description}
                    </p>
                  )}
                  <div className={`mt-2 flex items-center gap-3 text-[10px] ${isDark ? "text-zinc-600" : "text-zinc-400"}`}>
                    {repo.language && (
                      <span className="flex items-center gap-1.5">
                        <span
                          className={`inline-block h-2 w-2 rounded-full ${
                            langColors[repo.language] || "bg-zinc-500"
                          }`}
                        />
                        {repo.language}
                      </span>
                    )}
                    {repo.stars > 0 && (
                      <span className="flex items-center gap-1">
                        <Star className="h-2.5 w-2.5" />
                        {repo.stars}
                      </span>
                    )}
                    {repo.forks > 0 && (
                      <span className="flex items-center gap-1">
                        <GitFork className="h-2.5 w-2.5" />
                        {repo.forks}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => importRepo(repo)}
                disabled={isImporting || isImported}
                className={`flex h-8 shrink-0 items-center gap-2 rounded-xl px-4 text-[10px] font-semibold transition-all duration-300 disabled:opacity-40 ${
                  isImported
                    ? isDark
                      ? "border border-green-500/20 bg-green-500/5 text-green-400"
                      : "border border-green-200 bg-green-50 text-green-600"
                    : isDark
                      ? "border border-white/8 text-zinc-400 hover:border-white/12 hover:bg-white/4 hover:text-white"
                      : "border border-black/8 text-zinc-500 hover:border-black/12 hover:bg-black/3 hover:text-black"
                }`}
              >
                {isImporting ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : isImported ? (
                  <>
                    <CheckCircle2 className="h-3 w-3" />
                    Imported
                  </>
                ) : (
                  <>
                    <Download className="h-3 w-3" />
                    Import
                  </>
                )}
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
