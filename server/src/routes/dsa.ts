import { Router, Request, Response } from "express";
import { authenticate, requireRole } from "../middleware/auth";
import prisma from "../lib/prisma";
import { runDSATests } from "../lib/code-runner";

const router = Router();

type DSAResultItem = {
  input: string;
  expectedOutput: string;
  actualOutput: string;
  passed: boolean;
  executionTime: number;
  error?: string;
  testCaseId?: string;
  isHidden?: boolean;
};

const SUPPORTED_LANGUAGES = ["cpp", "python", "java"];

function parseStoredFeedback(feedback: string | null): {
  language?: string;
  code?: string;
  results?: DSAResultItem[];
  summary?: { passed: number; total: number; score: number };
} {
  if (!feedback) return {};
  try {
    return JSON.parse(feedback);
  } catch {
    return {};
  }
}

async function ensureStudentInAssignmentClassroom(assignmentId: string, userId: string) {
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: {
      testCases: true,
      classroom: { select: { id: true, name: true } },
    },
  });

  if (!assignment) return { error: "Assignment not found" as const };
  if (assignment.type !== "DSA") return { error: "Assignment is not a DSA assignment" as const };

  const member = await prisma.classroomMember.findUnique({
    where: {
      classroomId_userId: { classroomId: assignment.classroomId, userId },
    },
  });

  if (!member || member.role !== "STUDENT") {
    return { error: "Only students in this classroom can run DSA code" as const };
  }

  return { assignment };
}

function mapRunnerOutputToResponse(
  testCases: Array<{ id: string; input: string; expectedOutput: string; isHidden: boolean }>,
  runResults: Array<{
    testCaseId: string;
    passed: boolean;
    actualOutput: string;
    expectedOutput: string;
    error?: string;
    executionTime: number;
  }>,
  hideHidden: boolean
): DSAResultItem[] {
  return runResults.map((result) => {
    const tc = testCases.find((x) => x.id === result.testCaseId);
    const hidden = !!tc?.isHidden;

    return {
      testCaseId: result.testCaseId,
      input: hideHidden && hidden ? "" : tc?.input || "",
      expectedOutput: hideHidden && hidden ? "" : tc?.expectedOutput || result.expectedOutput,
      actualOutput: result.actualOutput,
      passed: result.passed,
      executionTime: result.executionTime,
      error: result.error,
      isHidden: hidden,
    };
  });
}

function calculateScore(
  testCases: Array<{ id: string; weight: number }>,
  results: Array<{ testCaseId: string; passed: boolean }>,
  maxMarks: number
) {
  const weightMap = new Map(testCases.map((tc) => [tc.id, tc.weight]));
  const totalWeight = testCases.reduce((sum, tc) => sum + (tc.weight || 1), 0);
  const passedWeight = results.reduce((sum, result) => {
    if (!result.passed) return sum;
    return sum + (weightMap.get(result.testCaseId) || 0);
  }, 0);

  const ratio = totalWeight > 0 ? passedWeight / totalWeight : 0;
  return Math.round(ratio * maxMarks);
}

