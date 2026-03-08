import { Router, Request, Response } from "express";
import { authenticate, requireRole } from "../middleware/auth";
import { signToken } from "../lib/jwt";
import { env } from "../config/env";
import prisma from "../lib/prisma";
import { deleteWorkspaceFiles } from "../lib/workspace";

const cookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/",
};

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
      const { name, description, language, template, visibility } = req.body;

      if (!name) {
        res.status(400).json({ error: "Workspace name is required" });
        return;
      }

      // Check for duplicate workspace name for this user
      const existing = await prisma.workspace.findFirst({
        where: {
          userId: req.user!.userId,
          name: name.trim(),
        },
      });
      if (existing) {
        res.status(409).json({
          error: `A workspace named "${name.trim()}" already exists. Please choose a different name.`,
        });
        return;
      }

      const workspace = await prisma.workspace.create({
        data: {
          name,
          description: description || null,
          language: language || null,
          template: template || null,
          visibility: visibility || "private",
          status: "provisioning",
          userId: req.user!.userId,
        },
      });

      // Workspace files are initialized via the SSE /setup endpoint
      // (the frontend opens an EventSource after receiving the workspace id)

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

      // Clean up workspace files from disk
      await deleteWorkspaceFiles(id);

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
        where: { createdBy: req.user!.userId },
        include: {
          classroom: { select: { id: true, name: true } },
          _count: { select: { testCases: true, submissions: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      res.json({ assignments });
    } catch (error) {
      console.error("Get assignments error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ── Update user role ───────────────────────────────────
router.patch("/role", authenticate, async (req: Request, res: Response) => {
  try {
    const { role } = req.body;
    const validRoles = ["STUDENT", "TEACHER"];

    if (!role || !validRoles.includes(role)) {
      res.status(400).json({ error: "Invalid role. Must be STUDENT or TEACHER." });
      return;
    }

    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data: { role },
      select: { id: true, email: true, name: true, role: true },
    });

    // Re-issue JWT with updated role
    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });
    res.cookie("token", token, cookieOptions);

    res.json({ user });
  } catch (error) {
    console.error("Update role error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Teacher-only: Create assignment (legacy — use /api/assignments instead) ─
router.post(
  "/assignments",
  authenticate,
  requireRole("TEACHER"),
  async (req: Request, res: Response) => {
    try {
      const { classroomId, title, description, type, deadline } = req.body;

      if (!classroomId || !title) {
        res.status(400).json({ error: "classroomId and title are required" });
        return;
      }

      const assignment = await prisma.assignment.create({
        data: {
          title,
          description: description || null,
          type: type || "WEB_DEV",
          deadline: deadline ? new Date(deadline) : null,
          classroomId,
          createdBy: req.user!.userId,
        },
      });

      res.status(201).json({ assignment });
    } catch (error) {
      console.error("Create assignment error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

export default router;
