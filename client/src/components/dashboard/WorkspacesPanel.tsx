import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Code2, Trash2, ExternalLink, GitBranch } from "lucide-react";
import { userAPI } from "@/lib/api";

interface Workspace {
  id: string;
  name: string;
  description: string | null;
  language: string | null;
  repoUrl: string | null;
  repoName: string | null;
  isImported: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export function WorkspacesPanel() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newLang, setNewLang] = useState("");
  const [creating, setCreating] = useState(false);

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

  const createWorkspace = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await userAPI.createWorkspace({
        name: newName.trim(),
        language: newLang.trim() || undefined,
      });
      setNewName("");
      setNewLang("");
      setShowCreate(false);
      fetchWorkspaces();
    } catch {
      // Handle error
    } finally {
      setCreating(false);
    }
  };

  const deleteWorkspace = async (id: string) => {
    try {
      await userAPI.deleteWorkspace(id);
      setWorkspaces((ws) => ws.filter((w) => w.id !== id));
    } catch {
      // Handle error
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-700 border-t-white" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-400">
          {workspaces.length} workspace{workspaces.length !== 1 && "s"}
        </p>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex h-8 items-center gap-1.5 rounded-lg bg-white px-3 text-xs font-medium text-black transition-colors hover:bg-zinc-200"
        >
          <Plus className="h-3.5 w-3.5" />
          New Workspace
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mt-4 overflow-hidden rounded-xl border border-white/[0.08] bg-[#0a0a0a] p-4"
        >
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Workspace name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="h-9 flex-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 text-sm text-white placeholder-zinc-600 outline-none focus:border-white/[0.15]"
              onKeyDown={(e) => e.key === "Enter" && createWorkspace()}
            />
            <input
              type="text"
              placeholder="Language (optional)"
              value={newLang}
              onChange={(e) => setNewLang(e.target.value)}
              className="h-9 w-40 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 text-sm text-white placeholder-zinc-600 outline-none focus:border-white/[0.15]"
            />
            <button
              onClick={createWorkspace}
              disabled={creating || !newName.trim()}
              className="h-9 rounded-lg bg-white px-4 text-xs font-medium text-black transition-colors hover:bg-zinc-200 disabled:opacity-40"
            >
              {creating ? "Creating..." : "Create"}
            </button>
          </div>
        </motion.div>
      )}

      {/* Workspaces grid */}
      {workspaces.length === 0 ? (
        <div className="mt-12 flex flex-col items-center justify-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.02]">
            <Code2 className="h-5 w-5 text-zinc-600" />
          </div>
          <p className="mt-3 text-sm text-zinc-400">No workspaces yet</p>
          <p className="mt-1 text-xs text-zinc-600">
            Create a new workspace or import from GitHub.
          </p>
        </div>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {workspaces.map((ws, i) => (
            <motion.div
              key={ws.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="group rounded-xl border border-white/[0.08] bg-[#0a0a0a] p-4 transition-colors hover:border-white/[0.12]"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {ws.isImported ? (
                    <GitBranch className="h-4 w-4 text-green-400" />
                  ) : (
                    <Code2 className="h-4 w-4 text-blue-400" />
                  )}
                  <h3 className="text-sm font-medium">{ws.name}</h3>
                </div>
                <button
                  onClick={() => deleteWorkspace(ws.id)}
                  className="text-zinc-700 opacity-0 transition-all hover:text-red-400 group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              {ws.language && (
                <span className="mt-2 inline-block rounded bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-zinc-500">
                  {ws.language}
                </span>
              )}

              {ws.repoUrl && (
                <a
                  href={ws.repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 flex items-center gap-1 text-[10px] text-zinc-600 hover:text-zinc-400"
                >
                  <ExternalLink className="h-2.5 w-2.5" />
                  {ws.repoName || "View repo"}
                </a>
              )}

              <p className="mt-2 text-[10px] text-zinc-700">
                {new Date(ws.updatedAt).toLocaleDateString()}
              </p>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
