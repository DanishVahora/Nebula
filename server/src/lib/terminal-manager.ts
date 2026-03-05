import * as pty from "node-pty";
import os from "os";

export interface TerminalSession {
  id: string;
  process: pty.IPty;
  workspaceId: string;
  cwd: string;
  createdAt: Date;
}

/**
 * Manages pseudo-terminal instances per workspace.
 *
 * Structure: Map<workspaceId, Map<terminalId, TerminalSession>>
 */
class TerminalManager {
  private terminals = new Map<string, Map<string, TerminalSession>>();
  private counter = 0;

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
    };

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
  list(workspaceId: string): string[] {
    const map = this.terminals.get(workspaceId);
    return map ? Array.from(map.keys()) : [];
  }

  /** Kill and remove a specific terminal */
  kill(workspaceId: string, terminalId: string): boolean {
    const session = this.terminals.get(workspaceId)?.get(terminalId);
    if (!session) return false;

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
      try {
        session.process.kill();
      } catch {
        // Ignore
      }
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
