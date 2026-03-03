import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FolderOpen, Plus, Code2, ArrowUpRight, Zap } from "lucide-react";
import { userAPI } from "@/lib/api";

interface Workspace {
  id: string;
  name: string;
  language: string | null;
  status: string;
  isImported: boolean;
  updatedAt: string;
}

export function WorkspacesCard() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await userAPI.getWorkspaces();
        setWorkspaces(data.workspaces);
      } catch {
        // No workspaces
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const statusDot = (status: string) => {
    switch (status) {
      case "active": return { color: "bg-green-500", glow: "shadow-[0_0_6px_rgba(34,197,94,0.5)]" };
      case "stopped": return { color: "bg-zinc-600", glow: "" };
      default: return { color: "bg-yellow-500", glow: "shadow-[0_0_6px_rgba(234,179,8,0.5)]" };
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0a0a0a] p-5 transition-all duration-300 hover:border-yellow-500/10"
    >
      {/* Accent glow */}
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-yellow-500/[0.04] blur-2xl transition-all duration-500 group-hover:bg-yellow-500/[0.08]" />

      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-500/20 to-amber-500/10 shadow-inner">
              <FolderOpen className="h-4 w-4 text-yellow-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">My Workspaces</h3>
              <p className="text-[11px] text-zinc-600">{loading ? "..." : `${workspaces.length} total`}</p>
            </div>
          </div>
          <button className="flex h-7 w-7 items-center justify-center rounded-lg border border-yellow-500/10 bg-yellow-500/5 text-yellow-500 transition-all hover:border-yellow-500/20 hover:bg-yellow-500/10">
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-4 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-800 border-t-yellow-400" />
            </div>
          ) : workspaces.length === 0 ? (
            <div className="flex flex-col items-center py-6 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-dashed border-yellow-500/15 bg-yellow-500/5">
                <Code2 className="h-4 w-4 text-yellow-600" />
              </div>
              <p className="mt-2.5 text-xs text-zinc-500">No workspaces yet</p>
              <p className="mt-0.5 text-[10px] text-zinc-700">Create one to get started</p>
            </div>
          ) : (
            workspaces.slice(0, 4).map((ws, i) => {
              const dot = statusDot(ws.status);
              return (
                <motion.div
                  key={ws.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + i * 0.05 }}
                  className="flex cursor-pointer items-center justify-between rounded-xl border border-white/[0.04] bg-white/[0.02] px-3 py-2.5 transition-all duration-200 hover:border-yellow-500/10 hover:bg-yellow-500/[0.02]"
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${dot.color} ${dot.glow}`} />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-white">{ws.name}</p>
                      <p className="text-[10px] text-zinc-600">
                        {ws.language || "No language"} · {new Date(ws.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <ArrowUpRight className="h-3 w-3 shrink-0 text-zinc-700 transition-colors group-hover:text-yellow-500" />
                </motion.div>
              );
            })
          )}
        </div>

        {workspaces.length > 4 && (
          <p className="mt-3 text-center text-[10px] text-yellow-500/50">+{workspaces.length - 4} more</p>
        )}
      </div>
    </motion.div>
  );
}
