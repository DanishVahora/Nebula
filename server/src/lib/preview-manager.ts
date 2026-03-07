import { EventEmitter } from "events";

/**
 * Regex to strip ANSI escape sequences from PTY output.
 * Covers CSI sequences (colors, cursor), OSC sequences (hyperlinks),
 * and simple two-byte escapes.
 */
const ANSI_ESCAPE_REGEX =
  // eslint-disable-next-line no-control-regex
  /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nq-uy=><~]/g;

/**
 * Regex to detect dev-server URLs in terminal PTY output.
 * Matches http://localhost:PORT and http://127.0.0.1:PORT
 */
const DEV_SERVER_URL_REGEX =
  /https?:\/\/(?:localhost|127\.0\.0\.1):(\d{2,5})/g;

export interface PortEvent {
  workspaceId: string;
  port: number;
}

/**
 * Tracks active preview ports per workspace.
 *
 * Emits:
 *   "port-open"  → { workspaceId, port }
 *   "port-close" → { workspaceId, port }
 */
class PortRegistry extends EventEmitter {
  /** Map<workspaceId, Set<port>> */
  private activePorts = new Map<string, Set<number>>();

  /** Scan a chunk of PTY output for dev-server URLs.
   *  Strips ANSI escape codes first so colored output doesn't break matching.
   *  Returns an array of newly-detected ports (empty if none new). */
  scanOutput(workspaceId: string, data: string): number[] {
    const clean = data.replace(ANSI_ESCAPE_REGEX, "");
    const newPorts: number[] = [];
    const matches = clean.matchAll(DEV_SERVER_URL_REGEX);
    for (const match of matches) {
      const port = parseInt(match[1], 10);
      if (port > 0 && port < 65536 && !this.hasPort(workspaceId, port)) {
        this.addPort(workspaceId, port);
        newPorts.push(port);
      }
    }
    return newPorts;
  }

  /** Register a detected dev-server port for a workspace */
  addPort(workspaceId: string, port: number): void {
    if (!this.activePorts.has(workspaceId)) {
      this.activePorts.set(workspaceId, new Set());
    }
    this.activePorts.get(workspaceId)!.add(port);
    this.emit("port-open", { workspaceId, port } as PortEvent);
  }

  /** Remove a port (e.g. when the dev server stops) */
  removePort(workspaceId: string, port: number): void {
    const had = this.activePorts.get(workspaceId)?.delete(port);
    if (this.activePorts.get(workspaceId)?.size === 0) {
      this.activePorts.delete(workspaceId);
    }
    if (had) {
      this.emit("port-close", { workspaceId, port } as PortEvent);
    }
  }

  /** Check if a port is registered for a workspace */
  hasPort(workspaceId: string, port: number): boolean {
    return this.activePorts.get(workspaceId)?.has(port) ?? false;
  }

  /** Get all detected ports for a workspace */
  getPorts(workspaceId: string): number[] {
    return Array.from(this.activePorts.get(workspaceId) || []);
  }

  /** Clear all ports for a workspace (e.g. on workspace cleanup) */
  clearPorts(workspaceId: string): void {
    const ports = this.activePorts.get(workspaceId);
    if (ports) {
      for (const port of ports) {
        this.emit("port-close", { workspaceId, port } as PortEvent);
      }
      this.activePorts.delete(workspaceId);
    }
  }
}

/** Singleton instance */
export const portRegistry = new PortRegistry();
