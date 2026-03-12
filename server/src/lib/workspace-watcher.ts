import chokidar, { FSWatcher } from "chokidar";
import path from "path";
import { EventEmitter } from "events";
import { getWorkspacePath } from "./workspace";
import { invalidateIndex } from "./context/workspace-indexer";

export type FsEventType = "add" | "change" | "unlink" | "addDir" | "unlinkDir";

export interface FsChangeEvent {
  workspaceId: string;
  event: FsEventType;
  path: string; // relative to workspace project root
}

/**
 * Watches workspace project directories for filesystem changes using chokidar.
 *
 * Emits:
 *   "fs-change" → FsChangeEvent
 *
 * The terminal WebSocket handler forwards these events to connected clients
 * so the file explorer can stay synchronized in real time.
 */
class WorkspaceWatcher extends EventEmitter {
  /** Map<workspaceId, FSWatcher> */
  private watchers = new Map<string, FSWatcher>();

  /** Debounce timers for index invalidation per workspace */
  private invalidationTimers = new Map<string, ReturnType<typeof setTimeout>>();

  /** Directories/patterns to ignore */
  private static IGNORED = [
    "**/node_modules/**",
    "**/.git/**",
    "**/dist/**",
    "**/build/**",
    "**/.next/**",
    "**/.nuxt/**",
    "**/.svelte-kit/**",
    "**/__pycache__/**",
    "**/.cache/**",
    "**/coverage/**",
    "**/.turbo/**",
    "**/.vercel/**",
    "**/.angular/**",
    "**/.output/**",
  ];

  /**
   * Start watching a workspace's project directory.
   * If already watching, this is a no-op.
   */
  watch(workspaceId: string): void {
    if (this.watchers.has(workspaceId)) return;

    const projectDir = getWorkspacePath(workspaceId);

    const watcher = chokidar.watch(projectDir, {
      ignored: WorkspaceWatcher.IGNORED,
      persistent: true,
      ignoreInitial: true,       // Don't fire events for existing files
      awaitWriteFinish: {        // Debounce rapid writes (editor saves, npm installs)
        stabilityThreshold: 150,
        pollInterval: 50,
      },
      // Don't follow symlinks to avoid infinite loops
      followSymlinks: false,
      // Use polling as a fallback for network drives / containers
      usePolling: false,
    });

    const emitChange = (event: FsEventType, absolutePath: string) => {
      // Convert to forward-slash relative path
      const relativePath = path
        .relative(projectDir, absolutePath)
        .split(path.sep)
        .join("/");

      // Skip hidden files (dotfiles at root level are OK, but deep ones aren't usually wanted)
      if (relativePath.startsWith(".")) return;

      const payload: FsChangeEvent = {
        workspaceId,
        event,
        path: relativePath,
      };

      this.emit("fs-change", payload);

      // Debounced invalidation of the workspace context index
      this.scheduleIndexInvalidation(workspaceId);
    };

    watcher
      .on("add", (p) => emitChange("add", p))
      .on("change", (p) => emitChange("change", p))
      .on("unlink", (p) => emitChange("unlink", p))
      .on("addDir", (p) => emitChange("addDir", p))
      .on("unlinkDir", (p) => emitChange("unlinkDir", p))
      .on("error", (err) => {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[Watcher] Error for workspace ${workspaceId}:`, message);
      });

    this.watchers.set(workspaceId, watcher);
  }

  /**
   * Debounce index invalidation so rapid file changes (e.g. npm install)
   * only trigger one invalidation after things settle down (2 seconds).
   */
  private scheduleIndexInvalidation(workspaceId: string): void {
    const existing = this.invalidationTimers.get(workspaceId);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      invalidateIndex(workspaceId);
      this.invalidationTimers.delete(workspaceId);
    }, 2000);

    this.invalidationTimers.set(workspaceId, timer);
  }

  /** Stop watching a workspace and release resources */
  async unwatch(workspaceId: string): Promise<void> {
    const watcher = this.watchers.get(workspaceId);
    if (!watcher) return;
    await watcher.close();
    this.watchers.delete(workspaceId);
  }

  /** Whether a workspace is currently being watched */
  isWatching(workspaceId: string): boolean {
    return this.watchers.has(workspaceId);
  }

  /** Dispose all watchers (server shutdown) */
  async disposeAll(): Promise<void> {
    const promises = Array.from(this.watchers.keys()).map((id) =>
      this.unwatch(id)
    );
    await Promise.all(promises);
  }
}

/** Singleton instance */
export const workspaceWatcher = new WorkspaceWatcher();
