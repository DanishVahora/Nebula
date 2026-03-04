import { Router, Request, Response } from "express";
import { authenticate } from "../middleware/auth";
import prisma from "../lib/prisma";
import { getWorkspacePath, workspaceExists } from "../lib/workspace";
import { TEMPLATE_META, type TemplateId } from "../lib/templates";
import { spawn, ChildProcess } from "child_process";

const router = Router();

// Store running processes per workspace
const runningProcesses = new Map<string, ChildProcess>();
// Store output buffers per workspace
const outputBuffers = new Map<string, string[]>();
const MAX_BUFFER_LINES = 500;

function appendOutput(workspaceId: string, line: string) {
  if (!outputBuffers.has(workspaceId)) {
    outputBuffers.set(workspaceId, []);
  }
  const buf = outputBuffers.get(workspaceId)!;
  buf.push(line);
  if (buf.length > MAX_BUFFER_LINES) {
    buf.splice(0, buf.length - MAX_BUFFER_LINES);
  }
}

// ── Get run command for workspace template ──────────────
function getRunCommand(template: string | null): { cmd: string; args: string[] } | null {
  const t = (template || "blank") as TemplateId;
  const meta = TEMPLATE_META[t];
  if (!meta?.runCommand) return null;

  // Parse the run command
  const parts = meta.runCommand.split("&&").map((s) => s.trim());
  // Use the last command (the actual run command); earlier ones are install steps
  const lastCmd = parts[parts.length - 1];
  const tokens = lastCmd.split(/\s+/);
  return { cmd: tokens[0], args: tokens.slice(1) };
}

// ── Run workspace ───────────────────────────────────────
router.post(
  "/:workspaceId/run",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const workspace = await prisma.workspace.findFirst({
        where: { id: (req.params.workspaceId as string), userId: req.user!.userId },
      });
      if (!workspace) {
        res.status(404).json({ error: "Workspace not found" });
        return;
      }

      const exists = await workspaceExists(workspace.id);
      if (!exists) {
        res.status(400).json({ error: "Workspace files not initialized" });
        return;
      }

      // Kill any existing process for this workspace
      const existing = runningProcesses.get(workspace.id);
      if (existing) {
        existing.kill("SIGTERM");
        runningProcesses.delete(workspace.id);
      }

      // Clear old output
      outputBuffers.set(workspace.id, []);

      // Determine command from custom input or template
      let cmd: string;
      let args: string[];

      if (req.body.command) {
        const tokens = req.body.command.split(/\s+/);
        cmd = tokens[0];
        args = tokens.slice(1);
      } else {
        const runCmd = getRunCommand((workspace as any).template);
        if (!runCmd) {
          res.status(400).json({ error: "No run command for this template" });
          return;
        }
        cmd = runCmd.cmd;
        args = runCmd.args;
      }

      const wsPath = getWorkspacePath(workspace.id);
      const timestamp = new Date().toISOString();
      appendOutput(workspace.id, `[${timestamp}] $ ${cmd} ${args.join(" ")}`);

      const child = spawn(cmd, args, {
        cwd: wsPath,
        shell: true,
        stdio: ["pipe", "pipe", "pipe"],
        env: { ...process.env, FORCE_COLOR: "0" },
      });

      runningProcesses.set(workspace.id, child);

      child.stdout?.on("data", (data: Buffer) => {
        const lines = data.toString().split("\n");
        for (const line of lines) {
          if (line.trim()) appendOutput(workspace.id, line);
        }
      });

      child.stderr?.on("data", (data: Buffer) => {
        const lines = data.toString().split("\n");
        for (const line of lines) {
          if (line.trim()) appendOutput(workspace.id, `[stderr] ${line}`);
        }
      });

      child.on("exit", (code) => {
        appendOutput(workspace.id, `\n[Process exited with code ${code}]`);
        runningProcesses.delete(workspace.id);
      });

      child.on("error", (err) => {
        appendOutput(workspace.id, `[Error] ${err.message}`);
        runningProcesses.delete(workspace.id);
      });

      res.json({
        message: "Process started",
        command: `${cmd} ${args.join(" ")}`,
        pid: child.pid,
      });
    } catch (error) {
      console.error("Run workspace error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ── Stop running process ────────────────────────────────
router.post(
  "/:workspaceId/stop",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const workspace = await prisma.workspace.findFirst({
        where: { id: (req.params.workspaceId as string), userId: req.user!.userId },
      });
      if (!workspace) {
        res.status(404).json({ error: "Workspace not found" });
        return;
      }

      const proc = runningProcesses.get(workspace.id);
      if (!proc) {
        res.json({ message: "No running process" });
        return;
      }

      proc.kill("SIGTERM");
      runningProcesses.delete(workspace.id);
      appendOutput(workspace.id, "\n[Process terminated by user]");

      res.json({ message: "Process stopped" });
    } catch (error) {
      console.error("Stop workspace error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ── Get output/logs ─────────────────────────────────────
router.get(
  "/:workspaceId/output",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const workspace = await prisma.workspace.findFirst({
        where: { id: (req.params.workspaceId as string), userId: req.user!.userId },
      });
      if (!workspace) {
        res.status(404).json({ error: "Workspace not found" });
        return;
      }

      const lines = outputBuffers.get(workspace.id) || [];
      const isRunning = runningProcesses.has(workspace.id);

      // Support polling with offset
      const since = parseInt(req.query.since as string) || 0;
      const newLines = lines.slice(since);

      res.json({
        output: newLines,
        total: lines.length,
        isRunning,
      });
    } catch (error) {
      console.error("Get output error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ── Execute a command ───────────────────────────────────
router.post(
  "/:workspaceId/exec",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const workspace = await prisma.workspace.findFirst({
        where: { id: (req.params.workspaceId as string), userId: req.user!.userId },
      });
      if (!workspace) {
        res.status(404).json({ error: "Workspace not found" });
        return;
      }

      const { command } = req.body;
      if (!command) {
        res.status(400).json({ error: "Command is required" });
        return;
      }

      const wsPath = getWorkspacePath(workspace.id);
      appendOutput(workspace.id, `$ ${command}`);

      const tokens = command.split(/\s+/);

      const output = await new Promise<string>((resolve, reject) => {
        let stdout = "";
        let stderr = "";

        const child = spawn(tokens[0], tokens.slice(1), {
          cwd: wsPath,
          shell: true,
          env: { ...process.env, FORCE_COLOR: "0" },
        });

        const timeout = setTimeout(() => {
          child.kill("SIGTERM");
          reject(new Error("Command timed out (30s)"));
        }, 30000);

        child.stdout?.on("data", (data: Buffer) => {
          stdout += data.toString();
        });

        child.stderr?.on("data", (data: Buffer) => {
          stderr += data.toString();
        });

        child.on("exit", (code) => {
          clearTimeout(timeout);
          const result = stdout + (stderr ? `\n${stderr}` : "");
          if (code !== 0) {
            appendOutput(workspace.id, `[Exit code: ${code}]`);
          }
          resolve(result);
        });

        child.on("error", (err) => {
          clearTimeout(timeout);
          reject(err);
        });
      });

      const lines = output.split("\n").filter((l) => l.trim());
      for (const line of lines) {
        appendOutput(workspace.id, line);
      }

      res.json({ output, exitCode: 0 });
    } catch (error: any) {
      console.error("Exec error:", error);
      res
        .status(500)
        .json({ error: error.message || "Command execution failed" });
    }
  }
);

export default router;
