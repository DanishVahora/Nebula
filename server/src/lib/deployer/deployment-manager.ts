import prisma from "../prisma";
import { exec } from "child_process";
import util from "util";

const execAsync = util.promisify(exec);

export interface DeploymentData {
  workspaceId: string;
  userId: string;
  containerId: string;
  imageTag: string;
  port: number;
  url: string;
  status: string;
}

export async function saveDeployment(data: DeploymentData) {
  return prisma.deployment.create({ data });
}

export async function getUserDeployments(userId: string) {
  return prisma.deployment.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

export async function stopDeployment(containerId: string) {
  const command = `docker stop ${containerId}`;
  console.log(`Stopping container: ${containerId}`);

  try {
    const { stdout, stderr } = await execAsync(command);
    if (stdout) console.log("Docker stop stdout:", stdout);
    if (stderr) console.log("Docker stop stderr:", stderr);

    // Update deployment status in database
    await prisma.deployment.updateMany({
      where: { containerId },
      data: { status: "stopped" },
    });

    return { success: true, message: "Container stopped" };
  } catch (error) {
    console.error("Error stopping container:", error);
    throw error;
  }
}

export async function deleteDeployment(containerId: string) {
  const command = `docker rm -f ${containerId}`;
  console.log(`Deleting container: ${containerId}`);

  try {
    const { stdout, stderr } = await execAsync(command);
    if (stdout) console.log("Docker rm stdout:", stdout);
    if (stderr) console.log("Docker rm stderr:", stderr);

    // Delete deployment from database
    await prisma.deployment.deleteMany({
      where: { containerId },
    });

    return { success: true, message: "Container deleted" };
  } catch (error) {
    console.error("Error deleting container:", error);
    throw error;
  }
}
