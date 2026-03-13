import { exec } from "child_process";
import util from "util";

const execAsync = util.promisify(exec);

export async function buildDockerImage(
  projectPath: string,
  workspaceId: string
): Promise<string> {
  // Generate image tag
  const imageTag = `orbit-${workspaceId}`;

  // Build command
  const command = `docker build -t ${imageTag} ${projectPath}`;

  console.log(`Building Docker image: ${imageTag}`);
  console.log(`Command: ${command}`);

  // Execute command
  const { stdout, stderr } = await execAsync(command);

  // Log output
  if (stdout) {
    console.log("Docker build stdout:", stdout);
  }
  if (stderr) {
    console.log("Docker build stderr:", stderr);
  }

  console.log(`Docker image ${imageTag} built successfully`);

  return imageTag;
}

export interface ContainerInfo {
  containerId: string;
  containerName: string;
}

export async function runDockerContainer(
  imageTag: string,
  port: number
): Promise<ContainerInfo> {
  const containerName = `orbit-${port}`;
  const command = `docker run -d -p ${port}:3000 --name ${containerName} ${imageTag}`;

  console.log(`Running Docker container: ${containerName}`);
  console.log(`Command: ${command}`);

  const { stdout } = await execAsync(command);

  const containerId = stdout.trim();
  console.log(`Container started with ID: ${containerId}`);

  return {
    containerId,
    containerName,
  };
}
