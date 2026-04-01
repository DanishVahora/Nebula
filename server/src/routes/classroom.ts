import { Router, Request, Response } from "express";
import crypto from "crypto";
import { authenticate, requireRole } from "../middleware/auth";
import prisma from "../lib/prisma";

const router = Router();
const COMPLETED_STATUSES = ["SUBMITTED", "GRADED"] as const;

/** Generate a short, unique, URL-safe join code (6 chars). */
function generateJoinCode(): string {
  return crypto.randomBytes(4).toString("base64url").slice(0, 6).toUpperCase();
}

async function generateUniqueJoinCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const joinCode = generateJoinCode();
    const existing = await prisma.classroom.findUnique({ where: { joinCode } });
    if (!existing) {
      return joinCode;
    }
  }
  throw new Error("Unable to generate unique join code");
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

      const joinCode = await generateUniqueJoinCode();

      const classroom = await prisma.$transaction(async (tx) => {
        const createdClassroom = await tx.classroom.create({
          data: {
            name: name.trim(),
            description: description?.trim() || null,
            joinCode,
            teacherId: req.user!.userId,
          },
        });

        await tx.classroomMember.create({
          data: {
            classroomId: createdClassroom.id,
            userId: req.user!.userId,
            role: "TEACHER",
          },
        });

        return createdClassroom;
      });

      res.status(201).json({ classroom });
    } catch (error) {
      console.error("Create classroom error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ── Join classroom via code (any authenticated user) ───
router.post("/join", authenticate, requireRole("STUDENT"), async (req: Request, res: Response) => {
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

    await prisma.classroomMember.create({
      data: {
        classroomId: classroom.id,
        userId: req.user!.userId,
        role: "STUDENT",
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
    // Query from classroom side to avoid crashing on orphaned membership documents.
    const rawClassrooms = await prisma.classroom.findMany({
      where: {
        members: {
          some: { userId: req.user!.userId },
        },
      },
      include: {
        _count: { select: { members: true } },
        teacher: { select: { id: true, name: true, avatar: true } },
        members: {
          where: { userId: req.user!.userId },
          select: { role: true, joinedAt: true },
        },
      },
    });

    const classrooms = rawClassrooms
      .map((c) => {
        const myMembership = c.members[0];
        if (!myMembership) return null;

        const { joinCode, _count, members, ...classroom } = c;
      const payload = {
        ...classroom,
        memberCount: _count.members,
        myRole: myMembership.role,
        joinedAt: myMembership.joinedAt,
      };

      if (myMembership.role === "TEACHER") {
        return { ...payload, joinCode };
      }

      return payload;
      })
      .filter((c): c is NonNullable<typeof c> => c !== null)
      .sort((a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime())
      .map(({ joinedAt, ...rest }) => rest);

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

    const { joinCode, _count, ...rest } = classroom;
    const payload = {
      ...rest,
      memberCount: _count.members,
      myRole: member.role,
    };

    if (member.role === "TEACHER") {
      res.json({ classroom: { ...payload, joinCode } });
      return;
    }

    res.json({ classroom: payload });
  } catch (error) {
    console.error("Get classroom error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Get classroom students (for teachers) ──────────────
router.get("/:id/students", authenticate, requireRole("TEACHER"), async (req: Request, res: Response) => {
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

// ── Classroom leaderboard (teachers + students) ───────
router.get("/:id/leaderboard", authenticate, async (req: Request, res: Response) => {
  try {
    const classroomId = req.params.id as string;

    const member = await prisma.classroomMember.findUnique({
      where: {
        classroomId_userId: { classroomId, userId: req.user!.userId },
      },
    });

    if (!member) {
      res.status(403).json({ error: "You are not a member of this classroom" });
      return;
    }

    const students = await prisma.classroomMember.findMany({
      where: { classroomId, role: "STUDENT" },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
    });

    const studentIds = students.map((s) => s.userId);

    const submissions = studentIds.length
      ? await prisma.submission.findMany({
          where: {
            userId: { in: studentIds },
            assignment: { classroomId },
          },
          select: {
            userId: true,
            score: true,
            status: true,
          },
        })
      : [];

    const statsByStudent = new Map<
      string,
      { totalScore: number; completedAssignments: number }
    >();

    for (const s of submissions) {
      if (!COMPLETED_STATUSES.includes(s.status as (typeof COMPLETED_STATUSES)[number])) {
        continue;
      }

      const current = statsByStudent.get(s.userId) || {
        totalScore: 0,
        completedAssignments: 0,
      };

      current.totalScore += s.score ?? 0;
      current.completedAssignments += 1;
      statsByStudent.set(s.userId, current);
    }

    const ranked = students
      .map((student) => {
        const stat = statsByStudent.get(student.userId) || {
          totalScore: 0,
          completedAssignments: 0,
        };

        const averageScore =
          stat.completedAssignments > 0
            ? stat.totalScore / stat.completedAssignments
            : 0;

        return {
          userId: student.user.id,
          name: student.user.name || student.user.email || "Unnamed",
          totalScore: stat.totalScore,
          completedAssignments: stat.completedAssignments,
          averageScore: Number(averageScore.toFixed(2)),
        };
      })
      .sort((a, b) => {
        if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
        if (b.completedAssignments !== a.completedAssignments) {
          return b.completedAssignments - a.completedAssignments;
        }
        return a.name.localeCompare(b.name);
      })
      .map((entry, idx) => ({ rank: idx + 1, ...entry }));

    res.json({ leaderboard: ranked });
  } catch (error) {
    console.error("Get classroom leaderboard error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Classroom analytics (teachers + students) ─────────
router.get("/:id/analytics", authenticate, async (req: Request, res: Response) => {
  try {
    const classroomId = req.params.id as string;

    const member = await prisma.classroomMember.findUnique({
      where: {
        classroomId_userId: { classroomId, userId: req.user!.userId },
      },
    });

    if (!member) {
      res.status(403).json({ error: "You are not a member of this classroom" });
      return;
    }

    const [students, assignments] = await Promise.all([
      prisma.classroomMember.findMany({
        where: { classroomId, role: "STUDENT" },
        select: { userId: true },
      }),
      prisma.assignment.findMany({
        where: { classroomId },
        select: { id: true, title: true },
      }),
    ]);

    const studentIds = students.map((s) => s.userId);
    const assignmentIds = assignments.map((a) => a.id);

    const completedSubmissions = studentIds.length && assignmentIds.length
      ? await prisma.submission.findMany({
          where: {
            userId: { in: studentIds },
            assignmentId: { in: assignmentIds },
            status: { in: [...COMPLETED_STATUSES] },
          },
          select: {
            assignmentId: true,
            score: true,
          },
        })
      : [];

    const totalStudents = students.length;
    const totalAssignments = assignments.length;
    const totalPossibleCompletions = totalStudents * totalAssignments;

    const totalScore = completedSubmissions.reduce((acc, s) => acc + (s.score ?? 0), 0);
    const totalCompleted = completedSubmissions.length;

    const averageScore = totalCompleted > 0 ? totalScore / totalCompleted : 0;
    const completionRate =
      totalPossibleCompletions > 0 ? (totalCompleted / totalPossibleCompletions) * 100 : 0;

    const assignmentPerformance = assignments.map((assignment) => {
      const rows = completedSubmissions.filter((s) => s.assignmentId === assignment.id);
      const assignmentTotal = rows.reduce((acc, s) => acc + (s.score ?? 0), 0);
      const assignmentAverage = rows.length > 0 ? assignmentTotal / rows.length : 0;
      const assignmentCompletionRate =
        totalStudents > 0 ? (rows.length / totalStudents) * 100 : 0;

      return {
        assignmentId: assignment.id,
        assignmentTitle: assignment.title,
        averageScore: Number(assignmentAverage.toFixed(2)),
        completionRate: Number(assignmentCompletionRate.toFixed(2)),
      };
    });

    res.json({
      totalStudents,
      totalAssignments,
      averageScore: Number(averageScore.toFixed(2)),
      completionRate: Number(completionRate.toFixed(2)),
      assignments: assignmentPerformance,
    });
  } catch (error) {
    console.error("Get classroom analytics error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Student assignment progress ───────────────────────
router.get("/:id/students/:studentId/progress", authenticate, async (req: Request, res: Response) => {
  try {
    const classroomId = req.params.id as string;
    const studentId = req.params.studentId as string;

    const [viewerMembership, studentMembership] = await Promise.all([
      prisma.classroomMember.findUnique({
        where: {
          classroomId_userId: { classroomId, userId: req.user!.userId },
        },
      }),
      prisma.classroomMember.findUnique({
        where: {
          classroomId_userId: { classroomId, userId: studentId },
        },
      }),
    ]);

    if (!viewerMembership) {
      res.status(403).json({ error: "You are not a member of this classroom" });
      return;
    }

    if (!studentMembership || studentMembership.role !== "STUDENT") {
      res.status(404).json({ error: "Student not found in this classroom" });
      return;
    }

    const canView =
      viewerMembership.role === "TEACHER" || req.user!.userId === studentId;

    if (!canView) {
      res.status(403).json({ error: "You do not have permission to view this student's progress" });
      return;
    }

    const assignments = await prisma.assignment.findMany({
      where: { classroomId },
      orderBy: { createdAt: "asc" },
      select: { id: true, title: true },
    });

    const submissions = assignments.length
      ? await prisma.submission.findMany({
          where: {
            assignmentId: { in: assignments.map((a) => a.id) },
            userId: studentId,
          },
          orderBy: [{ submittedAt: "desc" }, { createdAt: "desc" }],
          select: {
            assignmentId: true,
            score: true,
            status: true,
            submittedAt: true,
            createdAt: true,
          },
        })
      : [];

    const latestByAssignment = new Map<string, (typeof submissions)[number]>();
    for (const submission of submissions) {
      if (!latestByAssignment.has(submission.assignmentId)) {
        latestByAssignment.set(submission.assignmentId, submission);
      }
    }

    const progress = assignments.map((assignment) => {
      const submission = latestByAssignment.get(assignment.id);

      return {
        assignmentId: assignment.id,
        assignmentTitle: assignment.title,
        score: submission?.score ?? null,
        status: submission?.status ?? "NOT_STARTED",
        submittedAt: submission?.submittedAt || submission?.createdAt || null,
      };
    });

    res.json({ progress });
  } catch (error) {
    console.error("Get student progress error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
