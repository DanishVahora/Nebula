import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { workspaceAPI } from "@/lib/api";
import { IDEToolbar } from "@/components/ide/IDEToolbar";
import { FileExplorer } from "@/components/ide/FileExplorer";
import { EditorTabs } from "@/components/ide/EditorTabs";
import { TerminalPanel } from "@/components/ide/TerminalPanel";
import { PreviewPanel } from "@/components/ide/PreviewPanel";
import { GitPanel } from "@/components/ide/GitPanel";
import {
  Loader2,
  AlertCircle,
  Files,
  GitBranch,
  Search,
  Settings,
  Terminal,
} from "lucide-react";

export interface FileTab {
  path: string;
  name: string;
  content: string;
  isDirty: boolean;
  language: string;
}

export interface FileEntry {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileEntry[];
}

function getLanguageFromPath(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase() || "";
  const map: Record<string, string> = {
    ts: "typescript", tsx: "typescriptreact", js: "javascript", jsx: "javascriptreact",
    json: "json", html: "html", css: "css", scss: "scss", md: "markdown",
    py: "python", cpp: "cpp", c: "c", java: "java", rs: "rust", go: "go",
    yaml: "yaml", yml: "yaml", xml: "xml", sql: "sql", sh: "shell", bash: "shell",
    txt: "plaintext", env: "plaintext", gitignore: "plaintext", vue: "html",
    svelte: "html", prisma: "graphql",
  };
  return map[ext] || "plaintext";
}

type SidebarPanel = "files" | "git" | "search";

