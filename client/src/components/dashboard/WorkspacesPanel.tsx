import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, Code2, Trash2, ExternalLink, GitBranch } from "lucide-react";
import { userAPI } from "@/lib/api";
import { useTheme } from "@/contexts/ThemeContext";
import { CreateWorkspaceModal } from "@/components/dashboard/CreateWorkspaceModal";

interface Workspace {
  id: string;
  name: string;
  description: string | null;
  language: string | null;
  template: string | null;
  visibility: string;
  repoUrl: string | null;
  repoName: string | null;
  isImported: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export function WorkspacesPanel() {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchWorkspaces = async () => {
    try {
      const { data } = await userAPI.getWorkspaces();
      setWorkspaces(data.workspaces);
    } catch {
      // No workspaces yet
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const deleteWorkspace = async (id: string) => {
    try {
      await userAPI.deleteWorkspace(id);
      setWorkspaces((ws) => ws.filter((w) => w.id !== id));
    } catch {
      // Handle error
    }
  };

  const statusDot = (status: string) => {
    switch (status) {
      case "active": return "bg-green-500";
      case "stopped": return isDark ? "bg-zinc-600" : "bg-zinc-400";
      default: return "bg-yellow-500";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-transparent border-t-green-500" />
          <p className={`text-xs ${isDark ? "text-zinc-600" : "text-zinc-400"}`}>Loading workspaces...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className={`text-sm font-medium ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
          {workspaces.length} workspace{workspaces.length !== 1 && "s"}
        </p>
        <button
          onClick={() => setShowCreateModal(true)}
          className={`flex h-9 items-center gap-2 rounded-xl px-4 text-xs font-semibold transition-all duration-300 ${
            isDark
              ? "bg-white text-black hover:bg-zinc-100"
              : "bg-black text-white hover:bg-zinc-800"
          }`}
        >
          <Plus className="h-3.5 w-3.5" />
          New Workspace
        </button>
      </div>

      {/* Create workspace modal */}
      <CreateWorkspaceModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={fetchWorkspaces}
      />

      {/* Workspaces grid */}
      {workspaces.length === 0 ? (
        <div className="mt-16 flex flex-col items-center justify-center text-center">
          <div className={`flex h-14 w-14 items-center justify-center rounded-2xl border ${
            isDark ? "border-white/8 bg-white/3" : "border-black/8 bg-black/3"
          }`}>
            <Code2 className={`h-6 w-6 ${isDark ? "text-zinc-600" : "text-zinc-400"}`} />
          </div>
          <p className={`mt-4 text-sm font-medium ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>No workspaces yet</p>
          <p className={`mt-1 text-xs ${isDark ? "text-zinc-600" : "text-zinc-400"}`}>
            Create a new workspace or import from GitHub.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className={`mt-4 flex h-9 items-center gap-2 rounded-xl px-5 text-xs font-semibold transition-all duration-300 ${
              isDark ? "bg-white text-black hover:bg-zinc-100" : "bg-black text-white hover:bg-zinc-800"
            }`}
          >
            <Plus className="h-3.5 w-3.5" />
            Create Workspace
          </button>
        </div>
      ) : (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {workspaces.map((ws, i) => (
            <motion.div
              key={ws.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => navigate(`/workspace/${ws.id}`)}
              className={`group cursor-pointer rounded-2xl border p-5 backdrop-blur-sm transition-all duration-300 hover:shadow-[0_0_25px_rgba(34,197,94,0.06)] ${
                isDark
                  ? "border-white/8 bg-white/3 hover:border-white/12"
                  : "border-black/8 bg-white/70 hover:border-black/12"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`h-2.5 w-2.5 rounded-full ${statusDot(ws.status)}`} />
                  {ws.isImported ? (
                    <GitBranch className={`h-4 w-4 ${isDark ? "text-green-400" : "text-green-600"}`} />
                  ) : (
                    <Code2 className={`h-4 w-4 ${isDark ? "text-blue-400" : "text-blue-600"}`} />
                  )}
                  <h3 className="text-sm font-semibold tracking-tight">{ws.name}</h3>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteWorkspace(ws.id); }}
                  className={`opacity-0 transition-all duration-200 group-hover:opacity-100 ${
                    isDark ? "text-zinc-700 hover:text-red-400" : "text-zinc-400 hover:text-red-500"
                  }`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              {ws.language && (
                <span className={`mt-3 inline-block rounded-lg border px-2 py-0.5 text-[10px] font-medium ${
                  isDark ? "border-white/4 bg-white/2 text-zinc-500" : "border-black/4 bg-black/2 text-zinc-500"
                }`}>
                  {ws.language}
                </span>
              )}

              {ws.repoUrl && (
                <a
                  href={ws.repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`mt-2 flex items-center gap-1.5 text-[10px] transition-colors ${
                    isDark ? "text-zinc-600 hover:text-zinc-400" : "text-zinc-400 hover:text-zinc-600"
                  }`}
                >
                  <ExternalLink className="h-2.5 w-2.5" />
                  {ws.repoName || "View repo"}
                </a>
              )}

              <p className={`mt-3 text-[10px] ${isDark ? "text-zinc-600" : "text-zinc-400"}`}>
                Updated {new Date(ws.updatedAt).toLocaleDateString()}
              </p>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
