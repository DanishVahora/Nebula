import * as pty from "node-pty";
import os from "os";
import { IDisposable } from "node-pty";

/** Callback invoked when the scrollback listener detects new data.
 *  Used by the session layer to scan for ports even when no WS is connected. */
export type OnDataCallback = (workspaceId: string, data: string) => void;

/** Maximum bytes to keep in the scrollback buffer per terminal */
const SCROLLBACK_MAX_BYTES = 64 * 1024; // 64 KB

export interface TerminalSession {
  id: string;
  process: pty.IPty;
  workspaceId: string;
  cwd: string;
  createdAt: Date;
  /** Circular buffer of recent PTY output for replay on reconnect */
  scrollback: string[];
  scrollbackBytes: number;
  /** Disposable for the onData listener that fills the scrollback */
  scrollbackDisposable: IDisposable;
  /** Whether the PTY process has exited */
  exited: boolean;
  exitCode: number | null;
  /** When the PTY process exited (for stale-session cleanup) */
  exitedAt: Date | null;
}

/**
 * Manages pseudo-terminal instances per workspace.
 *
 * Structure: Map<workspaceId, Map<terminalId, TerminalSession>>
 */
class TerminalManager {
  private terminals = new Map<string, Map<string, TerminalSession>>();
  private counter = 0;
  /** Optional callback fired for every PTY data chunk (used for background port scanning) */
  private onDataCallback: OnDataCallback | null = null;

  /** Register a callback that receives all PTY output (for port scanning etc.) */
  setOnDataCallback(cb: OnDataCallback): void {
    this.onDataCallback = cb;
  }

  /** Spawn a new PTY process inside a workspace project directory */
  create(workspaceId: string, cwd: string): TerminalSession {
    const terminalId = `term_${Date.now()}_${++this.counter}`;

    // Choose a sensible shell per platform
    const shell =
      os.platform() === "win32"
        ? "powershell.exe"
        : process.env.SHELL || "/bin/bash";

    const ptyProcess = pty.spawn(shell, [], {
      name: "xterm-256color",
      cols: 120,
      rows: 30,
      cwd,
      env: {
        ...(process.env as Record<string, string>),
        TERM: "xterm-256color",
        COLORTERM: "truecolor",
      },
    });

    const session: TerminalSession = {
      id: terminalId,
      process: ptyProcess,
      workspaceId,
      cwd,
      createdAt: new Date(),
      scrollback: [],
      scrollbackBytes: 0,
      scrollbackDisposable: null as any, // assigned below
      exited: false,
      exitCode: null,
      exitedAt: null,
    };

    // ── Fill scrollback buffer with PTY output ──────────
    session.scrollbackDisposable = ptyProcess.onData((data: string) => {
      session.scrollback.push(data);
      session.scrollbackBytes += data.length;
      // Trim the front of the buffer when it exceeds the limit
      while (session.scrollbackBytes > SCROLLBACK_MAX_BYTES && session.scrollback.length > 1) {
        const removed = session.scrollback.shift()!;
        session.scrollbackBytes -= removed.length;
      }
      // Notify the callback (port scanning) so ports are detected even
      // when no WebSocket client is connected (e.g. during page reload).
      this.onDataCallback?.(workspaceId, data);
    });

    // ── Track process exit ──────────────────────────────
    ptyProcess.onExit(({ exitCode }) => {
      session.exited = true;
      session.exitCode = exitCode;
      session.exitedAt = new Date();
    });

    if (!this.terminals.has(workspaceId)) {
      this.terminals.set(workspaceId, new Map());
    }
    this.terminals.get(workspaceId)!.set(terminalId, session);

    return session;
  }

  /** Get a specific terminal session */
  get(workspaceId: string, terminalId: string): TerminalSession | undefined {
    return this.terminals.get(workspaceId)?.get(terminalId);
  }

  /** List all terminal IDs for a workspace */
  list(workspaceId: string): TerminalSession[] {
    const map = this.terminals.get(workspaceId);
    return map ? Array.from(map.values()) : [];
  }

  /** Get the scrollback buffer content for replay */
  getScrollback(workspaceId: string, terminalId: string): string {
    const session = this.get(workspaceId, terminalId);
    if (!session) return "";
    return session.scrollback.join("");
  }

  /** Kill and remove a specific terminal */
  kill(workspaceId: string, terminalId: string): boolean {
    const session = this.terminals.get(workspaceId)?.get(terminalId);
    if (!session) return false;

    try {
      session.scrollbackDisposable?.dispose();
    } catch { /* already disposed */ }

    try {
      session.process.kill();
    } catch {
      // Process may already be dead
    }
    this.terminals.get(workspaceId)!.delete(terminalId);

    // Clean up empty workspace entries
    if (this.terminals.get(workspaceId)?.size === 0) {
      this.terminals.delete(workspaceId);
    }
    return true;
  }

  /** Kill all terminals for a workspace */
  killAll(workspaceId: string): void {
    const map = this.terminals.get(workspaceId);
    if (!map) return;
    for (const [id, session] of map) {
      try { session.scrollbackDisposable?.dispose(); } catch { /* */ }
      try { session.process.kill(); } catch { /* */ }
    }
    this.terminals.delete(workspaceId);
  }

  /** Resize a terminal */
  resize(
    workspaceId: string,
    terminalId: string,
    cols: number,
    rows: number
  ): boolean {
    const session = this.get(workspaceId, terminalId);
    if (!session) return false;
    try {
      session.process.resize(cols, rows);
    } catch {
      return false;
    }
    return true;
  }

  /** Dispose all terminals (server shutdown) */
  disposeAll(): void {
    for (const [wsId] of this.terminals) {
      this.killAll(wsId);
    }
  }
}

// Singleton instance
export const terminalManager = new TerminalManager();
