import { Router, Request, Response } from "express";
import { authenticate } from "../middleware/auth";
import prisma from "../lib/prisma";
import { startDeployment } from "../lib/deployer/deploy-service";

const router = Router();

// POST /api/deploy/:workspaceId
router.post(
  "/:workspaceId",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const workspaceId = req.params.workspaceId as string;
      const userId = req.user!.userId;

      // Check that the workspace exists and belongs to the user
      const workspace = await prisma.workspace.findFirst({
        where: { id: workspaceId, userId },
      });

      if (!workspace) {
        res.status(404).json({ error: "Workspace not found" });
        return;
      }

      // Start the deployment process
      const result = await startDeployment(workspaceId, userId);

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      console.error("Deployment error:", error);
      res.status(500).json({ error: "Deployment failed" });
    }
  }
);

export default router;
