import { Router, Request, Response } from "express";
import crypto from "crypto";
import { authenticate, requireRole } from "../middleware/auth";
import prisma from "../lib/prisma";

const router = Router();

/** Generate a short, unique, URL-safe join code (6 chars). */
function generateJoinCode(): string {
  return crypto.randomBytes(4).toString("base64url").slice(0, 6).toUpperCase();
}

// ── Create classroom (TEACHER only) ────────────────────
router.post(
  "/",
  authenticate,
  requireRole("TEACHER"),
  async (req: Request, res: Response) => {
    try {
      const { name, description } = req.body;

      if (!name || typeof name !== "string" || !name.trim()) {
        res.status(400).json({ error: "Classroom name is required" });
        return;
      }

      // Generate a unique join code (retry on collision)
      let joinCode = generateJoinCode();
      let attempts = 0;
      while (attempts < 5) {
        const exists = await prisma.classroom.findUnique({ where: { joinCode } });
        if (!exists) break;
        joinCode = generateJoinCode();
        attempts++;
      }

      const classroom = await prisma.classroom.create({
        data: {
          name: name.trim(),
          description: description?.trim() || null,
          joinCode,
          teacherId: req.user!.userId,
        },
      });

      // Auto-add teacher as a member
      await prisma.classroomMember.create({
        data: {
          classroomId: classroom.id,
          userId: req.user!.userId,
          role: "TEACHER",
        },
      });

      res.status(201).json({ classroom });
    } catch (error) {
      console.error("Create classroom error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ── Join classroom via code (any authenticated user) ───
router.post("/join", authenticate, async (req: Request, res: Response) => {
  try {
    const { joinCode } = req.body;

    if (!joinCode || typeof joinCode !== "string" || !joinCode.trim()) {
      res.status(400).json({ error: "Join code is required" });
      return;
    }

    const classroom = await prisma.classroom.findUnique({
      where: { joinCode: joinCode.trim().toUpperCase() },
      select: { id: true, name: true, teacherId: true },
    });

    if (!classroom) {
      res.status(404).json({ error: "Invalid join code" });
      return;
    }

    // Check if already a member
    const existing = await prisma.classroomMember.findUnique({
      where: {
        classroomId_userId: {
          classroomId: classroom.id,
          userId: req.user!.userId,
        },
      },
    });

    if (existing) {
      res.status(409).json({ error: "You have already joined this classroom" });
      return;
    }

    const memberRole = classroom.teacherId === req.user!.userId ? "TEACHER" : "STUDENT";

    await prisma.classroomMember.create({
      data: {
        classroomId: classroom.id,
        userId: req.user!.userId,
        role: memberRole,
      },
    });

    res.json({ message: `Joined "${classroom.name}" successfully`, classroomId: classroom.id });
  } catch (error) {
    console.error("Join classroom error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Get my classrooms ──────────────────────────────────
router.get("/my", authenticate, async (req: Request, res: Response) => {
  try {
    const memberships = await prisma.classroomMember.findMany({
      where: { userId: req.user!.userId },
      include: {
        classroom: {
          include: {
            _count: { select: { members: true } },
            teacher: { select: { id: true, name: true, avatar: true } },
          },
        },
      },
      orderBy: { joinedAt: "desc" },
    });

    const classrooms = memberships.map((m) => ({
      ...m.classroom,
      myRole: m.role,
      memberCount: m.classroom._count.members,
    }));

    res.json({ classrooms });
  } catch (error) {
    console.error("Get my classrooms error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Get single classroom ───────────────────────────────
router.get("/:id", authenticate, async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    // Verify membership
    const member = await prisma.classroomMember.findUnique({
      where: {
        classroomId_userId: { classroomId: id, userId: req.user!.userId },
      },
    });

    if (!member) {
      res.status(403).json({ error: "You are not a member of this classroom" });
      return;
    }

    const classroom = await prisma.classroom.findUnique({
      where: { id },
      include: {
        teacher: { select: { id: true, name: true, avatar: true, email: true } },
        _count: { select: { members: true } },
      },
    });

    if (!classroom) {
      res.status(404).json({ error: "Classroom not found" });
      return;
    }

    res.json({ classroom: { ...classroom, myRole: member.role } });
  } catch (error) {
    console.error("Get classroom error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Get classroom students (for teachers) ──────────────
router.get("/:id/students", authenticate, async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    // Verify the requester is a teacher of this classroom
    const member = await prisma.classroomMember.findUnique({
      where: {
        classroomId_userId: { classroomId: id, userId: req.user!.userId },
      },
    });

    if (!member || member.role !== "TEACHER") {
      res.status(403).json({ error: "Only teachers can view the student list" });
      return;
    }

    const members = await prisma.classroomMember.findMany({
      where: { classroomId: id, role: "STUDENT" },
      orderBy: { joinedAt: "asc" },
    });

    const userIds = members.map((m) => m.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true, avatar: true },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    res.json({
      students: members.map((m) => ({
        ...userMap.get(m.userId),
        joinedAt: m.joinedAt,
      })),
    });
  } catch (error) {
    console.error("Get classroom students error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
