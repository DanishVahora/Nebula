import { Router, Request, Response } from "express";
import { authenticate, requireRole } from "../middleware/auth";
import prisma from "../lib/prisma";
import { provisionWorkspace } from "../lib/provisioner";
import { getWorkspacePath } from "../lib/workspace";
import { runDSATests } from "../lib/code-runner";
import fs from "fs/promises";
import path from "path";

const router = Router();

// ── Create assignment (TEACHER in classroom) ───────────
router.post(
  "/",
  authenticate,
  requireRole("TEACHER"),
  async (req: Request, res: Response) => {
    try {
      const {
        classroomId,
        title,
        description,
        type,
        difficulty,
        template,
        starterCode,
        language,
        timeLimit,
        deadline,
        maxMarks,
        aiAllowed,
        testCases,
      } = req.body;

      if (!classroomId || !title?.trim()) {
        res.status(400).json({ error: "classroomId and title are required" });
        return;
      }

      if (!["WEB_DEV", "DSA"].includes(type)) {
        res.status(400).json({ error: "type must be WEB_DEV or DSA" });
        return;
      }

      // Verify teacher owns this classroom
      const member = await prisma.classroomMember.findUnique({
        where: {
          classroomId_userId: { classroomId, userId: req.user!.userId },
        },
      });
      if (!member || member.role !== "TEACHER") {
        res.status(403).json({ error: "You are not a teacher in this classroom" });
        return;
      }

      const assignment = await prisma.assignment.create({
        data: {
          title: title.trim(),
          description: description?.trim() || null,
          type,
          difficulty: difficulty || "MEDIUM",
          template: type === "WEB_DEV" ? (template || "react") : null,
          starterCode: starterCode ? JSON.stringify(starterCode) : null,
          language: type === "DSA" ? (language || "cpp") : null,
          timeLimit: timeLimit ? parseInt(timeLimit, 10) : null,
          deadline: deadline ? new Date(deadline) : null,
          maxMarks: maxMarks ? parseInt(maxMarks, 10) : 100,
          aiAllowed: !!aiAllowed,
          classroomId,
          createdBy: req.user!.userId,
        },
      });

      // Create test cases for DSA assignments
      if (type === "DSA" && Array.isArray(testCases) && testCases.length > 0) {
        await prisma.testCase.createMany({
          data: testCases.map((tc: { input: string; expectedOutput: string; weight?: number; isHidden?: boolean }) => ({
            assignmentId: assignment.id,
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            weight: tc.weight || 1,
            isHidden: !!tc.isHidden,
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
  }
);

// ── Get assignments for a classroom ────────────────────
router.get(
  "/classroom/:classroomId",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { classroomId } = req.params;

      // Verify membership
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
          creator: { select: { id: true, name: true, avatar: true } },
          _count: { select: { testCases: true, submissions: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      // If student, include their submission status
      if (member.role === "STUDENT") {
        const submissions = await prisma.submission.findMany({
          where: {
            studentId: req.user!.userId,
            assignmentId: { in: assignments.map((a) => a.id) },
          },
        });
        const subMap = new Map(submissions.map((s) => [s.assignmentId, s]));

        const enriched = assignments.map((a) => ({
          ...a,
          mySubmission: subMap.get(a.id) || null,
        }));

        res.json({ assignments: enriched });
        return;
      }

      res.json({ assignments });
    } catch (error) {
      console.error("Get classroom assignments error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ── Get single assignment detail ───────────────────────
router.get(
  "/:id",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const assignment = await prisma.assignment.findUnique({
        where: { id: req.params.id as string },
        include: {
          classroom: { select: { id: true, name: true } },
          creator: { select: { id: true, name: true, avatar: true } },
          testCases: true,
          _count: { select: { submissions: true } },
        },
      });

      if (!assignment) {
        res.status(404).json({ error: "Assignment not found" });
        return;
      }

      // Verify membership
      const member = await prisma.classroomMember.findUnique({
        where: {
          classroomId_userId: { classroomId: assignment.classroomId, userId: req.user!.userId },
        },
      });
      if (!member) {
        res.status(403).json({ error: "You are not a member of this classroom" });
        return;
      }

      // Hide test case expected outputs for students (only show non-hidden inputs)
      let testCases = assignment.testCases;
      if (member.role === "STUDENT") {
        testCases = testCases
          .filter((tc) => !tc.isHidden)
          .map((tc) => ({ ...tc, expectedOutput: "" }));
      }

      // Get student's submission if any
      let mySubmission = null;
      if (member.role === "STUDENT") {
        mySubmission = await prisma.submission.findFirst({
          where: { assignmentId: assignment.id, studentId: req.user!.userId },
        });
      }

      res.json({
        assignment: { ...assignment, testCases },
        mySubmission,
      });
    } catch (error) {
      console.error("Get assignment error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ── Start assignment (student) — creates workspace ─────
router.post(
  "/:id/start",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const assignment = await prisma.assignment.findUnique({
        where: { id: req.params.id as string },
        include: { testCases: true },
      });

      if (!assignment) {
        res.status(404).json({ error: "Assignment not found" });
        return;
      }

      // Verify student is in the classroom
      const member = await prisma.classroomMember.findUnique({
        where: {
          classroomId_userId: { classroomId: assignment.classroomId, userId: req.user!.userId },
        },
      });
      if (!member) {
        res.status(403).json({ error: "You are not a member of this classroom" });
        return;
      }

      // Check if already started
      const existing = await prisma.submission.findFirst({
        where: { assignmentId: assignment.id, studentId: req.user!.userId },
      });
      if (existing) {
        res.json({
          submission: existing,
          message: "Assignment already started",
        });
        return;
      }

      // Check deadline
      if (assignment.deadline && new Date() > assignment.deadline) {
        res.status(400).json({ error: "Assignment deadline has passed" });
        return;
      }

      // Create a workspace for the assignment
      const templateId = assignment.type === "WEB_DEV"
        ? (assignment.template || "react")
        : "dsa";

      const workspace = await prisma.workspace.create({
        data: {
          name: `${assignment.title} — Submission`,
          description: `Assignment workspace for: ${assignment.title}`,
          template: templateId,
          language: assignment.language || null,
          visibility: "private",
          status: "provisioning",
          userId: req.user!.userId,
        },
      });

      // Create the submission
      const submission = await prisma.submission.create({
        data: {
          assignmentId: assignment.id,
          studentId: req.user!.userId,
          workspaceId: workspace.id,
          status: "IN_PROGRESS",
        },
      });

      // Write starter code if provided
      if (assignment.starterCode) {
        try {
          const starterFiles = JSON.parse(assignment.starterCode) as Record<string, string>;
          const projectDir = getWorkspacePath(workspace.id);
          await fs.mkdir(projectDir, { recursive: true });
          for (const [filePath, content] of Object.entries(starterFiles)) {
            const fullPath = path.join(projectDir, filePath);
            await fs.mkdir(path.dirname(fullPath), { recursive: true });
            await fs.writeFile(fullPath, content, "utf-8");
          }
        } catch {
          // Starter code parse failed, workspace will be provisioned normally
        }
      }

      res.status(201).json({ submission, workspaceId: workspace.id });
    } catch (error) {
      console.error("Start assignment error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ── Submit assignment ──────────────────────────────────
router.post(
  "/:id/submit",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const assignment = await prisma.assignment.findUnique({
        where: { id: req.params.id as string },
        include: { testCases: true },
      });

      if (!assignment) {
        res.status(404).json({ error: "Assignment not found" });
        return;
      }

      const submission = await prisma.submission.findFirst({
        where: {
          assignmentId: assignment.id,
          studentId: req.user!.userId,
          status: "IN_PROGRESS",
        },
      });

      if (!submission) {
        res.status(404).json({ error: "No in-progress submission found" });
        return;
      }

      // Check time limit
      if (assignment.timeLimit) {
        const elapsed = (Date.now() - submission.startedAt.getTime()) / 60000;
        if (elapsed > assignment.timeLimit) {
          await prisma.submission.update({
            where: { id: submission.id },
            data: { status: "TIMED_OUT", submittedAt: new Date() },
          });
          res.status(400).json({ error: "Time limit exceeded" });
          return;
        }
      }

      let score: number | null = null;

      // For DSA: run code against test cases
      if (assignment.type === "DSA" && assignment.testCases.length > 0) {
        const { code } = req.body;
        if (!code) {
          res.status(400).json({ error: "Code is required for DSA submissions" });
          return;
        }

        const lang = assignment.language || "cpp";
        const results = await runDSATests(code, lang, assignment.testCases);
        const totalWeight = assignment.testCases.reduce((sum, tc) => sum + tc.weight, 0);
        const earnedWeight = results.reduce(
          (sum, r, i) => sum + (r.passed ? assignment.testCases[i].weight : 0),
          0
        );
        score = Math.round((earnedWeight / totalWeight) * assignment.maxMarks);

        const updated = await prisma.submission.update({
          where: { id: submission.id },
          data: {
            status: "GRADED",
            submittedAt: new Date(),
            score,
            code,
            feedback: JSON.stringify(results),
          },
        });

        res.json({ submission: updated, testResults: results, score });
        return;
      }

      // For WEB_DEV: mark as submitted (teacher/AI grades later)
      const updated = await prisma.submission.update({
        where: { id: submission.id },
        data: {
          status: "SUBMITTED",
          submittedAt: new Date(),
        },
      });

      res.json({ submission: updated });
    } catch (error) {
      console.error("Submit assignment error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ── Get submissions for an assignment (teacher) ────────
router.get(
  "/:id/submissions",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const assignment = await prisma.assignment.findUnique({
        where: { id: req.params.id as string },
      });

      if (!assignment) {
        res.status(404).json({ error: "Assignment not found" });
        return;
      }

      // Verify teacher
      const member = await prisma.classroomMember.findUnique({
        where: {
          classroomId_userId: { classroomId: assignment.classroomId, userId: req.user!.userId },
        },
      });
      if (!member || member.role !== "TEACHER") {
        res.status(403).json({ error: "Only teachers can view all submissions" });
        return;
      }

      const submissions = await prisma.submission.findMany({
        where: { assignmentId: assignment.id },
        include: {
          student: { select: { id: true, name: true, email: true, avatar: true } },
        },
        orderBy: { submittedAt: "desc" },
      });

      res.json({ submissions });
    } catch (error) {
      console.error("Get submissions error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ── Grade a submission (teacher — for WEB_DEV) ─────────
router.post(
  "/submissions/:submissionId/grade",
  authenticate,
  requireRole("TEACHER"),
  async (req: Request, res: Response) => {
    try {
      const { score, feedback } = req.body;

      if (score == null || typeof score !== "number" || score < 0) {
        res.status(400).json({ error: "Valid score is required" });
        return;
      }

      const submission = await prisma.submission.findUnique({
        where: { id: req.params.submissionId as string },
        include: { assignment: true },
      });

      if (!submission) {
        res.status(404).json({ error: "Submission not found" });
        return;
      }

      if (score > submission.assignment.maxMarks) {
        res.status(400).json({ error: `Score cannot exceed ${submission.assignment.maxMarks}` });
        return;
      }

      // Verify teacher owns the classroom
      const member = await prisma.classroomMember.findUnique({
        where: {
          classroomId_userId: {
            classroomId: submission.assignment.classroomId,
            userId: req.user!.userId,
          },
        },
      });
      if (!member || member.role !== "TEACHER") {
        res.status(403).json({ error: "Only the classroom teacher can grade submissions" });
        return;
      }

      const updated = await prisma.submission.update({
        where: { id: submission.id },
        data: {
          score,
          feedback: feedback || null,
          status: "GRADED",
        },
      });

      res.json({ submission: updated });
    } catch (error) {
      console.error("Grade submission error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ── Get my submissions (student) ───────────────────────
router.get(
  "/my/submissions",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const submissions = await prisma.submission.findMany({
        where: { studentId: req.user!.userId },
        include: {
          assignment: {
            select: {
              id: true,
              title: true,
              type: true,
              difficulty: true,
              maxMarks: true,
              deadline: true,
              classroom: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { startedAt: "desc" },
      });

      res.json({ submissions });
    } catch (error) {
      console.error("Get my submissions error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ── Get my assignments across all classrooms (student) ─
router.get(
  "/my/all",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      // Get all classrooms user is a member of
      const memberships = await prisma.classroomMember.findMany({
        where: { userId: req.user!.userId },
        select: { classroomId: true },
      });

      const classroomIds = memberships.map((m) => m.classroomId);

      const assignments = await prisma.assignment.findMany({
        where: { classroomId: { in: classroomIds } },
        include: {
          classroom: { select: { id: true, name: true } },
          creator: { select: { id: true, name: true } },
          _count: { select: { testCases: true, submissions: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      // Get user's submissions
      const submissions = await prisma.submission.findMany({
        where: {
          studentId: req.user!.userId,
          assignmentId: { in: assignments.map((a) => a.id) },
        },
      });
      const subMap = new Map(submissions.map((s) => [s.assignmentId, s]));

      const enriched = assignments.map((a) => ({
        ...a,
        mySubmission: subMap.get(a.id) || null,
      }));

      res.json({ assignments: enriched });
    } catch (error) {
      console.error("Get all my assignments error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ── Delete assignment (teacher) ────────────────────────
router.delete(
  "/:id",
  authenticate,
  requireRole("TEACHER"),
  async (req: Request, res: Response) => {
    try {
      const assignment = await prisma.assignment.findUnique({
        where: { id: req.params.id as string },
      });

      if (!assignment) {
        res.status(404).json({ error: "Assignment not found" });
        return;
      }

      // Verify teacher created it or is teacher in the classroom
      const member = await prisma.classroomMember.findUnique({
        where: {
          classroomId_userId: { classroomId: assignment.classroomId, userId: req.user!.userId },
        },
      });
      if (!member || member.role !== "TEACHER") {
        res.status(403).json({ error: "Only the classroom teacher can delete assignments" });
        return;
      }

      await prisma.assignment.delete({ where: { id: assignment.id } });
      res.json({ message: "Assignment deleted" });
    } catch (error) {
      console.error("Delete assignment error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

export default router;
