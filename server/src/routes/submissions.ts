import { Router, Request, Response } from "express";
import { authenticate } from "../middleware/auth";
import prisma from "../lib/prisma";

const router = Router();

// GET /api/submissions/:id/deployment
router.get("/:id/deployment", authenticate, async (req: Request, res: Response) => {
  try {
    const submission = await prisma.submission.findUnique({
      where: { id: req.params.id as string },
      include: {
        assignment: {
          select: {
            classroomId: true,
          },
        },
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

    if (!member) {
      res.status(403).json({ error: "You are not a member of this classroom" });
      return;
    }

    if (!submission.deploymentUrl) {
      res.status(404).json({ error: "Deployment URL not available yet" });
      return;
    }

    res.json({ deploymentUrl: submission.deploymentUrl });
  } catch (error) {
    console.error("Get deployment URL error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
