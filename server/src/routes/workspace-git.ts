import { Router, Request, Response } from "express";
import { authenticate } from "../middleware/auth";
import prisma from "../lib/prisma";
import { decrypt } from "../lib/encryption";
import { getWorkspacePath, workspaceExists } from "../lib/workspace";
import simpleGit, { SimpleGit } from "simple-git";
import fs from "fs/promises";
import path from "path";

const router = Router();

// Helper: get decrypted GitHub token for current user
async function getGitHubToken(userId: string): Promise<string | null> {
  const account = await prisma.connectedAccount.findUnique({
    where: {
      userId_provider: {
        userId,
        provider: "github",
      },
    },
  });
  if (!account) return null;
  return decrypt(account.accessToken);
}

// Helper: get a configured git instance for a workspace
async function getGitForWorkspace(
  workspaceId: string,
  userId: string
): Promise<{ git: SimpleGit; token: string } | null> {
  const token = await getGitHubToken(userId);
  if (!token) return null;

  const wsPath = getWorkspacePath(workspaceId);
  const exists = await workspaceExists(workspaceId);
  if (!exists) return null;

  // Look up username for git config
  const account = await prisma.connectedAccount.findUnique({
    where: { userId_provider: { userId, provider: "github" } },
  });

  const username = account?.username ?? "orbit-user";
  const email = `${username}@users.noreply.github.com`;

  // Use environment variables instead of git config --local to avoid
  // .git/config.lock race conditions when the workspace has no own .git dir
  const git = simpleGit({
    baseDir: wsPath,
    config: [
      `user.name=${username}`,
      `user.email=${email}`,
    ],
  });

  return { git, token };
}

// Helper: check if the workspace has its OWN .git repo (not a parent repo)
async function isOwnGitRepo(workspaceId: string): Promise<boolean> {
  const wsPath = getWorkspacePath(workspaceId);
  try {
    const stat = await fs.stat(path.join(wsPath, ".git"));
    return stat.isDirectory();
  } catch {
    return false;
  }
}

