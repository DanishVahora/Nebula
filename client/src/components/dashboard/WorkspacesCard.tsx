import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FolderOpen, Plus, Code2, ArrowUpRight } from "lucide-react";
import { userAPI } from "@/lib/api";
import { useTheme } from "@/contexts/ThemeContext";
import { CreateWorkspaceModal } from "@/components/dashboard/CreateWorkspaceModal";

interface Workspace {
  id: string;
  name: string;
  language: string | null;
  template: string | null;
  visibility: string;
  status: string;
  isImported: boolean;
  updatedAt: string;
}

export function WorkspacesCard() {
  const { isDark } = useTheme();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchWorkspaces = async () => {
    try {
      const { data } = await userAPI.getWorkspaces();
      setWorkspaces(data.workspaces);
    } catch {
      // No workspaces
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const statusDot = (status: string) => {
    switch (status) {
      case "active": return "bg-green-500";
      case "stopped": return isDark ? "bg-zinc-600" : "bg-zinc-400";
      default: return "bg-yellow-500";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className={`group relative overflow-hidden rounded-2xl border p-6 backdrop-blur-sm transition-all duration-500 hover:shadow-[0_0_30px_rgba(34,197,94,0.08)] ${
        isDark
          ? "border-white/8 bg-white/3 hover:border-green-500/15"
          : "border-black/8 bg-white/70 hover:border-green-500/20"
      }`}
    >
      {/* Corner glow */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-green-500/4 blur-2xl transition-all duration-700 group-hover:bg-green-500/8" />

      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${isDark ? "bg-green-500/10" : "bg-green-50"}`}>
              <FolderOpen className={`h-4.5 w-4.5 ${isDark ? "text-green-400" : "text-green-600"}`} />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">Workspaces</h3>
              <p className={`text-[11px] ${isDark ? "text-zinc-500" : "text-zinc-500"}`}>{loading ? "..." : `${workspaces.length} total`}</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-all duration-300 ${
            isDark
              ? "border-green-500/10 bg-green-500/5 text-green-400 hover:border-green-500/20 hover:bg-green-500/10"
              : "border-green-200 bg-green-50 text-green-600 hover:bg-green-100"
          }`}>
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <CreateWorkspaceModal
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreated={fetchWorkspaces}
        />

        {/* Bold stat */}
        <div className="mt-5">
          <span className="text-4xl font-bold tracking-tight">
            {loading ? <span className={`inline-block h-10 w-12 animate-pulse rounded ${isDark ? "bg-white/5" : "bg-black/5"}`} /> : workspaces.length}
          </span>
          <span className={`ml-2 text-sm ${isDark ? "text-zinc-600" : "text-zinc-400"}`}>workspaces</span>
        </div>

        {/* Progress bar */}
        <div className={`mt-3 h-1 overflow-hidden rounded-full ${isDark ? "bg-white/6" : "bg-black/6"}`}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: loading ? "0%" : `${Math.min((workspaces.filter(w => w.status === "active").length / Math.max(workspaces.length, 1)) * 100, 100)}%` }}
            transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
            className="h-full rounded-full bg-linear-to-r from-green-500 to-emerald-400"
          />
        </div>
        <p className={`mt-1.5 text-[10px] ${isDark ? "text-zinc-600" : "text-zinc-500"}`}>
          {workspaces.filter(w => w.status === "active").length} active
        </p>

        {/* Workspace list */}
        <div className="mt-4 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-transparent border-t-green-500" />
            </div>
          ) : workspaces.length === 0 ? (
            <div className="flex flex-col items-center py-6 text-center">
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl border border-dashed ${
                isDark ? "border-green-500/15 bg-green-500/5" : "border-green-200 bg-green-50"
              }`}>
                <Code2 className={`h-4.5 w-4.5 ${isDark ? "text-green-600" : "text-green-500"}`} />
              </div>
              <p className={`mt-3 text-xs font-medium ${isDark ? "text-zinc-500" : "text-zinc-500"}`}>No workspaces yet</p>
              <p className={`mt-0.5 text-[10px] ${isDark ? "text-zinc-600" : "text-zinc-400"}`}>Create one to get started</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className={`mt-3 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-semibold transition-all duration-200 ${
                  isDark ? "bg-green-500/10 text-green-400 hover:bg-green-500/15" : "bg-green-50 text-green-600 hover:bg-green-100"
                }`}
              >
                <Plus className="h-3 w-3" />
                Create Workspace
              </button>
            </div>
          ) : (
            workspaces.slice(0, 3).map((ws, i) => (
              <motion.div
                key={ws.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.06 }}
                className={`group/item flex cursor-pointer items-center justify-between rounded-xl border px-3.5 py-3 transition-all duration-300 ${
                  isDark
                    ? "border-white/4 bg-white/2 hover:border-green-500/10 hover:bg-green-500/3"
                    : "border-black/4 bg-black/1 hover:border-green-500/15 hover:bg-green-50/50"
                }`}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${statusDot(ws.status)}`} />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold">{ws.name}</p>
                    <p className={`text-[10px] ${isDark ? "text-zinc-600" : "text-zinc-400"}`}>
                      {ws.language || "No language"} · {new Date(ws.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <ArrowUpRight className={`h-3.5 w-3.5 shrink-0 transition-all duration-200 ${
                  isDark ? "text-zinc-700 group-hover/item:text-green-400" : "text-zinc-400 group-hover/item:text-green-500"
                }`} />
              </motion.div>
            ))
          )}
        </div>

        {workspaces.length > 3 && (
          <p className="mt-3 text-center text-[10px] font-medium text-green-500/50 transition-colors hover:text-green-500">
            +{workspaces.length - 3} more workspaces
          </p>
        )}
      </div>
    </motion.div>
  );
}
