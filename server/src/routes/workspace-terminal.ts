import { Router, Request, Response } from "express";
import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";
import * as cookie from "cookie";
import { Server } from "http";
import { authenticate } from "../middleware/auth";
import prisma from "../lib/prisma";
import { getWorkspacePath, workspaceExists } from "../lib/workspace";
import { terminalManager } from "../lib/terminal-manager";
import { portRegistry } from "../lib/preview-manager";
import { sessionManager } from "../lib/session-manager";
import { workspaceWatcher, type FsChangeEvent } from "../lib/workspace-watcher";
import { verifyToken, signToken } from "../lib/jwt";

const router = Router();

// ── REST: Get full workspace session state ──────────────
router.get(
  "/:workspaceId/session",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const workspace = await prisma.workspace.findFirst({
        where: {
          id: req.params.workspaceId as string,
          userId: req.user!.userId,
        },
      });
      if (!workspace) {
        res.status(404).json({ error: "Workspace not found" });
        return;
      }

      const session = sessionManager.getSession(workspace.id);

      // Validate ports are still reachable (removes stale ones)
      const verifiedPorts = await sessionManager.getVerifiedPorts(workspace.id);
      session.ports = verifiedPorts;

      res.json(session);
    } catch (error) {
      console.error("Get session error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ── REST: Save IDE UI state (preview, terminal, sidebar) ──
router.put(
  "/:workspaceId/session/ui-state",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const workspace = await prisma.workspace.findFirst({
        where: {
          id: req.params.workspaceId as string,
          userId: req.user!.userId,
        },
      });
      if (!workspace) {
        res.status(404).json({ error: "Workspace not found" });
        return;
      }

      const { previewOpen, activePreviewPort, showTerminal, sidebarPanel } = req.body;
      sessionManager.setUIState(workspace.id, {
        ...(typeof previewOpen === "boolean" && { previewOpen }),
        ...(activePreviewPort !== undefined && { activePreviewPort }),
        ...(typeof showTerminal === "boolean" && { showTerminal }),
        ...(typeof sidebarPanel === "string" && { sidebarPanel }),
      });

      res.json({ message: "UI state saved" });
    } catch (error) {
      console.error("Save UI state error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ── REST: Get active preview ports for a workspace ──────
router.get(
  "/:workspaceId/ports",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const workspace = await prisma.workspace.findFirst({
        where: {
          id: req.params.workspaceId as string,
          userId: req.user!.userId,
        },
      });
      if (!workspace) {
        res.status(404).json({ error: "Workspace not found" });
        return;
      }

      const ports = portRegistry.getPorts(workspace.id);
      res.json({ ports });
    } catch (error) {
      console.error("Get ports error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ── REST: Create a new terminal ─────────────────────────
router.post(
  "/:workspaceId/terminal",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const workspace = await prisma.workspace.findFirst({
        where: {
          id: req.params.workspaceId as string,
          userId: req.user!.userId,
        },
      });
      if (!workspace) {
        res.status(404).json({ error: "Workspace not found" });
        return;
      }

      const exists = await workspaceExists(workspace.id);
      if (!exists) {
        res.status(400).json({ error: "Workspace files not initialized" });
        return;
      }

      const cwd = getWorkspacePath(workspace.id);
      const session = terminalManager.create(workspace.id, cwd);

      // Generate a short-lived token the client can pass as a query-param
      // when opening the WebSocket (avoids cross-origin cookie issues).
      const wsToken = signToken({
        userId: req.user!.userId,
        email: (req as any).user.email ?? "",
        role: (req as any).user.role ?? "user",
      });

      res.json({
        terminalId: session.id,
        workspaceId: workspace.id,
        wsToken,
      });
    } catch (error) {
      console.error("Create terminal error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ── REST: List terminals for a workspace ────────────────
router.get(
  "/:workspaceId/terminals",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const workspace = await prisma.workspace.findFirst({
        where: {
          id: req.params.workspaceId as string,
          userId: req.user!.userId,
        },
      });
      if (!workspace) {
        res.status(404).json({ error: "Workspace not found" });
        return;
      }

      const sessions = terminalManager.list(workspace.id);
      res.json({
        terminals: sessions.map((s) => ({
          id: s.id,
          createdAt: s.createdAt.toISOString(),
          exited: s.exited,
          exitCode: s.exitCode,
        })),
      });
    } catch (error) {
      console.error("List terminals error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ── REST: Attach / reconnect to an existing terminal ────
router.post(
  "/:workspaceId/terminal/:terminalId/attach",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const workspace = await prisma.workspace.findFirst({
        where: {
          id: req.params.workspaceId as string,
          userId: req.user!.userId,
        },
      });
      if (!workspace) {
        res.status(404).json({ error: "Workspace not found" });
        return;
      }

      const session = terminalManager.get(
        workspace.id,
        req.params.terminalId as string
      );
      if (!session) {
        res.status(404).json({ error: "Terminal not found" });
        return;
      }

      // Generate a fresh short-lived token for the WebSocket connection
      const wsToken = signToken({
        userId: req.user!.userId,
        email: (req as any).user.email ?? "",
        role: (req as any).user.role ?? "user",
      });

      res.json({
        terminalId: session.id,
        workspaceId: workspace.id,
        wsToken,
        exited: session.exited,
        exitCode: session.exitCode,
      });
    } catch (error) {
      console.error("Attach terminal error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ── REST: Kill a terminal ───────────────────────────────
router.delete(
  "/:workspaceId/terminal/:terminalId",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const workspace = await prisma.workspace.findFirst({
        where: {
          id: req.params.workspaceId as string,
          userId: req.user!.userId,
        },
      });
      if (!workspace) {
        res.status(404).json({ error: "Workspace not found" });
        return;
      }

      const killed = terminalManager.kill(
        workspace.id,
        req.params.terminalId as string
      );
      if (!killed) {
        res.status(404).json({ error: "Terminal not found" });
        return;
      }

      res.json({ message: "Terminal killed" });
    } catch (error) {
      console.error("Kill terminal error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ── REST: Resize a terminal ─────────────────────────────
router.post(
  "/:workspaceId/terminal/:terminalId/resize",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const workspace = await prisma.workspace.findFirst({
        where: {
          id: req.params.workspaceId as string,
          userId: req.user!.userId,
        },
      });
      if (!workspace) {
        res.status(404).json({ error: "Workspace not found" });
        return;
      }

      const { cols, rows } = req.body;
      if (!cols || !rows) {
        res.status(400).json({ error: "cols and rows are required" });
        return;
      }

      const resized = terminalManager.resize(
        workspace.id,
        req.params.terminalId as string,
        cols,
        rows
      );
      if (!resized) {
        res.status(404).json({ error: "Terminal not found" });
        return;
      }

      res.json({ message: "Terminal resized" });
    } catch (error) {
      console.error("Resize terminal error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ── WebSocket: Attach to server ─────────────────────────
// URL pattern: /ws/terminal/:workspaceId/:terminalId
export function attachTerminalWebSocket(server: Server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", async (request: IncomingMessage, socket, head) => {
    const url = request.url || "";

    // Only handle our terminal WS path
    const match = url.match(
      /^\/ws\/terminal\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_-]+)/
    );
    if (!match) return; // Let other upgrade handlers (if any) handle it

    const [, workspaceId, terminalId] = match;

    // ── Authenticate via cookie OR query-param token ─
    try {
      // Try query-param token first (handles cross-origin WS from dev server)
      const urlObj = new URL(url, `http://${request.headers.host}`);
      const queryToken = urlObj.searchParams.get("token");

      // Fall back to cookie
      const cookies = cookie.parse(request.headers.cookie || "");
      const token = queryToken || cookies.token;
      if (!token) {
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }

      const payload = verifyToken(token);

      // Verify workspace ownership
      const workspace = await prisma.workspace.findFirst({
        where: { id: workspaceId, userId: payload.userId },
      });
      if (!workspace) {
        socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
        socket.destroy();
        return;
      }

      // Verify terminal exists
      const session = terminalManager.get(workspaceId, terminalId);
      if (!session) {
        socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
        socket.destroy();
        return;
      }

      // Accept the WebSocket upgrade
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request, session);
      });
    } catch (err) {
      console.error("[WS] Error during upgrade:", err);
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
    }
  });

  wss.on(
    "connection",
    (ws: WebSocket, _request: IncomingMessage, session: any) => {
      const ptyProcess = session.process;
      const workspaceId: string = session.workspaceId;

      // ── Replay scrollback buffer to the reconnecting client ──
      const scrollback = terminalManager.getScrollback(workspaceId, session.id);
      if (scrollback && ws.readyState === WebSocket.OPEN) {
        ws.send(scrollback);
      }

      // ── Re-send already-detected ports so client restores preview ──
      const existingPorts = portRegistry.getPorts(workspaceId);
      for (const port of existingPorts) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "port-open", port }));
        }
      }

      // If the process already exited before this WS connected, notify
      if (session.exited) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(`\r\n[Process exited with code ${session.exitCode ?? "unknown"}]\r\n`);
        }
      }

      // PTY → WebSocket (terminal output to client)
      const dataDisposable = ptyProcess.onData((data: string) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(data);
        }
      });

      // Listen for new port detections from the PortRegistry (which is
      // fed by the background scanner in terminal-manager).  This fires
      // even when the port was detected from a *different* terminal in
      // the same workspace, keeping all connected clients in sync.
      const onPortOpen = (evt: { workspaceId: string; port: number }) => {
        if (evt.workspaceId === workspaceId && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "port-open", port: evt.port }));
        }
      };
      const onPortClose = (evt: { workspaceId: string; port: number }) => {
        if (evt.workspaceId === workspaceId && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "port-close", port: evt.port }));
        }
      };
      portRegistry.on("port-open", onPortOpen);
      portRegistry.on("port-close", onPortClose);

      // ── Filesystem change events ──────────────────────────
      // Start watching the workspace project directory (no-op if already watching)
      workspaceWatcher.watch(workspaceId);

      const onFsChange = (evt: FsChangeEvent) => {
        if (evt.workspaceId === workspaceId && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "fs-change", event: evt.event, path: evt.path }));
        }
      };
      workspaceWatcher.on("fs-change", onFsChange);

      // WebSocket → PTY (user input to terminal)
      ws.on("message", (message: any) => {
        try {
          const msg = message.toString();

          // Check if it's a JSON control message
          if (msg.startsWith("{")) {
            try {
              const parsed = JSON.parse(msg);
              if (parsed.type === "resize" && parsed.cols && parsed.rows) {
                ptyProcess.resize(parsed.cols, parsed.rows);
                return;
              }
            } catch {
              // Not JSON, treat as raw input
            }
          }

          // Raw input
          ptyProcess.write(msg);
        } catch {
          // Ignore write errors
        }
      });

      // Clean up on close — dispose this WS's data listener but keep PTY alive
      ws.on("close", () => {
        try { dataDisposable.dispose(); } catch { /* already disposed */ }
        try { exitDisposable.dispose(); } catch { /* already disposed */ }
        portRegistry.off("port-open", onPortOpen);
        portRegistry.off("port-close", onPortClose);
        workspaceWatcher.off("fs-change", onFsChange);
      });

      ws.on("error", () => {
        // Swallow WS errors
      });

      // If PTY exits while this WS is connected, notify and close.
      // Using a disposable so the listener is removed when the WS closes,
      // preventing a listener leak when clients disconnect and reconnect.
      const exitDisposable = ptyProcess.onExit(
        ({ exitCode }: { exitCode: number; signal?: number }) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(`\r\n[Process exited with code ${exitCode}]\r\n`);
            ws.close();
          }
          // Clean up the session
          terminalManager.kill(session.workspaceId, session.id);
        }
      );
    }
  );

  return wss;
}

export default router;
