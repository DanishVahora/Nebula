import { Router, Request, Response } from "express";
import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";
import cookie from "cookie";
import { Server } from "http";
import { authenticate } from "../middleware/auth";
import prisma from "../lib/prisma";
import { getWorkspacePath, workspaceExists } from "../lib/workspace";
import { terminalManager } from "../lib/terminal-manager";
import { verifyToken } from "../lib/jwt";

const router = Router();

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

      res.json({
        terminalId: session.id,
        workspaceId: workspace.id,
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

      const terminalIds = terminalManager.list(workspace.id);
      res.json({ terminals: terminalIds });
    } catch (error) {
      console.error("List terminals error:", error);
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

    // ── Authenticate via cookie ─────────────────────
    try {
      const cookies = cookie.parse(request.headers.cookie || "");
      const token = cookies.token;
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
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
    }
  });

  wss.on(
    "connection",
    (ws: WebSocket, _request: IncomingMessage, session: any) => {
      const ptyProcess = session.process;

      // PTY → WebSocket (terminal output to client)
      const dataHandler = (data: string) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(data);
        }
      };
      ptyProcess.onData(dataHandler);

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

      // Clean up on close
      ws.on("close", () => {
        // We don't kill the PTY on WS close — user can reconnect
        // The PTY lives until explicitly killed or workspace cleanup
      });

      ws.on("error", () => {
        // Swallow WS errors
      });

      // If PTY exits, notify and close WS
      ptyProcess.onExit(
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