// ── Git Init ────────────────────────────────────────────
router.post(
  "/:workspaceId/init",
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

      const result = await getGitForWorkspace(workspace.id, req.user!.userId);
      if (!result) {
        res.status(400).json({ error: "GitHub not connected or workspace missing" });
        return;
      }

      const hasOwnRepo = await isOwnGitRepo(workspace.id);
      if (!hasOwnRepo) {
        await result.git.init();
        await result.git.add(".");
        await result.git.commit("Initial commit from Nebula IDE");
      }

      res.json({ message: "Git initialized" });
    } catch (error) {
      console.error("Git init error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ── Git Status ──────────────────────────────────────────
router.get(
  "/:workspaceId/status",
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

      const result = await getGitForWorkspace(workspace.id, req.user!.userId);
      if (!result) {
        res.status(400).json({ error: "GitHub not connected" });
        return;
      }

      const hasOwnRepo = await isOwnGitRepo(workspace.id);
      if (!hasOwnRepo) {
        res.json({
          isRepo: false,
          branch: null,
          modified: [],
          staged: [],
          untracked: [],
        });
        return;
      }

      const status = await result.git.status();
      const branch = status.current;

      res.json({
        isRepo: true,
        branch,
        modified: status.modified,
        staged: status.staged,
        untracked: status.not_added,
        ahead: status.ahead,
        behind: status.behind,
        files: status.files.map((f) => ({
          path: f.path,
          status: f.working_dir || f.index,
        })),
      });
    } catch (error) {
      console.error("Git status error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ── Git Stage ───────────────────────────────────────────
router.post(
  "/:workspaceId/stage",
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

      const result = await getGitForWorkspace(workspace.id, req.user!.userId);
      if (!result) {
        res.status(400).json({ error: "GitHub not connected" });
        return;
      }

      const { files } = req.body; // string[] | undefined  — undefined means stage all
      if (files && Array.isArray(files) && files.length > 0) {
        await result.git.add(files);
      } else {
        await result.git.add(".");
      }

      const status = await result.git.status();
      res.json({ message: "Staged", staged: status.staged });
    } catch (error) {
      console.error("Git stage error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ── Git Unstage ─────────────────────────────────────────
router.post(
  "/:workspaceId/unstage",
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

      const result = await getGitForWorkspace(workspace.id, req.user!.userId);
      if (!result) {
        res.status(400).json({ error: "GitHub not connected" });
        return;
      }

      const { files } = req.body; // string[] | undefined
      if (files && Array.isArray(files) && files.length > 0) {
        await result.git.reset(["HEAD", "--", ...files]);
      } else {
        await result.git.reset(["HEAD"]);
      }

      const status = await result.git.status();
      res.json({ message: "Unstaged", staged: status.staged });
    } catch (error) {
      console.error("Git unstage error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ── Git Commit ──────────────────────────────────────────
router.post(
  "/:workspaceId/commit",
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

      const { message } = req.body;
      if (!message) {
        res.status(400).json({ error: "Commit message is required" });
        return;
      }

      const result = await getGitForWorkspace(workspace.id, req.user!.userId);
      if (!result) {
        res.status(400).json({ error: "GitHub not connected" });
        return;
      }

      // Only commit what has been staged (don't auto-add everything)
      const status = await result.git.status();
      if (status.staged.length === 0) {
        // If nothing is staged, stage everything before committing (convenience)
        await result.git.add(".");
      }

      const commitResult = await result.git.commit(message);

      res.json({
        message: "Committed",
        summary: {
          commit: commitResult.commit,
          branch: commitResult.branch,
          changes: commitResult.summary.changes,
          insertions: commitResult.summary.insertions,
          deletions: commitResult.summary.deletions,
        },
      });
    } catch (error) {
      console.error("Git commit error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ── Git Push ────────────────────────────────────────────
router.post(
  "/:workspaceId/push",
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

      if (!workspace.repoUrl) {
        res.status(400).json({ error: "No remote repository linked" });
        return;
      }

      const result = await getGitForWorkspace(workspace.id, req.user!.userId);
      if (!result) {
        res.status(400).json({ error: "GitHub not connected" });
        return;
      }

      // Set authenticated remote URL
      const remoteUrl = workspace.repoUrl.replace(
        "https://",
        `https://x-access-token:${result.token}@`
      );

      const remotes = await result.git.getRemotes(true);
      if (remotes.find((r) => r.name === "origin")) {
        await result.git.remote(["set-url", "origin", remoteUrl]);
      } else {
        await result.git.addRemote("origin", remoteUrl);
      }

      const status = await result.git.status();
      const branch = status.current || "main";
      await result.git.push("origin", branch, ["--set-upstream"]);

      res.json({ message: `Pushed to ${branch}` });
    } catch (error: any) {
      console.error("Git push error:", error);
      res.status(500).json({ error: error.message || "Push failed" });
    }
  }
);

// ── Git Pull ────────────────────────────────────────────
router.post(
  "/:workspaceId/pull",
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

      if (!workspace.repoUrl) {
        res.status(400).json({ error: "No remote repository linked" });
        return;
      }

      const result = await getGitForWorkspace(workspace.id, req.user!.userId);
      if (!result) {
        res.status(400).json({ error: "GitHub not connected" });
        return;
      }

      // Set authenticated remote URL
      const remoteUrl = workspace.repoUrl.replace(
        "https://",
        `https://x-access-token:${result.token}@`
      );

      const remotes = await result.git.getRemotes(true);
      if (remotes.find((r) => r.name === "origin")) {
        await result.git.remote(["set-url", "origin", remoteUrl]);
      } else {
        await result.git.addRemote("origin", remoteUrl);
      }

      const pullResult = await result.git.pull("origin");

      res.json({
        message: "Pulled",
        summary: pullResult.summary,
      });
    } catch (error: any) {
      console.error("Git pull error:", error);
      res.status(500).json({ error: error.message || "Pull failed" });
    }
  }
);

// ── Get current branch ──────────────────────────────────
router.get(
  "/:workspaceId/branch",
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

      const result = await getGitForWorkspace(workspace.id, req.user!.userId);
      if (!result) {
        res.status(400).json({ error: "GitHub not connected" });
        return;
      }

      const hasOwnRepo = await isOwnGitRepo(workspace.id);
      if (!hasOwnRepo) {
        res.json({ branch: null, isRepo: false });
        return;
      }

      const branches = await result.git.branchLocal();
      res.json({
        isRepo: true,
        branch: branches.current,
        branches: branches.all,
      });
    } catch (error) {
      console.error("Git branch error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ── Create / switch branch ──────────────────────────────
router.post(
  "/:workspaceId/branch",
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

      const { name, create } = req.body;
      if (!name) {
        res.status(400).json({ error: "Branch name is required" });
        return;
      }

      const result = await getGitForWorkspace(workspace.id, req.user!.userId);
      if (!result) {
        res.status(400).json({ error: "GitHub not connected" });
        return;
      }

      if (create) {
        await result.git.checkoutLocalBranch(name);
      } else {
        await result.git.checkout(name);
      }

      res.json({ message: `Switched to branch ${name}`, branch: name });
    } catch (error: any) {
      console.error("Git branch switch error:", error);
      res.status(500).json({ error: error.message || "Branch operation failed" });
    }
  }
);

// ── Git Diff for a single file ──────────────────────────
router.get(
  "/:workspaceId/diff",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const workspace = await prisma.workspace.findFirst({
        where: { id: req.params.workspaceId as string, userId: req.user!.userId },
      });
      if (!workspace) {
        res.status(404).json({ error: "Workspace not found" });
        return;
      }

      const filePath = req.query.file as string | undefined;
      if (!filePath) {
        res.status(400).json({ error: "Query parameter 'file' is required" });
        return;
      }

      const result = await getGitForWorkspace(workspace.id, req.user!.userId);
      if (!result) {
        res.status(400).json({ error: "GitHub not connected" });
        return;
      }

      const hasOwnRepo = await isOwnGitRepo(workspace.id);
      if (!hasOwnRepo) {
        res.status(400).json({ error: "No git repository found" });
        return;
      }

      // Get the current (working-tree) version of the file
      const wsPath = getWorkspacePath(workspace.id);
      let currentContent: string;
      try {
        currentContent = await fs.readFile(path.join(wsPath, filePath), "utf-8");
      } catch {
        // File might be deleted
        currentContent = "";
      }

      // Get the HEAD version (last committed) of the file
      let originalContent: string;
      try {
        originalContent = await result.git.show([`HEAD:${filePath}`]);
      } catch {
        // File is untracked / new — no HEAD version
        originalContent = "";
      }

      res.json({ original: originalContent, modified: currentContent, filePath });
    } catch (error) {
      console.error("Git diff error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

export default router;