export default function WorkspaceIDE() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();

  const [workspace, setWorkspace] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // File tree
  const [fileTree, setFileTree] = useState<FileEntry[]>([]);

  // Editor tabs
  const [tabs, setTabs] = useState<FileTab[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);

  // Panel visibility
  const [activeSidebarPanel, setActiveSidebarPanel] = useState<SidebarPanel>("files");
  const [showSidebar, setShowSidebar] = useState(true);
  const [showTerminal, setShowTerminal] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [terminalHeight, setTerminalHeight] = useState(220);

  // Terminal
  const [terminalLines, setTerminalLines] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Git
  const [gitBranch, setGitBranch] = useState<string | null>(null);
  const [gitStatus, setGitStatus] = useState<any>(null);

  // Autosave timer
  const autosaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Resizing terminal
  const isResizingRef = useRef(false);

  // ── Load workspace ──────────────────────────────────────
  const loadWorkspace = useCallback(async () => {
    if (!workspaceId) return;
    try {
      setLoading(true);
      const res = await workspaceAPI.getWorkspace(workspaceId);
      setWorkspace(res.data.workspace);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to load workspace");
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  // ── Load file tree ──────────────────────────────────────
  const loadFileTree = useCallback(async () => {
    if (!workspaceId) return;
    try {
      const res = await workspaceAPI.getFileTree(workspaceId);
      setFileTree(res.data.files);
    } catch {
      // Ignore
    }
  }, [workspaceId]);

  // ── Load git status ─────────────────────────────────────
  const loadGitStatus = useCallback(async () => {
    if (!workspaceId) return;
    try {
      const [statusRes, branchRes] = await Promise.all([
        workspaceAPI.gitStatus(workspaceId).catch(() => null),
        workspaceAPI.gitBranch(workspaceId).catch(() => null),
      ]);
      if (statusRes?.data) setGitStatus(statusRes.data);
      if (branchRes?.data) setGitBranch(branchRes.data.branch);
    } catch {
      // Git not available
    }
  }, [workspaceId]);

  // ── Open file ───────────────────────────────────────────
  const openFile = useCallback(
    async (filePath: string) => {
      if (!workspaceId) return;
      const existing = tabs.find((t) => t.path === filePath);
      if (existing) { setActiveTab(filePath); return; }

      try {
        const res = await workspaceAPI.readFile(workspaceId, filePath);
        const name = filePath.split("/").pop() || filePath;
        const newTab: FileTab = {
          path: filePath, name, content: res.data.content,
          isDirty: false, language: getLanguageFromPath(filePath),
        };
        setTabs((prev) => [...prev, newTab]);
        setActiveTab(filePath);
      } catch { /* File read failed */ }
    },
    [workspaceId, tabs]
  );

  // ── Save file ───────────────────────────────────────────
  const saveFile = useCallback(
    async (filePath: string) => {
      if (!workspaceId) return;
      const tab = tabs.find((t) => t.path === filePath);
      if (!tab || !tab.isDirty) return;
      try {
        await workspaceAPI.writeFile(workspaceId, filePath, tab.content);
        setTabs((prev) => prev.map((t) => t.path === filePath ? { ...t, isDirty: false } : t));
      } catch { /* Save failed */ }
    },
    [workspaceId, tabs]
  );

  // ── Update file content ─────────────────────────────────
  const updateFileContent = useCallback(
    (filePath: string, content: string) => {
      setTabs((prev) => prev.map((t) => t.path === filePath ? { ...t, content, isDirty: true } : t));
      if (autosaveRef.current) clearTimeout(autosaveRef.current);
      autosaveRef.current = setTimeout(() => { saveFile(filePath); }, 1500);
    },
    [saveFile]
  );

  // ── Close tab ───────────────────────────────────────────
  const closeTab = useCallback(
    (filePath: string) => {
      setTabs((prev) => {
        const filtered = prev.filter((t) => t.path !== filePath);
        if (activeTab === filePath) {
          setActiveTab(filtered.length > 0 ? filtered[filtered.length - 1].path : null);
        }
        return filtered;
      });
    },
    [activeTab]
  );

  // ── Create file/folder ──────────────────────────────────
  const createFileOrFolder = useCallback(
    async (parentPath: string, name: string, type: "file" | "directory") => {
      if (!workspaceId) return;
      const fullPath = parentPath ? `${parentPath}/${name}` : name;
      try {
        await workspaceAPI.createEntry(workspaceId, fullPath, type);
        await loadFileTree();
        if (type === "file") openFile(fullPath);
      } catch { /* Create failed */ }
    },
    [workspaceId, loadFileTree, openFile]
  );

  // ── Delete file/folder ──────────────────────────────────
  const deleteFile = useCallback(
    async (filePath: string) => {
      if (!workspaceId) return;
      try {
        await workspaceAPI.deleteEntry(workspaceId, filePath);
        closeTab(filePath);
        await loadFileTree();
      } catch { /* Delete failed */ }
    },
    [workspaceId, loadFileTree, closeTab]
  );

  // ── Rename ──────────────────────────────────────────────
  const renameFile = useCallback(
    async (oldPath: string, newPath: string) => {
      if (!workspaceId) return;
      try {
        await workspaceAPI.renameEntry(workspaceId, oldPath, newPath);
        setTabs((prev) =>
          prev.map((t) => t.path === oldPath
            ? { ...t, path: newPath, name: newPath.split("/").pop() || newPath } : t
          )
        );
        if (activeTab === oldPath) setActiveTab(newPath);
        await loadFileTree();
      } catch { /* Rename failed */ }
    },
    [workspaceId, loadFileTree, activeTab]
  );

  // ── Run ─────────────────────────────────────────────────
  const runWorkspace = useCallback(
    async (command?: string) => {
      if (!workspaceId) return;
      try {
        setShowTerminal(true);
        setTerminalLines([]);
        const res = await workspaceAPI.run(workspaceId, command);
        setIsRunning(true);
        setTerminalLines((prev) => [...prev, `▶ ${res.data.command}`]);
      } catch (err: any) {
        setTerminalLines((prev) => [...prev, `[Error] ${err.response?.data?.error || "Failed to run"}`]);
      }
    },
    [workspaceId]
  );

  // ── Stop ────────────────────────────────────────────────
  const stopWorkspace = useCallback(async () => {
    if (!workspaceId) return;
    try {
      await workspaceAPI.stop(workspaceId);
      setIsRunning(false);
    } catch { /* Stop failed */ }
  }, [workspaceId]);

  // ── Execute command ─────────────────────────────────────
  const execCommand = useCallback(
    async (command: string) => {
      if (!workspaceId) return;
      try {
        setTerminalLines((prev) => [...prev, `$ ${command}`]);
        const res = await workspaceAPI.exec(workspaceId, command);
        if (res.data.output) {
          const lines = res.data.output.split("\n").filter((l: string) => l.trim());
          setTerminalLines((prev) => [...prev, ...lines]);
        }
      } catch (err: any) {
        setTerminalLines((prev) => [...prev, `[Error] ${err.response?.data?.error || "Command failed"}`]);
      }
    },
    [workspaceId]
  );

  // ── Git operations ──────────────────────────────────────
  const gitCommit = useCallback(
    async (message: string) => {
      if (!workspaceId) return;
      try {
        const res = await workspaceAPI.gitCommit(workspaceId, message);
        setTerminalLines((prev) => [...prev, `✓ ${res.data.message} (${res.data.summary?.changes || 0} changes)`]);
        loadGitStatus();
      } catch (err: any) {
        setTerminalLines((prev) => [...prev, `[Git Error] ${err.response?.data?.error || "Commit failed"}`]);
      }
    },
    [workspaceId, loadGitStatus]
  );

  const gitPush = useCallback(async () => {
    if (!workspaceId) return;
    try {
      const res = await workspaceAPI.gitPush(workspaceId);
      setTerminalLines((prev) => [...prev, `✓ ${res.data.message}`]);
    } catch (err: any) {
      setTerminalLines((prev) => [...prev, `[Git Error] ${err.response?.data?.error || "Push failed"}`]);
    }
  }, [workspaceId]);

  const gitPull = useCallback(async () => {
    if (!workspaceId) return;
    try {
      const res = await workspaceAPI.gitPull(workspaceId);
      setTerminalLines((prev) => [...prev, `✓ ${res.data.message}`]);
      loadFileTree();
    } catch (err: any) {
      setTerminalLines((prev) => [...prev, `[Git Error] ${err.response?.data?.error || "Pull failed"}`]);
    }
  }, [workspaceId, loadFileTree]);

  const gitInitRepo = useCallback(async () => {
    if (!workspaceId) return;
    try {
      await workspaceAPI.gitInit(workspaceId);
      setTerminalLines((prev) => [...prev, "✓ Git repository initialized"]);
      loadGitStatus();
    } catch (err: any) {
      setTerminalLines((prev) => [...prev, `[Git Error] ${err.response?.data?.error || "Init failed"}`]);
    }
  }, [workspaceId, loadGitStatus]);

  // ── Terminal resize ─────────────────────────────────────
  const handleTerminalResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;
    const startY = e.clientY;
    const startHeight = terminalHeight;

    const onMouseMove = (ev: MouseEvent) => {
      if (!isResizingRef.current) return;
      const delta = startY - ev.clientY;
      setTerminalHeight(Math.max(100, Math.min(500, startHeight + delta)));
    };
    const onMouseUp = () => {
      isResizingRef.current = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, [terminalHeight]);

  // ── Poll terminal output ────────────────────────────────
  useEffect(() => {
    if (!workspaceId || !isRunning) {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }
    let offset = 0;
    pollRef.current = setInterval(async () => {
      try {
        const res = await workspaceAPI.getOutput(workspaceId, offset);
        if (res.data.output.length > 0) {
          setTerminalLines((prev) => [...prev, ...res.data.output]);
          offset = res.data.total;
        }
        if (!res.data.isRunning) setIsRunning(false);
      } catch { /* Poll failed */ }
    }, 1000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [workspaceId, isRunning]);

  // ── Initial load ────────────────────────────────────────
  useEffect(() => { loadWorkspace(); }, [loadWorkspace]);
  useEffect(() => {
    if (workspace) { loadFileTree(); loadGitStatus(); }
  }, [workspace, loadFileTree, loadGitStatus]);

  // ── Keyboard shortcuts ──────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (activeTab) saveFile(activeTab);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "`") {
        e.preventDefault();
        setShowTerminal((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeTab, saveFile]);

  // ── Loading state ───────────────────────────────────────
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#1e1e1e]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#007acc]" />
          <p className="text-sm text-[#858585]">Loading workspace...</p>
        </div>
      </div>
    );
  }

  if (error || !workspace) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#1e1e1e]">
        <div className="flex flex-col items-center gap-3 max-w-md text-center">
          <AlertCircle className="w-10 h-10 text-red-400" />
          <h2 className="text-lg font-semibold text-[#cccccc]">Workspace Error</h2>
          <p className="text-sm text-[#858585]">{error || "Workspace not found"}</p>
          <button
            onClick={() => navigate("/dashboard")}
            className="mt-2 px-4 py-2 text-sm bg-[#0e639c] text-white rounded hover:bg-[#1177bb] transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const activeFileTab = tabs.find((t) => t.path === activeTab) || null;
  const isWebTemplate = ["static", "react", "react-ts", "nextjs", "vite-react-ts", "vue", "angular"].includes(workspace.template || "");
  const changedFilesCount = (gitStatus?.modified?.length || 0) + (gitStatus?.untracked?.length || 0);

  const toggleSidebarPanel = (panel: SidebarPanel) => {
    if (activeSidebarPanel === panel && showSidebar) {
      setShowSidebar(false);
    } else {
      setActiveSidebarPanel(panel);
      setShowSidebar(true);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#1e1e1e] overflow-hidden select-none">
      {/* ── Title Bar / Toolbar ──────────────────────── */}
      <IDEToolbar
        workspace={workspace}
        isRunning={isRunning}
        onRun={() => runWorkspace()}
        onStop={stopWorkspace}
        onBack={() => navigate("/dashboard")}
        showPreview={showPreview}
        onTogglePreview={() => setShowPreview(!showPreview)}
        isWebTemplate={isWebTemplate}
        showTerminal={showTerminal}
        onToggleTerminal={() => setShowTerminal(!showTerminal)}
      />

      {/* ── Main Content ─────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* ── Activity Bar (icon rail) ───────────────── */}
        <div className="w-12 shrink-0 bg-[#333333] flex flex-col items-center py-1 border-r border-[#252526]">
          <ActivityBarButton
            icon={<Files className="w-[22px] h-[22px]" />}
            active={activeSidebarPanel === "files" && showSidebar}
            onClick={() => toggleSidebarPanel("files")}
            title="Explorer"
          />
          <ActivityBarButton
            icon={<Search className="w-[22px] h-[22px]" />}
            active={activeSidebarPanel === "search" && showSidebar}
            onClick={() => toggleSidebarPanel("search")}
            title="Search"
          />
          <ActivityBarButton
            icon={
              <div className="relative">
                <GitBranch className="w-[22px] h-[22px]" />
                {changedFilesCount > 0 && (
                  <span className="absolute -top-1 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-[#007acc] text-white text-[10px] font-bold flex items-center justify-center">
                    {changedFilesCount}
                  </span>
                )}
              </div>
            }
            active={activeSidebarPanel === "git" && showSidebar}
            onClick={() => toggleSidebarPanel("git")}
            title="Source Control"
          />

          <div className="flex-1" />

          <ActivityBarButton
            icon={<Settings className="w-[20px] h-[20px]" />}
            active={false}
            onClick={() => {}}
            title="Settings"
          />
        </div>

        {/* ── Sidebar Panel ──────────────────────────── */}
        {showSidebar && (
          <div className="w-64 shrink-0 bg-[#252526] border-r border-[#1e1e1e] overflow-hidden flex flex-col">
            {activeSidebarPanel === "files" && (
              <FileExplorer
                files={fileTree}
                activeFile={activeTab}
                onFileClick={openFile}
                onCreateFile={createFileOrFolder}
                onDeleteFile={deleteFile}
                onRenameFile={renameFile}
                onRefresh={loadFileTree}
              />
            )}
            {activeSidebarPanel === "git" && (
              <GitPanel
                gitBranch={gitBranch}
                gitStatus={gitStatus}
                workspace={workspace}
                onCommit={gitCommit}
                onPush={gitPush}
                onPull={gitPull}
                onGitInit={gitInitRepo}
                onRefresh={loadGitStatus}
              />
            )}
            {activeSidebarPanel === "search" && (
              <div className="flex flex-col h-full">
                <div className="px-4 py-3">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#bbbbbb]">
                    Search
                  </span>
                </div>
                <div className="px-3 pb-3">
                  <input
                    type="text"
                    placeholder="Search files..."
                    className="w-full px-2.5 py-1.5 text-[13px] bg-[#3c3c3c] border border-[#3c3c3c] rounded text-[#cccccc] outline-none focus:border-[#007acc] placeholder-[#858585]"
                  />
                </div>
                <div className="flex-1 flex items-center justify-center px-4">
                  <p className="text-[12px] text-[#858585] text-center">
                    Type to search across all workspace files
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Editor + Preview + Terminal ─────────── */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Editor + Preview Row */}
          <div className="flex-1 flex min-h-0">
            {/* Editor */}
            <div className="flex-1 flex flex-col min-w-0">
              <EditorTabs
                tabs={tabs}
                activeTab={activeTab}
                onTabClick={setActiveTab}
                onTabClose={closeTab}
                onContentChange={updateFileContent}
                onSave={saveFile}
                activeFileTab={activeFileTab}
              />
            </div>

            {/* Preview */}
            {showPreview && isWebTemplate && (
              <div className="w-[40%] shrink-0 border-l border-[#1e1e1e]">
                <PreviewPanel workspace={workspace} />
              </div>
            )}
          </div>

          {/* Terminal resize handle */}
          {showTerminal && (
            <div
              className="h-1 bg-[#252526] hover:bg-[#007acc] cursor-ns-resize transition-colors shrink-0"
              onMouseDown={handleTerminalResizeStart}
            />
          )}

          {/* Status bar above terminal or bottom bar */}
          {showTerminal && (
            <div style={{ height: terminalHeight }} className="shrink-0">
              <TerminalPanel
                lines={terminalLines}
                isRunning={isRunning}
                onExec={execCommand}
                onClear={() => setTerminalLines([])}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Status Bar ───────────────────────────────── */}
      <div className="h-[22px] shrink-0 flex items-center justify-between px-2 bg-[#007acc] text-white text-[11px]">
        <div className="flex items-center gap-3">
          {gitBranch && (
            <button
              className="flex items-center gap-1 hover:bg-white/10 px-1.5 rounded transition-colors"
              onClick={() => toggleSidebarPanel("git")}
            >
              <GitBranch className="w-3 h-3" />
              <span>{gitBranch}</span>
            </button>
          )}
          {changedFilesCount > 0 && (
            <span className="flex items-center gap-1 opacity-80">
              <span className="w-1.5 h-1.5 rounded-full bg-white/80" />
              {changedFilesCount} change{changedFilesCount > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {isRunning && (
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#89d185] animate-pulse" />
              Running
            </span>
          )}
          {activeFileTab && (
            <span className="opacity-80">{activeFileTab.language}</span>
          )}
          <span className="opacity-80">UTF-8</span>
          <button
            className="flex items-center gap-1 hover:bg-white/10 px-1.5 rounded transition-colors"
            onClick={() => setShowTerminal(!showTerminal)}
          >
            <Terminal className="w-3 h-3" />
            Terminal
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Activity Bar Button ───────────────────────────────────
function ActivityBarButton({
  icon,
  active,
  onClick,
  title,
}: {
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-12 h-12 flex items-center justify-center transition-colors relative ${
        active
          ? "text-white"
          : "text-[#858585] hover:text-white"
      }`}
    >
      {active && (
        <div className="absolute left-0 top-1 bottom-1 w-[2px] bg-white rounded-r" />
      )}
      {icon}
    </button>
  );
}
