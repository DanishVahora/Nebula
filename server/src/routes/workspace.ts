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
} from "../lib/workspace";
import { TEMPLATE_META, type TemplateId } from "../lib/templates";

const router = Router();

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

      // Ensure files exist on disk
      const exists = await workspaceExists(workspace.id);
      if (!exists) {
        await initWorkspaceFiles(workspace.id, workspace.template || "blank");
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

      const exists = await workspaceExists(workspace.id);
      if (!exists) {
        await initWorkspaceFiles(workspace.id, workspace.template || "blank");
      }

      res.json({ message: "Workspace initialized" });
    } catch (error) {
      console.error("Init workspace error:", error);
      res.status(500).json({ error: "Internal server error" });
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