// POST /api/dsa/run
router.post("/run", authenticate, requireRole("STUDENT"), async (req: Request, res: Response) => {
  try {
    const { assignmentId, code, language, customInput, customExpectedOutput } = req.body;

    if (!assignmentId || !code || !language) {
      res.status(400).json({ error: "assignmentId, code and language are required" });
      return;
    }

    if (!SUPPORTED_LANGUAGES.includes(String(language))) {
      res.status(400).json({ error: "language must be one of cpp, python, java" });
      return;
    }

    const check = await ensureStudentInAssignmentClassroom(String(assignmentId), req.user!.userId);
    if ("error" in check) {
      res.status(check.error === "Assignment not found" ? 404 : 403).json({ error: check.error });
      return;
    }

    const visibleTestCases = check.assignment.testCases.filter((tc) => !tc.isHidden);

    const additionalCases =
      typeof customInput === "string" && customInput.trim()
        ? [
            {
              id: "custom-input",
              input: customInput,
              expectedOutput: typeof customExpectedOutput === "string" ? customExpectedOutput : "",
              weight: 0,
              isHidden: false,
            },
          ]
        : [];

    const runCases = [...visibleTestCases, ...additionalCases];

    if (runCases.length === 0) {
      res.json({ results: [] });
      return;
    }

    const runResults = await runDSATests(String(code), String(language), runCases);

    const results = runResults.map((result) => {
      const testCase = runCases.find((tc) => tc.id === result.testCaseId);
      const expected = testCase?.expectedOutput || "";
      const hasExpected = expected.trim().length > 0;

      return {
        input: testCase?.input || "",
        expectedOutput: expected,
        actualOutput: result.actualOutput,
        passed: hasExpected ? result.passed : !result.error,
        executionTime: result.executionTime,
        error: result.error,
      };
    });

    res.json({ results });
  } catch (error) {
    console.error("DSA run error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/dsa/submit
router.post("/submit", authenticate, requireRole("STUDENT"), async (req: Request, res: Response) => {
  try {
    const { assignmentId, code, language } = req.body;

    if (!assignmentId || !code || !language) {
      res.status(400).json({ error: "assignmentId, code and language are required" });
      return;
    }

    if (!SUPPORTED_LANGUAGES.includes(String(language))) {
      res.status(400).json({ error: "language must be one of cpp, python, java" });
      return;
    }

    const check = await ensureStudentInAssignmentClassroom(String(assignmentId), req.user!.userId);
    if ("error" in check) {
      res.status(check.error === "Assignment not found" ? 404 : 403).json({ error: check.error });
      return;
    }

    const assignment = check.assignment;

    if (assignment.testCases.length === 0) {
      res.status(400).json({ error: "No test cases configured for this assignment" });
      return;
    }

    const runResults = await runDSATests(String(code), String(language), assignment.testCases);
    const score = calculateScore(assignment.testCases, runResults, assignment.maxMarks || 100);

    let submission = await prisma.submission.findFirst({
      where: {
        assignmentId: assignment.id,
        userId: req.user!.userId,
        status: "IN_PROGRESS",
      },
      orderBy: { createdAt: "desc" },
    });

    if (!submission) {
      submission = await prisma.submission.create({
        data: {
          assignmentId: assignment.id,
          userId: req.user!.userId,
          status: "IN_PROGRESS",
        },
      });
    }

    const responseResults = mapRunnerOutputToResponse(assignment.testCases, runResults, true);

    const passed = runResults.filter((r) => r.passed).length;
    const total = runResults.length;

    const storedFeedback = {
      language: String(language),
      code: String(code),
      results: mapRunnerOutputToResponse(assignment.testCases, runResults, false),
      summary: { passed, total, score },
    };

    const updated = await prisma.submission.update({
      where: { id: submission.id },
      data: {
        score,
        status: "SUBMITTED",
        submittedAt: new Date(),
        feedback: JSON.stringify(storedFeedback),
      },
    });

    res.json({
      submissionId: updated.id,
      summary: {
        passed,
        total,
        score,
        maxMarks: assignment.maxMarks,
      },
      results: responseResults,
    });
  } catch (error) {
    console.error("DSA submit error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/dsa/submission/:id
router.get("/submission/:id", authenticate, async (req: Request, res: Response) => {
  try {
    const submission = await prisma.submission.findUnique({
      where: { id: req.params.id as string },
      include: {
        assignment: {
          include: {
            classroom: { select: { id: true, name: true } },
          },
        },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    if (!submission) {
      res.status(404).json({ error: "Submission not found" });
      return;
    }

    const member = await prisma.classroomMember.findUnique({
      where: {
        classroomId_userId: {
          classroomId: submission.assignment.classroomId,
          userId: req.user!.userId,
        },
      },
    });

    const isOwner = submission.userId === req.user!.userId;
    const isTeacher = member?.role === "TEACHER";

    if (!member || (!isOwner && !isTeacher)) {
      res.status(403).json({ error: "You are not allowed to view this submission" });
      return;
    }

    const stored = parseStoredFeedback(submission.feedback);
    const outputResults = Array.isArray(stored.results)
      ? stored.results.map((item) => ({
          ...item,
          expectedOutput: !isTeacher && item.isHidden ? "" : item.expectedOutput,
          input: !isTeacher && item.isHidden ? "" : item.input,
        }))
      : [];

    res.json({
      submission: {
        id: submission.id,
        assignmentId: submission.assignmentId,
        userId: submission.userId,
        status: submission.status,
        score: submission.score,
        submittedAt: submission.submittedAt,
      },
      assignment: {
        id: submission.assignment.id,
        title: submission.assignment.title,
        maxMarks: submission.assignment.maxMarks,
        classroom: submission.assignment.classroom,
      },
      language: stored.language || null,
      code: isOwner || isTeacher ? stored.code || "" : "",
      summary: stored.summary || null,
      results: outputResults,
    });
  } catch (error) {
    console.error("Get DSA submission error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
