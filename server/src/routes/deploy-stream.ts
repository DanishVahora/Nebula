import { Router, Request, Response } from "express";
import { authenticate } from "../middleware/auth";
import prisma from "../lib/prisma";

const router = Router();

// GET /api/deploy/stream/:workspaceId - Stream deployment progress
router.get(
  "/stream/:workspaceId",
  authenticate,
  async (req: Request, res: Response) => {
    const workspaceId = req.params.workspaceId as string;
    const userId = req.user!.userId;

    // Verify workspace ownership
    const workspace = await prisma.workspace.findFirst({
      where: { id: workspaceId, userId },
    });

    if (!workspace) {
      res.status(404).json({ error: "Workspace not found" });
      return;
    }

    // Set SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no"); // Disable nginx buffering

    // Send initial event
    res.write(`data: Starting deployment\n\n`);

    // Simulate deployment stages with timeouts
    const stages = [
      { delay: 1000, message: "Detecting project type" },
      { delay: 2000, message: "Generating Dockerfile" },
      { delay: 3000, message: "Building Docker image" },
      { delay: 4000, message: "Starting container" },
      { delay: 5000, message: "Deployment successful" },
    ];

    const timeouts: NodeJS.Timeout[] = [];

    stages.forEach((stage, index) => {
      const timeout = setTimeout(() => {
        res.write(`data: ${stage.message}\n\n`);

        // End the stream after the last stage
        if (index === stages.length - 1) {
          res.end();
        }
      }, stage.delay);

      timeouts.push(timeout);
    });

    // Clean up on client disconnect
    req.on("close", () => {
      timeouts.forEach((timeout) => clearTimeout(timeout));
    });
  }
);

export default router;
