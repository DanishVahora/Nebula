import { Router, Request, Response } from "express";
import { authenticate } from "../middleware/auth";
import prisma from "../lib/prisma";
import {
  initWorkspaceFiles,
  deleteWorkspaceFiles,
  getFileTree,
  listDirectory,
  readFile,
  writeFile,
  createEntry,
  renameEntry,
  deleteEntry,
  workspaceExists,
  getAllFiles,
} from "../lib/workspace";
import { TEMPLATE_META, type TemplateId } from "../lib/templates";
import { provisionWorkspace } from "../lib/provisioner";

const router = Router();

// Track workspaces currently being provisioned (prevents double-setup)
const provisioningWorkspaces = new Set<string>();

// ── Helper: verify workspace ownership ──────────────────
async function verifyOwnership(workspaceId: string, userId: string) {
  const workspace = await prisma.workspace.findFirst({
    where: { id: workspaceId, userId },
  });
  return workspace as (typeof workspace & { template?: string | null }) | null;
}

// ── Get workspace info ──────────────────────────────────
router.get(
  "/:workspaceId",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const workspace = await verifyOwnership(
        req.params.workspaceId as string,
        req.user!.userId
      );
      if (!workspace) {
        res.status(404).json({ error: "Workspace not found" });
        return;
      }

      // Only lazy-init for active workspaces (provisioning handled via /setup)
      if (workspace.status === "active") {
        const exists = await workspaceExists(workspace.id);
        if (!exists) {
          await initWorkspaceFiles(workspace.id, workspace.template || "blank");
        }
      }

      const templateMeta =
        TEMPLATE_META[(workspace.template as TemplateId) || "blank"] ||
        TEMPLATE_META.blank;

      res.json({
        workspace: {
          ...workspace,
          runCommand: templateMeta.runCommand,
          templateName: templateMeta.name,
        },
      });
    } catch (error) {
      console.error("Get workspace error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ── Initialize workspace files (called on first open) ───
router.post(
  "/:workspaceId/init",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const workspace = await verifyOwnership(
        req.params.workspaceId as string,
        req.user!.userId
      );
      if (!workspace) {
        res.status(404).json({ error: "Workspace not found" });
        return;
      }

      if (workspace.status === "active") {
        const exists = await workspaceExists(workspace.id);
        if (!exists) {
          await initWorkspaceFiles(workspace.id, workspace.template || "blank");
        }
      }

      res.json({ message: "Workspace initialized" });
    } catch (error) {
      console.error("Init workspace error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ── SSE: Provision workspace with log streaming ─────────
router.get(
  "/:workspaceId/setup",
  authenticate,
  async (req: Request, res: Response) => {
    // SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    const workspaceId = req.params.workspaceId as string;

    const workspace = await verifyOwnership(workspaceId, req.user!.userId);
    if (!workspace) {
      res.write(
        `data: ${JSON.stringify({ type: "error", message: "Workspace not found" })}\n\n`
      );
      res.end();
      return;
    }

    // If already active with files on disk, short-circuit
    if (workspace.status === "active") {
      const exists = await workspaceExists(workspace.id);
      if (exists) {
        res.write(
          `data: ${JSON.stringify({ type: "log", message: "Workspace already initialized." })}\n\n`
        );
        res.write(
          `data: ${JSON.stringify({ type: "complete", workspaceId: workspace.id })}\n\n`
        );
        res.end();
        return;
      }
    }

    // Prevent double-provisioning
    if (provisioningWorkspaces.has(workspace.id)) {
      res.write(
        `data: ${JSON.stringify({ type: "log", message: "Workspace setup already in progress..." })}\n\n`
      );
      // Poll until the other run finishes
      const interval = setInterval(async () => {
        if (!provisioningWorkspaces.has(workspace.id)) {
          clearInterval(interval);
          res.write(
            `data: ${JSON.stringify({ type: "complete", workspaceId: workspace.id })}\n\n`
          );
          res.end();
        }
      }, 1000);

      req.on("close", () => clearInterval(interval));
      return;
    }

    provisioningWorkspaces.add(workspace.id);

    const log = (message: string) => {
      try {
        res.write(`data: ${JSON.stringify({ type: "log", message })}\n\n`);
      } catch {
        // connection closed
      }
    };

    try {
      await provisionWorkspace(
        workspace.id,
        workspace.template || "blank",
        log,
        workspace.repoUrl
          ? {
              repoUrl: workspace.repoUrl,
              repoName: workspace.repoName || undefined,
            }
          : undefined
      );

      // Mark workspace as active
      await prisma.workspace.update({
        where: { id: workspace.id },
        data: { status: "active" },
      });

      res.write(
        `data: ${JSON.stringify({ type: "complete", workspaceId: workspace.id })}\n\n`
      );
    } catch (error: any) {
      console.error("Provision error:", error);

      await prisma.workspace.update({
        where: { id: workspace.id },
        data: { status: "failed" },
      });

      res.write(
        `data: ${JSON.stringify({ type: "error", message: error.message || "Setup failed" })}\n\n`
      );
    } finally {
      provisioningWorkspaces.delete(workspace.id);
      res.end();
    }
  }
);

// ── Get full file tree ──────────────────────────────────
router.get(
  "/:workspaceId/files",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const workspace = await verifyOwnership(
        req.params.workspaceId as string,
        req.user!.userId
      );
      if (!workspace) {
        res.status(404).json({ error: "Workspace not found" });
        return;
      }

      const depth = parseInt(req.query.depth as string) || 5;
      const tree = await getFileTree(workspace.id, "", depth);
      res.json({ files: tree });
    } catch (error) {
      console.error("Get file tree error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ── List directory contents ─────────────────────────────
router.get(
  "/:workspaceId/files/list",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const workspace = await verifyOwnership(
        req.params.workspaceId as string,
        req.user!.userId
      );
      if (!workspace) {
        res.status(404).json({ error: "Workspace not found" });
        return;
      }

      const dirPath = (req.query.path as string) || "";
      const entries = await listDirectory(workspace.id, dirPath);
      res.json({ entries });
    } catch (error) {
      console.error("List directory error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ── Flat list of all files (for Quick Open) ─────────────
router.get(
  "/:workspaceId/files/all",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const workspace = await verifyOwnership(
        req.params.workspaceId as string,
        req.user!.userId
      );
      if (!workspace) {
        res.status(404).json({ error: "Workspace not found" });
        return;
      }

      const files = await getAllFiles(workspace.id);
      res.json({ files });
    } catch (error) {
      console.error("Get all files error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ── Read file content ───────────────────────────────────
router.get(
  "/:workspaceId/files/read",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const workspace = await verifyOwnership(
        req.params.workspaceId as string,
        req.user!.userId
      );
      if (!workspace) {
        res.status(404).json({ error: "Workspace not found" });
        return;
      }

      const filePath = req.query.path as string;
      if (!filePath) {
        res.status(400).json({ error: "File path is required" });
        return;
      }

      const content = await readFile(workspace.id, filePath);
      res.json({ content, path: filePath });
    } catch (error: any) {
      if (error.code === "ENOENT") {
        res.status(404).json({ error: "File not found" });
        return;
      }
      console.error("Read file error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ── Save / write file ───────────────────────────────────
router.put(
  "/:workspaceId/files/write",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const workspace = await verifyOwnership(
        req.params.workspaceId as string,
        req.user!.userId
      );
      if (!workspace) {
        res.status(404).json({ error: "Workspace not found" });
        return;
      }

      const { path: filePath, content } = req.body;
      if (!filePath) {
        res.status(400).json({ error: "File path is required" });
        return;
      }

      await writeFile(workspace.id, filePath, content ?? "");

      // Update workspace updatedAt
      await prisma.workspace.update({
        where: { id: workspace.id },
        data: { updatedAt: new Date() },
      });

      res.json({ message: "File saved", path: filePath });
    } catch (error) {
      console.error("Write file error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ── Create file or folder ───────────────────────────────
router.post(
  "/:workspaceId/files/create",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const workspace = await verifyOwnership(
        req.params.workspaceId as string,
        req.user!.userId
      );
      if (!workspace) {
        res.status(404).json({ error: "Workspace not found" });
        return;
      }

      const { path: entryPath, type } = req.body;
      if (!entryPath || !type) {
        res.status(400).json({ error: "Path and type are required" });
        return;
      }

      await createEntry(workspace.id, entryPath, type);
      res.status(201).json({ message: `${type} created`, path: entryPath });
    } catch (error) {
      console.error("Create entry error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ── Rename file or folder ───────────────────────────────
router.put(
  "/:workspaceId/files/rename",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const workspace = await verifyOwnership(
        req.params.workspaceId as string,
        req.user!.userId
      );
      if (!workspace) {
        res.status(404).json({ error: "Workspace not found" });
        return;
      }

      const { oldPath, newPath } = req.body;
      if (!oldPath || !newPath) {
        res.status(400).json({ error: "oldPath and newPath are required" });
        return;
      }

      await renameEntry(workspace.id, oldPath, newPath);
      res.json({ message: "Renamed", oldPath, newPath });
    } catch (error) {
      console.error("Rename error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ── Delete file or folder ───────────────────────────────
router.delete(
  "/:workspaceId/files/delete",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const workspace = await verifyOwnership(
        req.params.workspaceId as string,
        req.user!.userId
      );
      if (!workspace) {
        res.status(404).json({ error: "Workspace not found" });
        return;
      }

      const filePath = req.query.path as string;
      if (!filePath) {
        res.status(400).json({ error: "File path is required" });
        return;
      }

      await deleteEntry(workspace.id, filePath);
      res.json({ message: "Deleted", path: filePath });
    } catch (error) {
      console.error("Delete error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

export default router;
