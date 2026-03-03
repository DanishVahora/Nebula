import { Router, Request, Response } from "express";
import { authenticate } from "../middleware/auth";
import prisma from "../lib/prisma";

const router = Router();

// ── Get user workspaces ────────────────────────────────
router.get(
  "/workspaces",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const workspaces = await prisma.workspace.findMany({
        where: { userId: req.user!.userId },
        orderBy: { updatedAt: "desc" },
      });

      res.json({ workspaces });
    } catch (error) {
      console.error("Get workspaces error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ── Create workspace ───────────────────────────────────
router.post(
  "/workspaces",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { name, description, language } = req.body;

      if (!name) {
        res.status(400).json({ error: "Workspace name is required" });
        return;
      }

      const workspace = await prisma.workspace.create({
        data: {
          name,
          description: description || null,
          language: language || null,
          userId: req.user!.userId,
        },
      });

      res.status(201).json({ workspace });
    } catch (error) {
      console.error("Create workspace error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ── Delete workspace ───────────────────────────────────
router.delete(
  "/workspaces/:id",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const workspace = await prisma.workspace.findFirst({
        where: {
          id,
          userId: req.user!.userId,
        },
      });

      if (!workspace) {
        res.status(404).json({ error: "Workspace not found" });
        return;
      }

      await prisma.workspace.delete({
        where: { id },
      });

      res.json({ message: "Workspace deleted" });
    } catch (error) {
      console.error("Delete workspace error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ── Get user assignments ───────────────────────────────
router.get(
  "/assignments",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const assignments = await prisma.assignment.findMany({
        where: { userId: req.user!.userId },
        orderBy: { createdAt: "desc" },
      });

      res.json({ assignments });
    } catch (error) {
      console.error("Get assignments error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ── Update user role (admin only for testing) ──────────
router.patch("/role", authenticate, async (req: Request, res: Response) => {
  try {
    const { role } = req.body;
    const validRoles = ["STUDENT", "TEACHER", "ADMIN"];

    if (!role || !validRoles.includes(role)) {
      res.status(400).json({ error: "Invalid role" });
      return;
    }

    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data: { role },
      select: { id: true, email: true, name: true, role: true },
    });

    res.json({ user });
  } catch (error) {
    console.error("Update role error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
