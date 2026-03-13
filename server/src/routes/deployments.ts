import { Router, Request, Response } from "express";
import { authenticate } from "../middleware/auth";
import {
  getUserDeployments,
  stopDeployment,
  deleteDeployment,
} from "../lib/deployer/deployment-manager";

const router = Router();

// GET /api/deployments - Get all deployments for authenticated user
router.get("/", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const deployments = await getUserDeployments(userId);
    res.json(deployments);
  } catch (error) {
    console.error("Error fetching deployments:", error);
    res.status(500).json({ error: "Failed to fetch deployments" });
  }
});

// POST /api/deployments/:containerId/stop - Stop a deployment
router.post(
  "/:containerId/stop",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const containerId = req.params.containerId as string;
      const result = await stopDeployment(containerId);
      res.json(result);
    } catch (error) {
      console.error("Error stopping deployment:", error);
      res.status(500).json({ error: "Failed to stop deployment" });
    }
  }
);

// DELETE /api/deployments/:containerId - Delete a deployment
router.delete(
  "/:containerId",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const containerId = req.params.containerId as string;
      const result = await deleteDeployment(containerId);
      res.json(result);
    } catch (error) {
      console.error("Error deleting deployment:", error);
      res.status(500).json({ error: "Failed to delete deployment" });
    }
  }
);

export default router;
