import * as path from "path";
import { detectProjectType } from "./project-detector";
import { generateDockerfile } from "./dockerfile-generator";
import { buildDockerImage, runDockerContainer } from "./docker-service";
import { getNextPort } from "./port-manager";
import { saveDeployment } from "./deployment-manager";

export interface DeploymentResult {
  status: string;
  message: string;
  url?: string;
  port?: number;
  containerId?: string;
}

export async function startDeployment(workspaceId: string, userId: string): Promise<DeploymentResult> {
  // Log deployment start
  console.log("Starting deployment for workspace:", workspaceId);

  // Resolve workspace project path
  const projectPath = path.resolve("workspaces", workspaceId, "project");

  // Detect project type
  const projectType = detectProjectType(projectPath);
  console.log(`Detected project type: ${projectType}`);

  // Generate Dockerfile
  generateDockerfile(projectPath, projectType);

  // Build Docker image
  const imageTag = await buildDockerImage(projectPath, workspaceId);

  // Allocate port
  const port = getNextPort();

  // Run container
  const container = await runDockerContainer(imageTag, port);

  // Generate deployment URL
  const url = `http://localhost:${port}`;

  // Save deployment to database
  await saveDeployment({
    workspaceId,
    userId,
    containerId: container.containerId,
    imageTag,
    port,
    url,
    status: "running",
  });

  return {
    status: "deployed",
    message: "Application deployed successfully",
    url,
    port,
    containerId: container.containerId,
  };
}
