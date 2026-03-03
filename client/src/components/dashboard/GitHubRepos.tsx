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
} from "lucide-react";
import { githubAPI } from "@/lib/api";

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
};

export function GitHubRepos() {
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
      <div className="mt-6 flex items-center justify-center py-12">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-700 border-t-white" />
      </div>
    );
  }

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-500">
          {repos.length} repositories found
        </p>
        <button
          onClick={fetchRepos}
          className="flex h-7 items-center gap-1.5 rounded-lg border border-white/[0.06] px-2.5 text-[10px] text-zinc-500 transition-colors hover:text-white"
        >
          <RefreshCw className="h-3 w-3" />
          Refresh
        </button>
      </div>

      <div className="mt-3 space-y-2">
        {repos.map((repo, i) => {
          const isImported = importedIds.has(repo.id);
          const isImporting = importing === repo.id;

          return (
            <motion.div
              key={repo.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-[#0a0a0a] px-4 py-3 transition-colors hover:border-white/[0.12]"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                {repo.isPrivate ? (
                  <Lock className="h-3.5 w-3.5 shrink-0 text-yellow-500/60" />
                ) : (
                  <Globe className="h-3.5 w-3.5 shrink-0 text-zinc-600" />
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <a
                      href={repo.htmlUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-sm font-medium text-blue-400 hover:underline"
                    >
                      {repo.name}
                    </a>
                    {repo.isPrivate && (
                      <span className="shrink-0 rounded border border-yellow-500/20 bg-yellow-500/5 px-1.5 py-0.5 text-[9px] text-yellow-500/70">
                        Private
                      </span>
                    )}
                  </div>
                  {repo.description && (
                    <p className="mt-0.5 truncate text-xs text-zinc-600">
                      {repo.description}
                    </p>
                  )}
                  <div className="mt-1.5 flex items-center gap-3 text-[10px] text-zinc-600">
                    {repo.language && (
                      <span className="flex items-center gap-1">
                        <span
                          className={`inline-block h-2 w-2 rounded-full ${
                            langColors[repo.language] || "bg-zinc-500"
                          }`}
                        />
                        {repo.language}
                      </span>
                    )}
                    {repo.stars > 0 && (
                      <span className="flex items-center gap-0.5">
                        <Star className="h-2.5 w-2.5" />
                        {repo.stars}
                      </span>
                    )}
                    {repo.forks > 0 && (
                      <span className="flex items-center gap-0.5">
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
                className={`flex h-7 shrink-0 items-center gap-1.5 rounded-lg px-3 text-[10px] font-medium transition-colors ${
                  isImported
                    ? "border border-green-500/20 bg-green-500/5 text-green-400"
                    : "border border-white/[0.08] text-zinc-400 hover:bg-white/[0.04] hover:text-white"
                } disabled:opacity-50`}
              >
                {isImporting ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : isImported ? (
                  "Imported"
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
