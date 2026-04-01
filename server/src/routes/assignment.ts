import { Router, Request, Response } from "express";
import { authenticate, requireRole } from "../middleware/auth";
import prisma from "../lib/prisma";
import {
  getAllFiles,
  initWorkspaceFiles,
  readFile as readWorkspaceFile,
  writeFile as writeWorkspaceFile,
} from "../lib/workspace";
import { startDeployment } from "../lib/deployer/deploy-service";

const router = Router();

type AssignmentConfig = {
  template?: string;
  lockedFiles?: string[];
  editableFiles?: string[];
  referenceImages?: string[];
  instructions?: string;
};

function toDateOrNull(value: unknown): Date | null {
  if (!value) return null;
  const date = new Date(String(value));
  return isNaN(date.getTime()) ? null : date;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function normalizePath(pathValue: string): string {
  return pathValue.replace(/\\/g, "/").replace(/^\/+/, "").trim();
}

function parseAssignmentConfig(raw: unknown): AssignmentConfig {
  if (!isRecord(raw)) return {};

  const arrayOfStrings = (key: keyof AssignmentConfig): string[] => {
    const value = raw[key];
    if (!Array.isArray(value)) return [];
    return value
      .map((v) => String(v || "").trim())
      .filter(Boolean)
      .map(normalizePath);
  };

  const template = raw.template ? String(raw.template).trim() : undefined;
  const instructions = raw.instructions ? String(raw.instructions).trim() : undefined;

  return {
    template: template || undefined,
    instructions: instructions || undefined,
    lockedFiles: arrayOfStrings("lockedFiles"),
    editableFiles: arrayOfStrings("editableFiles"),
    referenceImages: arrayOfStrings("referenceImages"),
  };
}

async function ensureClassroomRole(classroomId: string, userId: string, role: "STUDENT" | "TEACHER") {
  const member = await prisma.classroomMember.findUnique({
    where: {
      classroomId_userId: { classroomId, userId },
    },
  });

  if (!member || member.role !== role) return null;
  return member;
}

async function getWorkspaceSnapshot(workspaceId: string): Promise<Record<string, string>> {
  const files = await getAllFiles(workspaceId);
  const snapshot: Record<string, string> = {};

  for (const filePath of files) {
    try {
      snapshot[filePath] = await readWorkspaceFile(workspaceId, filePath);
    } catch {
      // Skip unreadable files.
    }
  }

  return snapshot;
}

// POST /api/assignments - teacher only
router.post("/", authenticate, requireRole("TEACHER"), async (req: Request, res: Response) => {
  try {
    const {
      classroomId,
      title,
      description,
      type,
      difficulty,
      template,
      assignmentConfig,
      language,
      starterCode,
      maxMarks,
      deadline,
      aiAllowed,
      testCases,
    } = req.body;

    if (!classroomId || !title?.trim()) {
      res.status(400).json({ error: "classroomId and title are required" });
      return;
    }

    if (!type || !["WEB_DEV", "DSA"].includes(type)) {
      res.status(400).json({ error: "type must be WEB_DEV or DSA" });
      return;
    }

    if (difficulty && !["EASY", "MEDIUM", "HARD"].includes(difficulty)) {
      res.status(400).json({ error: "difficulty must be EASY, MEDIUM or HARD" });
      return;
    }

    const member = await ensureClassroomRole(classroomId, req.user!.userId, "TEACHER");
    if (!member) {
      res.status(403).json({ error: "Only teachers in this classroom can create assignments" });
      return;
    }

    const parsedConfig = parseAssignmentConfig(assignmentConfig);

    const assignment = await prisma.assignment.create({
      data: {
        classroomId,
        title: title.trim(),
        description: description?.trim() || null,
        type,
        difficulty: difficulty || "MEDIUM",
        template: template || parsedConfig.template || null,
        assignmentConfig: Object.keys(parsedConfig).length > 0 ? parsedConfig : null,
        language: language || null,
        starterCode: starterCode || null,
        maxMarks: Number.isFinite(Number(maxMarks)) ? Number(maxMarks) : 100,
        deadline: toDateOrNull(deadline),
        aiAllowed: !!aiAllowed,
        createdBy: req.user!.userId,
      },
    });

    if (Array.isArray(testCases) && testCases.length > 0) {
      await prisma.testCase.createMany({
        data: testCases
          .filter((tc) => tc?.input != null && tc?.expectedOutput != null)
          .map((tc) => ({
            assignmentId: assignment.id,
            input: String(tc.input),
            expectedOutput: String(tc.expectedOutput),
            isHidden: !!tc.isHidden,
            weight: Number.isFinite(Number(tc.weight)) ? Number(tc.weight) : 1,
          })),
      });
    }

    const created = await prisma.assignment.findUnique({
      where: { id: assignment.id },
      include: {
        testCases: true,
        _count: { select: { submissions: true } },
      },
    });

    res.status(201).json({ assignment: created });
  } catch (error) {
    console.error("Create assignment error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/assignments/classroom/:classroomId
router.get("/classroom/:classroomId", authenticate, async (req: Request, res: Response) => {
  try {
    const { classroomId } = req.params;

    const member = await prisma.classroomMember.findUnique({
      where: {
        classroomId_userId: { classroomId: classroomId as string, userId: req.user!.userId },
      },
    });

    if (!member) {
      res.status(403).json({ error: "You are not a member of this classroom" });
      return;
    }

    const assignments = await prisma.assignment.findMany({
      where: { classroomId: classroomId as string },
      include: {
        _count: { select: { submissions: true, testCases: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    if (member.role === "STUDENT") {
      const submissions = await prisma.submission.findMany({
        where: {
          userId: req.user!.userId,
          assignmentId: { in: assignments.map((a) => a.id) },
        },
        orderBy: { createdAt: "desc" },
      });

      const submissionMap = new Map<string, (typeof submissions)[number]>();
      for (const submission of submissions) {
        if (!submissionMap.has(submission.assignmentId)) {
          submissionMap.set(submission.assignmentId, submission);
        }
      }

      res.json({ assignments: assignments.map((a) => ({ ...a, mySubmission: submissionMap.get(a.id) || null })) });
      return;
    }

    res.json({ assignments });
  } catch (error) {
    console.error("List assignments error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/assignments/my/submissions
router.get("/my/submissions", authenticate, requireRole("STUDENT"), async (req: Request, res: Response) => {
  try {
    const submissions = await prisma.submission.findMany({
      where: { userId: req.user!.userId },
      include: {
        assignment: {
          select: {
            id: true,
            title: true,
            type: true,
            difficulty: true,
            deadline: true,
            maxMarks: true,
            classroom: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ submissions });
  } catch (error) {
    console.error("Get my submissions error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/assignments/:id/submissions - teacher only
router.get("/:id/submissions", authenticate, requireRole("TEACHER"), async (req: Request, res: Response) => {
  try {
    const assignment = await prisma.assignment.findUnique({ where: { id: req.params.id as string } });

    if (!assignment) {
      res.status(404).json({ error: "Assignment not found" });
      return;
    }

    const member = await ensureClassroomRole(assignment.classroomId, req.user!.userId, "TEACHER");
    if (!member) {
      res.status(403).json({ error: "Only teachers can view submissions" });
      return;
    }

    const submissions = await prisma.submission.findMany({
      where: { assignmentId: assignment.id },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ submissions });
  } catch (error) {
    console.error("Get submissions error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/assignments/submissions/:id/grade - teacher only
router.post("/submissions/:id/grade", authenticate, requireRole("TEACHER"), async (req: Request, res: Response) => {
  try {
    const submission = await prisma.submission.findUnique({
      where: { id: req.params.id as string },
      include: { assignment: true },
    });

    if (!submission) {
      res.status(404).json({ error: "Submission not found" });
      return;
    }

    const member = await ensureClassroomRole(submission.assignment.classroomId, req.user!.userId, "TEACHER");
    if (!member) {
      res.status(403).json({ error: "Only teachers can grade submissions" });
      return;
    }

    const score = Number(req.body?.score);
    if (!Number.isFinite(score) || score < 0) {
      res.status(400).json({ error: "Valid score is required" });
      return;
    }

    const updated = await prisma.submission.update({
      where: { id: submission.id },
      data: {
        score,
        feedback: req.body?.feedback ? String(req.body.feedback) : null,
        status: "GRADED",
      },
    });

    res.json({ submission: updated });
  } catch (error) {
    console.error("Grade submission error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/assignments/:id
router.get("/:id", authenticate, async (req: Request, res: Response) => {
  try {
    const assignment = await prisma.assignment.findUnique({
      where: { id: req.params.id as string },
      include: {
        testCases: true,
        classroom: { select: { id: true, name: true } },
      },
    });

    if (!assignment) {
      res.status(404).json({ error: "Assignment not found" });
      return;
    }

    const member = await prisma.classroomMember.findUnique({
      where: {
        classroomId_userId: {
          classroomId: assignment.classroomId,
          userId: req.user!.userId,
        },
      },
    });

    if (!member) {
      res.status(403).json({ error: "You are not a member of this classroom" });
      return;
    }

    const testCases =
      member.role === "TEACHER"
        ? assignment.testCases
        : assignment.testCases.map((tc) => ({ ...tc, expectedOutput: tc.isHidden ? "" : tc.expectedOutput }));

    let mySubmission = null;
    if (member.role === "STUDENT") {
      mySubmission = await prisma.submission.findFirst({
        where: { assignmentId: assignment.id, userId: req.user!.userId },
        orderBy: { createdAt: "desc" },
      });
    }

    res.json({ assignment: { ...assignment, testCases }, mySubmission });
  } catch (error) {
    console.error("Get assignment detail error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/assignments/:id
router.delete("/:id", authenticate, requireRole("TEACHER"), async (req: Request, res: Response) => {
  try {
    const assignment = await prisma.assignment.findUnique({ where: { id: req.params.id as string } });

    if (!assignment) {
      res.status(404).json({ error: "Assignment not found" });
      return;
    }

    const member = await ensureClassroomRole(assignment.classroomId, req.user!.userId, "TEACHER");
    if (!member) {
      res.status(403).json({ error: "Only teachers can delete assignments" });
      return;
    }

    await prisma.assignment.delete({ where: { id: assignment.id } });
    res.json({ message: "Assignment deleted" });
  } catch (error) {
    console.error("Delete assignment error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/assignments/:id/start
router.post("/:id/start", authenticate, requireRole("STUDENT"), async (req: Request, res: Response) => {
  try {
    const assignment = await prisma.assignment.findUnique({ where: { id: req.params.id as string } });

    if (!assignment) {
      res.status(404).json({ error: "Assignment not found" });
      return;
    }

    const member = await ensureClassroomRole(assignment.classroomId, req.user!.userId, "STUDENT");
    if (!member) {
      res.status(403).json({ error: "Only students can start assignments" });
      return;
    }

    const existing = await prisma.submission.findFirst({
      where: {
        assignmentId: assignment.id,
        userId: req.user!.userId,
        status: "IN_PROGRESS",
      },
      orderBy: { createdAt: "desc" },
    });

    if (existing && existing.workspaceId) {
      const workspace = await prisma.workspace.findFirst({
        where: {
          id: existing.workspaceId,
          userId: req.user!.userId,
        },
      });

      if (workspace) {
        res.json({ submission: existing, workspace, message: "Assignment already started" });
        return;
      }
    }

    let workspaceId = req.body?.workspaceId ? String(req.body.workspaceId) : null;
    const config = parseAssignmentConfig(assignment.assignmentConfig);

    if (assignment.type === "WEB_DEV" && !workspaceId) {
      const templateToUse = config.template || assignment.template || "vite-react-ts";
      const workspace = await prisma.workspace.create({
        data: {
          name: `${assignment.title.slice(0, 40)} - Submission`,
          description: `Assignment workspace for ${assignment.title}`,
          template: templateToUse,
          language: null,
          visibility: "private",
          status: "active",
          userId: req.user!.userId,
        },
      });

      workspaceId = workspace.id;

      await initWorkspaceFiles(workspace.id, templateToUse);

      if (starterCodeIsValid(assignment.starterCode)) {
        for (const [relativePath, content] of Object.entries(assignment.starterCode)) {
          await writeWorkspaceFile(workspace.id, normalizePath(relativePath), String(content));
        }
      }
    }

    const submission = await prisma.submission.create({
      data: {
        userId: req.user!.userId,
        assignmentId: assignment.id,
        workspaceId,
        status: "IN_PROGRESS",
      },
    });

    const workspace = workspaceId
      ? await prisma.workspace.findFirst({ where: { id: workspaceId, userId: req.user!.userId } })
      : null;

    res.status(201).json({ submission, workspace });
  } catch (error) {
    console.error("Start assignment error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/assignments/:id/submit
router.post("/:id/submit", authenticate, requireRole("STUDENT"), async (req: Request, res: Response) => {
  try {
    const assignment = await prisma.assignment.findUnique({ where: { id: req.params.id as string } });

    if (!assignment) {
      res.status(404).json({ error: "Assignment not found" });
      return;
    }

    const member = await ensureClassroomRole(assignment.classroomId, req.user!.userId, "STUDENT");
    if (!member) {
      res.status(403).json({ error: "Only students can submit assignments" });
      return;
    }

    const submission = await prisma.submission.findFirst({
      where: {
        assignmentId: assignment.id,
        userId: req.user!.userId,
        status: "IN_PROGRESS",
      },
      orderBy: { createdAt: "desc" },
    });

    if (!submission) {
      res.status(404).json({ error: "No in-progress submission found" });
      return;
    }

    if (!submission.workspaceId) {
      res.status(400).json({ error: "Submission has no workspace to submit" });
      return;
    }

    const workspace = await prisma.workspace.findFirst({
      where: {
        id: submission.workspaceId,
        userId: req.user!.userId,
      },
    });

    if (!workspace) {
      res.status(403).json({ error: "Workspace ownership verification failed" });
      return;
    }

    const workspaceSnapshot = await getWorkspaceSnapshot(workspace.id);

    let deploymentUrl: string | null = null;
    if (assignment.type === "WEB_DEV") {
      const deployment = await startDeployment(workspace.id, req.user!.userId);
      deploymentUrl = deployment.url || null;
    }

    const updated = await prisma.submission.update({
      where: { id: submission.id },
      data: {
        status: "SUBMITTED",
        submittedAt: new Date(),
        deploymentUrl,
        workspaceSnapshot,
      },
    });

    res.json({ submission: updated, deploymentUrl });
  } catch (error) {
    console.error("Submit assignment error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

function starterCodeIsValid(value: unknown): value is Record<string, string> {
  return isRecord(value);
}

export default router;
