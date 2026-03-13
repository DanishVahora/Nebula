import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { workspaceAPI } from "@/lib/api";
import { IDEToolbar } from "@/components/ide/IDEToolbar";
import { FileExplorer } from "@/components/ide/FileExplorer";
import { EditorTabs } from "@/components/ide/EditorTabs";
import { DiffViewer } from "@/components/ide/DiffViewer";
import { TerminalPanel } from "@/components/ide/TerminalPanel";
import { PreviewPanel } from "@/components/ide/PreviewPanel";
import { GitPanel } from "@/components/ide/GitPanel";
import { PortsPanel } from "@/components/ide/PortsPanel";
import { QuickOpen } from "@/components/ide/QuickOpen";
import { AIContextPanel } from "@/components/ide/AIContextPanel";
import { AIErrorResolverPanel } from "@/components/ide/AIErrorResolverPanel";
import { DeploymentsPanel } from "@/components/ide/DeploymentsPanel";
import {
  CommandPalette,
  type PaletteCommand,
} from "@/components/ide/CommandPalette";
import { aiAPI } from "@/lib/api";
import {
  Loader2,
  AlertCircle,
  Files,
  GitBranch,
  Search,
  Settings,
  Terminal,
  Globe,
  Network,
  FilePlus,
  FolderPlus,
  Play,
  RotateCcw,
  Package,
  GitCommit,
  Upload,
  Download,
  Save,
  Eye,
  BrainCircuit,
  Sparkles,
  Rocket,
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

type SidebarPanel = "files" | "git" | "search" | "ports" | "ai" | "ai-error" | "deployments";

/** Format an AI error-fix result as a Markdown hover tooltip. */
function formatHoverMarkdown(data: { explanation: string; suggestedFix: string; correctedCode: string }): string {
  const parts: string[] = [];
  parts.push("**\u26A0\uFE0F AI Explanation**");
  if (data.explanation) parts.push(data.explanation);
  if (data.suggestedFix) {
    parts.push("**Suggested Fix:**");
    parts.push(data.suggestedFix);
  }
  if (data.correctedCode) {
    parts.push("```\n" + data.correctedCode + "\n```");
  }
  return parts.join("\n\n");
}

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
  const [previewPorts, setPreviewPorts] = useState<number[]>([]);
  const [activePreviewPort, setActivePreviewPort] = useState<number | null>(null);
  const [terminalHeight, setTerminalHeight] = useState(220);

  // Quick Open (Ctrl+P)
  const [showQuickOpen, setShowQuickOpen] = useState(false);

  // Command Palette (Ctrl+Shift+P)
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  // Monaco editor refs for hover provider
  const monacoInstanceRef = useRef<any>(null);
  const hoverProviderRef = useRef<any>(null);
  const hoverCacheRef = useRef<Map<string, { explanation: string; suggestedFix: string; correctedCode: string }>>(new Map());



  // Git
  const [gitBranch, setGitBranch] = useState<string | null>(null);
  const [gitStatus, setGitStatus] = useState<any>(null);

  // Diff viewer state
  const [diffState, setDiffState] = useState<{
    filePath: string;
    original: string;
    modified: string;
    language: string;
  } | null>(null);

  // Autosave timer
  const autosaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Keep a ref to tabs so save can always read the latest state
  const tabsRef = useRef<FileTab[]>([]);
  tabsRef.current = tabs;

  // Resizing terminal
  const isResizingRef = useRef(false);

  // ── Register Monaco hover provider for AI error explanations ────
  const handleEditorMount = useCallback((_editor: any, monaco: any) => {
    monacoInstanceRef.current = monaco;

    // Dispose previous provider if re-mounted
    if (hoverProviderRef.current) {
      hoverProviderRef.current.dispose();
    }

    // Debounce helper: only one in-flight request at a time
    let pending: AbortController | null = null;

    hoverProviderRef.current = monaco.languages.registerHoverProvider("*", {
      provideHover: async (model: any, position: any) => {
        if (!workspaceId) return null;

        // Check if there is a marker (error/warning) at this position
        const markers = monaco.editor.getModelMarkers({ resource: model.uri });
        const marker = markers.find(
          (m: any) =>
            m.severity === monaco.MarkerSeverity.Error &&
            position.lineNumber >= m.startLineNumber &&
            position.lineNumber <= m.endLineNumber &&
            (position.lineNumber > m.startLineNumber || position.column >= m.startColumn) &&
            (position.lineNumber < m.endLineNumber || position.column <= m.endColumn)
        );

        if (!marker) return null;

        const cacheKey = `${model.uri.path}:${marker.startLineNumber}:${marker.message}`;
        const cached = hoverCacheRef.current.get(cacheKey);
        if (cached) {
          return {
            range: new monaco.Range(
              marker.startLineNumber, marker.startColumn,
              marker.endLineNumber, marker.endColumn
            ),
            contents: [
              { value: formatHoverMarkdown(cached) },
            ],
          };
        }

        // Cancel any previous in-flight request
        if (pending) pending.abort();
        pending = new AbortController();

        try {
          // Derive relative file path from model URI
          const filePath = model.uri.path.replace(/^\//, "");
          const res = await aiAPI.errorFix({
            workspaceId: workspaceId!,
            filePath,
            errorLine: marker.startLineNumber,
            errorMessage: marker.message,
          });

          const data = res.data;
          hoverCacheRef.current.set(cacheKey, data);

          return {
            range: new monaco.Range(
              marker.startLineNumber, marker.startColumn,
              marker.endLineNumber, marker.endColumn
            ),
            contents: [
              { value: formatHoverMarkdown(data) },
            ],
          };
        } catch {
          return null;
        } finally {
          pending = null;
        }
      },
    });
  }, [workspaceId]);

  // ── Handle dev-server port detection (from backend WS event) ────
  const handlePortDetected = useCallback((port: number) => {
    setPreviewPorts((prev) => {
      if (prev.includes(port)) return prev;
      return [...prev, port];
    });
    // Auto-select the first detected port and open the preview panel
    setActivePreviewPort((current) => current ?? port);
    setShowPreview(true);
  }, []);

  // ── Load workspace ──────────────────────────────────────
  const loadWorkspace = useCallback(async () => {
    if (!workspaceId) return;
    try {
      setLoading(true);
      const res = await workspaceAPI.getWorkspace(workspaceId);
      setWorkspace(res.data.workspace);
      setError(null);

      // Restore full session state (terminals + ports + UI state)
      try {
        const sessionRes = await workspaceAPI.getSession(workspaceId);
        const { ports, uiState } = sessionRes.data;

        // Restore preview ports
        if (ports.length > 0) {
          setPreviewPorts(ports);
          setActivePreviewPort(uiState?.activePreviewPort ?? ports[0]);
          setShowPreview(uiState?.previewOpen ?? true);
        }

        // Restore UI state
        if (uiState) {
          setShowTerminal(uiState.showTerminal);
          if (uiState.sidebarPanel) {
            setActiveSidebarPanel(uiState.sidebarPanel as SidebarPanel);
          }
        }
      } catch {
        // Session API may not be available yet — fall back to ports
        try {
          const portsRes = await workspaceAPI.getActivePorts(workspaceId);
          const ports = portsRes.data.ports;
          if (ports.length > 0) {
            setPreviewPorts(ports);
            setActivePreviewPort(ports[0]);
            setShowPreview(true);
          }
        } catch {
          // Ports API may not be available yet
        }
      }
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

  // ── Debounced fs-change handler ─────────────────────────
  const fsChangeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleFsChange = useCallback((_event: string, _path: string) => {
    // Debounce: coalesce rapid filesystem events into a single tree refresh
    if (fsChangeTimerRef.current) clearTimeout(fsChangeTimerRef.current);
    fsChangeTimerRef.current = setTimeout(() => {
      loadFileTree();
    }, 300);
  }, [loadFileTree]);

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

  // ── Open diff view for a git-changed file ──────────────
  const openDiffView = useCallback(
    async (filePath: string) => {
      if (!workspaceId) return;
      try {
        const res = await workspaceAPI.gitDiff(workspaceId, filePath);
        setDiffState({
          filePath: res.data.filePath,
          original: res.data.original,
          modified: res.data.modified,
          language: getLanguageFromPath(filePath),
        });
        // Clear active regular tab so the diff view takes over the editor area
        setActiveTab(null);
      } catch {
        // If diff fetch fails, just open the file normally
        openFile(filePath);
      }
    },
    [workspaceId, openFile]
  );

  // ── Save file ───────────────────────────────────────────
  const saveFile = useCallback(
    async (filePath: string) => {
      if (!workspaceId) return;
      // Read from ref so we always get the latest tabs state,
      // even when called from a stale setTimeout closure.
      const currentTabs = tabsRef.current;
      const tab = currentTabs.find((t) => t.path === filePath);
      if (!tab || !tab.isDirty) return;
      try {
        await workspaceAPI.writeFile(workspaceId, filePath, tab.content);
        setTabs((prev) => prev.map((t) => t.path === filePath ? { ...t, isDirty: false } : t));
      } catch (err) {
        console.error("[IDE] Save failed for", filePath, err);
      }
    },
    [workspaceId]
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



  // ── Git operations ──────────────────────────────────────
  const gitCommit = useCallback(
    async (message: string) => {
      if (!workspaceId) return;
      try {
        await workspaceAPI.gitCommit(workspaceId, message);
        loadGitStatus();
      } catch { /* Commit failed */ }
    },
    [workspaceId, loadGitStatus]
  );

  const gitPush = useCallback(async () => {
    if (!workspaceId) return;
    try {
      await workspaceAPI.gitPush(workspaceId);
    } catch { /* Push failed */ }
  }, [workspaceId]);

  const gitPull = useCallback(async () => {
    if (!workspaceId) return;
    try {
      await workspaceAPI.gitPull(workspaceId);
      loadFileTree();
    } catch { /* Pull failed */ }
  }, [workspaceId, loadFileTree]);

  const gitInitRepo = useCallback(async () => {
    if (!workspaceId) return;
    try {
      await workspaceAPI.gitInit(workspaceId);
      loadGitStatus();
    } catch { /* Init failed */ }
  }, [workspaceId, loadGitStatus]);

  const gitStage = useCallback(async (files?: string[]) => {
    if (!workspaceId) return;
    try {
      await workspaceAPI.gitStage(workspaceId, files);
      loadGitStatus();
    } catch { /* Stage failed */ }
  }, [workspaceId, loadGitStatus]);

  const gitUnstage = useCallback(async (files?: string[]) => {
    if (!workspaceId) return;
    try {
      await workspaceAPI.gitUnstage(workspaceId, files);
      loadGitStatus();
    } catch { /* Unstage failed */ }
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

  // ── Persist IDE UI state to server (debounced) ──────────
  const uiStateSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialLoadDoneRef = useRef(false);

  useEffect(() => {
    // Skip saving during the initial load to avoid overwriting server state
    // with defaults before the session is restored.
    if (!workspaceId || !initialLoadDoneRef.current) return;

    if (uiStateSaveTimerRef.current) clearTimeout(uiStateSaveTimerRef.current);
    uiStateSaveTimerRef.current = setTimeout(() => {
      workspaceAPI.saveUIState(workspaceId, {
        previewOpen: showPreview,
        activePreviewPort: activePreviewPort,
        showTerminal,
        sidebarPanel: activeSidebarPanel,
      }).catch(() => { /* ignore save failures */ });
    }, 500);
  }, [workspaceId, showPreview, activePreviewPort, showTerminal, activeSidebarPanel]);

  // ── Initial load ────────────────────────────────────────
  useEffect(() => {
    loadWorkspace().then(() => {
      // Enable UI state saving now that session restore is complete
      initialLoadDoneRef.current = true;
    });
  }, [loadWorkspace]);
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
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "P") {
        e.preventDefault();
        setShowCommandPalette(true);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "p") {
        e.preventDefault();
        setShowQuickOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeTab, saveFile]);

  // ── Dispose hover provider on unmount ───────────────────
  useEffect(() => {
    return () => {
      if (hoverProviderRef.current) {
        hoverProviderRef.current.dispose();
      }
    };
  }, []);

  // ── Derived state (must be above early returns) ─────────
  const activeFileTab = diffState ? null : (tabs.find((t) => t.path === activeTab) || null);
  const isWebTemplate = ["static", "react", "react-ts", "nextjs", "vite-react-ts", "vue", "angular"].includes(workspace?.template || "");
  const canShowPreview = isWebTemplate || previewPorts.length > 0;
  const changedFilesCount = (gitStatus?.modified?.length || 0) + (gitStatus?.untracked?.length || 0);

  const toggleSidebarPanel = useCallback((panel: SidebarPanel) => {
    setActiveSidebarPanel((prev) => {
      if (prev === panel && showSidebar) {
        setShowSidebar(false);
        return prev;
      }
      setShowSidebar(true);
      return panel;
    });
  }, [showSidebar]);

  // ── Command palette commands ────────────────────────────
  const paletteCommands: PaletteCommand[] = useMemo(
    () => [
      {
        id: "create-file",
        label: "Create File",
        category: "File",
        icon: FilePlus,
        action: () => {
          const name = prompt("Enter file name:");
          if (name) createFileOrFolder("", name, "file");
        },
      },
      {
        id: "create-folder",
        label: "Create Folder",
        category: "File",
        icon: FolderPlus,
        action: () => {
          const name = prompt("Enter folder name:");
          if (name) createFileOrFolder("", name, "directory");
        },
      },
      {
        id: "save-file",
        label: "Save Current File",
        category: "File",
        icon: Save,
        shortcut: "Ctrl+S",
        action: () => {
          if (activeTab) saveFile(activeTab);
        },
      },
      {
        id: "search-file",
        label: "Search File (Quick Open)",
        category: "File",
        icon: Search,
        shortcut: "Ctrl+P",
        action: () => setShowQuickOpen(true),
      },
      {
        id: "open-terminal",
        label: "Open Terminal",
        category: "Terminal",
        icon: Terminal,
        shortcut: "Ctrl+`",
        action: () => setShowTerminal(true),
      },
      {
        id: "run-project",
        label: "Run Project",
        category: "Terminal",
        icon: Play,
        action: () => {
          setShowTerminal(true);
          if (workspaceId) {
            workspaceAPI.run(workspaceId, "npm run dev").catch(() => { });
          }
        },
      },
      {
        id: "restart-dev-server",
        label: "Restart Dev Server",
        category: "Terminal",
        icon: RotateCcw,
        action: () => {
          setShowTerminal(true);
          if (workspaceId) {
            workspaceAPI.stop(workspaceId).catch(() => { });
            setTimeout(() => {
              workspaceAPI.run(workspaceId!, "npm run dev").catch(() => { });
            }, 500);
          }
        },
      },
      {
        id: "install-npm",
        label: "Install npm Package",
        category: "Terminal",
        icon: Package,
        action: () => {
          const pkg = prompt("Enter package name to install:");
          if (pkg && workspaceId) {
            setShowTerminal(true);
            workspaceAPI.exec(workspaceId, `npm install ${pkg}`).catch(() => { });
          }
        },
      },
      {
        id: "git-commit",
        label: "Git: Commit",
        category: "Git",
        icon: GitCommit,
        action: () => {
          const message = prompt("Enter commit message:");
          if (message) gitCommit(message);
        },
      },
      {
        id: "git-push",
        label: "Git: Push",
        category: "Git",
        icon: Upload,
        action: () => gitPush(),
      },
      {
        id: "git-pull",
        label: "Git: Pull",
        category: "Git",
        icon: Download,
        action: () => gitPull(),
      },
      {
        id: "toggle-explorer",
        label: "Toggle Explorer Panel",
        category: "View",
        icon: Files,
        action: () => toggleSidebarPanel("files"),
      },
      {
        id: "toggle-git-panel",
        label: "Toggle Source Control Panel",
        category: "View",
        icon: GitBranch,
        action: () => toggleSidebarPanel("git"),
      },
      {
        id: "toggle-ports-panel",
        label: "Toggle Ports Panel",
        category: "View",
        icon: Network,
        action: () => toggleSidebarPanel("ports"),
      },
      {
        id: "toggle-preview",
        label: "Toggle Preview",
        category: "View",
        icon: Eye,
        action: () => setShowPreview((p) => !p),
      },
      {
        id: "toggle-terminal",
        label: "Toggle Terminal",
        category: "View",
        icon: Terminal,
        shortcut: "Ctrl+`",
        action: () => setShowTerminal((p) => !p),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [workspaceId, activeTab, saveFile, createFileOrFolder, gitCommit, gitPush, gitPull, toggleSidebarPanel]
  );

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
          <AlertCircle className="w-10 h-10 text-[#f44747]" />
          <h2 className="text-lg font-semibold text-[#d4d4d4]">Workspace Error</h2>
          <p className="text-sm text-[#858585]">{error || "Workspace not found"}</p>
          <button
            onClick={() => navigate("/dashboard")}
            className="mt-2 px-4 py-2 text-sm bg-[#007acc] text-white rounded hover:bg-[#1177bb] transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#1e1e1e] overflow-hidden select-none">
      {/* ── Quick Open Overlay ────────────────────── */}
      <QuickOpen
        workspaceId={workspaceId!}
        isOpen={showQuickOpen}
        onClose={() => setShowQuickOpen(false)}
        onOpenFile={openFile}
      />

      {/* ── Command Palette ──────────────────────────── */}
      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        commands={paletteCommands}
      />

      {/* ── Title Bar / Toolbar ──────────────────────── */}
      <IDEToolbar
        workspace={workspace}
        onBack={() => navigate("/dashboard")}
        showPreview={showPreview}
        onTogglePreview={() => setShowPreview(!showPreview)}
        isWebTemplate={canShowPreview}
        showTerminal={showTerminal}
        onToggleTerminal={() => setShowTerminal(!showTerminal)}
      />

      {/* ── Main Content ─────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* ── Activity Bar (icon rail) ───────────────── */}
        <div className="w-12 shrink-0 bg-[#181818] flex flex-col items-center py-1 border-r border-[#0f0f0f]">
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
                <Network className="w-[22px] h-[22px]" />
                {previewPorts.length > 0 && (
                  <span className="absolute -top-1 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-[#4ec9b0] text-[#1e1e1e] text-[10px] font-bold flex items-center justify-center">
                    {previewPorts.length}
                  </span>
                )}
              </div>
            }
            active={activeSidebarPanel === "ports" && showSidebar}
            onClick={() => toggleSidebarPanel("ports")}
            title="Ports"
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

          <ActivityBarButton
            icon={<BrainCircuit className="w-[22px] h-[22px]" />}
            active={activeSidebarPanel === "ai" && showSidebar}
            onClick={() => toggleSidebarPanel("ai")}
            title="AI Context"
          />

          <ActivityBarButton
            icon={<Sparkles className="w-[22px] h-[22px]" />}
            active={activeSidebarPanel === "ai-error" && showSidebar}
            onClick={() => toggleSidebarPanel("ai-error")}
            title="AI Error Resolver"
          />

          <ActivityBarButton
            icon={<Rocket className="w-[22px] h-[22px]" />}
            active={activeSidebarPanel === "deployments" && showSidebar}
            onClick={() => toggleSidebarPanel("deployments")}
            title="Deployments"
          />

          <div className="flex-1" />

          <ActivityBarButton
            icon={<Settings className="w-[20px] h-[20px]" />}
            active={false}
            onClick={() => { }}
            title="Settings"
          />
        </div>

        {/* ── Sidebar Panel ──────────────────────────── */}
        {showSidebar && (
          <div className="w-64 shrink-0 bg-[#181818] border-r border-[#2d2d2d] overflow-hidden flex flex-col">
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
            {activeSidebarPanel === "ports" && (
              <PortsPanel
                workspaceId={workspaceId!}
                ports={previewPorts}
                onOpenPreview={(port) => {
                  setActivePreviewPort(port);
                  setShowPreview(true);
                }}
                onRefresh={async () => {
                  try {
                    const res = await workspaceAPI.getActivePorts(workspaceId!);
                    setPreviewPorts(res.data.ports);
                  } catch { /* ignore */ }
                }}
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
                onStage={gitStage}
                onUnstage={gitUnstage}
                onFileClick={(file) => openDiffView(file)}
              />
            )}
            {activeSidebarPanel === "search" && (
              <div className="flex flex-col h-full">
                <div className="px-4 py-3">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#858585]">
                    Search
                  </span>
                </div>
                <div className="px-3 pb-3">
                  <input
                    type="text"
                    placeholder="Search files..."
                    className="w-full px-2.5 py-1.5 text-[13px] bg-[#2d2d2d] border border-[#3c3c3c] rounded text-[#d4d4d4] outline-none focus:border-[#007acc] placeholder-[#6e7681]"
                  />
                </div>
                <div className="flex-1 flex items-center justify-center px-4">
                  <p className="text-[12px] text-[#6e7681] text-center">
                    Type to search across all workspace files
                  </p>
                </div>
              </div>
            )}
            {activeSidebarPanel === "ai" && (
              <AIContextPanel
                workspaceId={workspaceId!}
                activeFile={activeTab}
              />
            )}
            {activeSidebarPanel === "ai-error" && (
              <AIErrorResolverPanel
                workspaceId={workspaceId!}
                activeFile={activeTab}
                onOpenFile={openFile}
              />
            )}
            {activeSidebarPanel === "deployments" && (
              <DeploymentsPanel />
            )}
          </div>
        )}

        {/* ── Editor + Preview + Terminal ─────────── */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Editor + Preview Row */}
          <div className="flex-1 flex min-h-0">
            {/* Editor */}
            <div className="flex-1 flex flex-col min-w-0">
              {diffState ? (
                <DiffViewer
                  filePath={diffState.filePath}
                  originalContent={diffState.original}
                  modifiedContent={diffState.modified}
                  language={diffState.language}
                  onClose={() => {
                    setDiffState(null);
                    // Re-activate the last open tab if any
                    if (tabs.length > 0) {
                      setActiveTab(tabs[tabs.length - 1].path);
                    }
                  }}
                />
              ) : (
                <EditorTabs
                  tabs={tabs}
                  activeTab={activeTab}
                  onTabClick={(path) => { setDiffState(null); setActiveTab(path); }}
                  onTabClose={closeTab}
                  onContentChange={updateFileContent}
                  onSave={saveFile}
                  activeFileTab={activeFileTab}
                  onEditorMount={handleEditorMount}
                />
              )}
            </div>

            {/* Preview */}
            {showPreview && (
              <div className="w-[40%] shrink-0 border-l border-[#2d2d2d]">
                <PreviewPanel
                  workspaceId={workspaceId!}
                  port={activePreviewPort}
                  ports={previewPorts}
                  onPortSelect={setActivePreviewPort}
                  workspace={workspace}
                  onClose={() => setShowPreview(false)}
                />
              </div>
            )}
          </div>

          {/* Terminal resize handle */}
          {showTerminal && (
            <div
              className="h-1 bg-[#2d2d2d] hover:bg-[#007acc] cursor-ns-resize transition-colors shrink-0"
              onMouseDown={handleTerminalResizeStart}
            />
          )}

          {/* Status bar above terminal or bottom bar */}
          {showTerminal && (
            <div style={{ height: terminalHeight }} className="shrink-0">
              <TerminalPanel
                workspaceId={workspaceId!}
                onPortDetected={handlePortDetected}
                onFsChange={handleFsChange}
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
          {activeFileTab && (
            <span className="opacity-80">{activeFileTab.language}</span>
          )}
          <span className="opacity-80">UTF-8</span>
          {previewPorts.length > 0 && (
            <button
              className="flex items-center gap-1 hover:bg-white/10 px-1.5 rounded transition-colors"
              onClick={() => setShowPreview(!showPreview)}
            >
              <Globe className="w-3 h-3" />
              {previewPorts.length === 1
                ? `Port ${previewPorts[0]}`
                : `${previewPorts.length} ports`}
            </button>
          )}
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
      className={`w-12 h-12 flex items-center justify-center transition-colors relative ${active
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
