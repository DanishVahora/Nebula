import { terminalManager, TerminalSession } from "./terminal-manager";
import { portRegistry } from "./preview-manager";
import { workspaceWatcher } from "./workspace-watcher";
import net from "net";

// ── Background port scanning ───────────────────────────
// Register a callback so that PTY output is always scanned for ports,
// even when no WebSocket client is connected (e.g. during page reload).
// Previously port scanning only happened inside the WS onData handler,
// which meant ports detected during a reload window were lost.
terminalManager.setOnDataCallback((workspaceId, data) => {
  portRegistry.scanOutput(workspaceId, data);
});

/** How long to keep exited terminal sessions before pruning (ms) */
const STALE_TERMINAL_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Persisted IDE UI state that survives page reloads.
 * Stored in-memory per workspace; sent to the client on session restore.
 */
export interface WorkspaceUIState {
  previewOpen: boolean;
  activePreviewPort: number | null;
  showTerminal: boolean;
  sidebarPanel: string;
}

const DEFAULT_UI_STATE: WorkspaceUIState = {
  previewOpen: false,
  activePreviewPort: null,
  showTerminal: true,
  sidebarPanel: "files",
};

/**
 * Represents the full persisted state of a workspace session.
 * Returned to the client so it can restore terminals, ports, and preview
 * in a single round-trip after a page reload.
 */
export interface WorkspaceSessionState {
  /** Whether this workspace has any active session state */
  active: boolean;
  terminals: {
    id: string;
    createdAt: string;
    exited: boolean;
    exitCode: number | null;
  }[];
  /** Dev-server ports that are still listening */
  ports: number[];
  /** Persisted IDE UI state */
  uiState: WorkspaceUIState;
}

/**
 * Unified session manager that coordinates terminal and port state
 * for each workspace.  Sits as a facade over TerminalManager and
 * PortRegistry so consumers can get/restore a workspace session in
 * one call.
 *
 * Singleton — import `sessionManager` from this module.
 */
class WorkspaceSessionManager {
  /** In-memory UI state per workspace */
  private uiStates = new Map<string, WorkspaceUIState>();

  // ── UI State ─────────────────────────────────────────

  /** Save (merge) IDE UI state for a workspace */
  setUIState(workspaceId: string, partial: Partial<WorkspaceUIState>): void {
    const current = this.uiStates.get(workspaceId) || { ...DEFAULT_UI_STATE };
    this.uiStates.set(workspaceId, { ...current, ...partial });
  }

  /** Get the current UI state for a workspace */
  getUIState(workspaceId: string): WorkspaceUIState {
    return this.uiStates.get(workspaceId) || { ...DEFAULT_UI_STATE };
  }

  // ── Query ────────────────────────────────────────────

  /** Return the full session snapshot for a workspace */
  getSession(workspaceId: string): WorkspaceSessionState {
    // Auto-cleanup: prune terminals that exited more than TTL ago
    this.cleanupStaleTerminals(workspaceId);

    const sessions = terminalManager.list(workspaceId);
    const ports = portRegistry.getPorts(workspaceId);
    const uiState = this.getUIState(workspaceId);

    const terminals = sessions.map((s) => ({
      id: s.id,
      createdAt: s.createdAt.toISOString(),
      exited: s.exited,
      exitCode: s.exitCode,
    }));

    return {
      active: terminals.length > 0 || ports.length > 0,
      terminals,
      ports,
      uiState,
    };
  }

  /** Check if a workspace has any live session (non-exited terminals or open ports) */
  hasActiveSession(workspaceId: string): boolean {
    const sessions = terminalManager.list(workspaceId);
    const hasLiveTerminal = sessions.some((s) => !s.exited);
    const hasPorts = portRegistry.getPorts(workspaceId).length > 0;
    return hasLiveTerminal || hasPorts;
  }

  // ── Terminal delegation ──────────────────────────────

  createTerminal(workspaceId: string, cwd: string): TerminalSession {
    return terminalManager.create(workspaceId, cwd);
  }

  getTerminal(workspaceId: string, terminalId: string) {
    return terminalManager.get(workspaceId, terminalId);
  }

  listTerminals(workspaceId: string) {
    return terminalManager.list(workspaceId);
  }

  getScrollback(workspaceId: string, terminalId: string) {
    return terminalManager.getScrollback(workspaceId, terminalId);
  }

  killTerminal(workspaceId: string, terminalId: string) {
    return terminalManager.kill(workspaceId, terminalId);
  }

  resizeTerminal(workspaceId: string, terminalId: string, cols: number, rows: number) {
    return terminalManager.resize(workspaceId, terminalId, cols, rows);
  }

  // ── Port delegation ──────────────────────────────────

  getPorts(workspaceId: string) {
    return portRegistry.getPorts(workspaceId);
  }

  // ── Lifecycle ────────────────────────────────────────

  /** Destroy all session state for a workspace (terminals + ports + watcher) */
  destroySession(workspaceId: string): void {
    terminalManager.killAll(workspaceId);
    portRegistry.clearPorts(workspaceId);
    workspaceWatcher.unwatch(workspaceId);
    this.uiStates.delete(workspaceId);
  }

  /** Dispose everything (server shutdown) */
  disposeAll(): void {
    terminalManager.disposeAll();
    workspaceWatcher.disposeAll();
    this.uiStates.clear();
  }

  // ── Internal ─────────────────────────────────────────

  /** Remove terminal sessions that exited more than STALE_TERMINAL_TTL ago */
  private cleanupStaleTerminals(workspaceId: string): void {
    const sessions = terminalManager.list(workspaceId);
    const now = Date.now();
    for (const s of sessions) {
      if (s.exited && s.exitedAt && now - s.exitedAt.getTime() > STALE_TERMINAL_TTL) {
        terminalManager.kill(workspaceId, s.id);
      }
    }
  }

  /**
   * Check if a port is actually reachable (TCP connect test).
   * Resolves to true if something is listening, false otherwise.
   */
  static verifyPort(port: number, host = "127.0.0.1", timeoutMs = 500): Promise<boolean> {
    return new Promise((resolve) => {
      const sock = net.createConnection({ port, host, timeout: timeoutMs });
      sock.once("connect", () => { sock.destroy(); resolve(true); });
      sock.once("error", () => { resolve(false); });
      sock.once("timeout", () => { sock.destroy(); resolve(false); });
    });
  }

  /**
   * Return only the ports that are actually reachable.
   * Useful for validating session state after long idle periods.
   */
  async getVerifiedPorts(workspaceId: string): Promise<number[]> {
    const ports = portRegistry.getPorts(workspaceId);
    if (ports.length === 0) return [];
    const results = await Promise.all(
      ports.map(async (p) => {
        const alive = await WorkspaceSessionManager.verifyPort(p);
        if (!alive) portRegistry.removePort(workspaceId, p);
        return alive ? p : null;
      })
    );
    return results.filter((p): p is number => p !== null);
  }
}

/** Singleton instance */
export const sessionManager = new WorkspaceSessionManager();
