import fs from "fs/promises";
import path from "path";
import { env } from "../config/env";
import {
  getTemplateFiles,
  TEMPLATE_META,
  type TemplateId,
} from "./templates";

// Base directory for all workspace files
const WORKSPACES_ROOT = path.resolve(
  process.env.WORKSPACES_DIR || path.join(process.cwd(), "workspaces")
);

/** Root of a workspace (contains workspace.json + project/) */
export function getWorkspaceRoot(workspaceId: string): string {
  const safe = workspaceId.replace(/[^a-zA-Z0-9_-]/g, "");
  return path.join(WORKSPACES_ROOT, safe);
}

/** Project directory inside a workspace (all project files live here) */
export function getWorkspacePath(workspaceId: string): string {
  return path.join(getWorkspaceRoot(workspaceId), "project");
}

// ── Initialize workspace on disk ────────────────────────
export async function initWorkspaceFiles(
  workspaceId: string,
  templateId: string = "blank"
): Promise<void> {
  const wsPath = getWorkspacePath(workspaceId);

  // Create workspace root dir
  await fs.mkdir(wsPath, { recursive: true });

  // Generate template files
  const template = (TEMPLATE_META[templateId as TemplateId]
    ? templateId
    : "blank") as TemplateId;
  const files = await getTemplateFiles(template);

  for (const [relPath, content] of Object.entries(files)) {
    const fullPath = path.join(wsPath, relPath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content, "utf-8");
  }
}

// ── Delete workspace from disk ──────────────────────────
export async function deleteWorkspaceFiles(
  workspaceId: string
): Promise<void> {
  const wsRoot = getWorkspaceRoot(workspaceId);
  try {
    await fs.rm(wsRoot, { recursive: true, force: true });
  } catch {
    // Ignore if already deleted
  }
}

// ── List directory contents ─────────────────────────────
export interface FileEntry {
  name: string;
  path: string; // relative to workspace root
  type: "file" | "directory";
  children?: FileEntry[];
}

export async function listDirectory(
  workspaceId: string,
  relativePath: string = ""
): Promise<FileEntry[]> {
  const wsPath = getWorkspacePath(workspaceId);
  const dirPath = path.join(wsPath, relativePath);

  // Security: ensure resolved path is within workspace
  const resolved = path.resolve(dirPath);
  if (!resolved.startsWith(path.resolve(wsPath))) {
    throw new Error("Path traversal detected");
  }

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const result: FileEntry[] = [];

    // Sort: directories first, then files, both alphabetically
    const sorted = entries.sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });

    for (const entry of sorted) {
      // Skip hidden files and node_modules
      if (entry.name.startsWith(".") || entry.name === "node_modules") continue;

      const entryRelPath = relativePath
        ? `${relativePath}/${entry.name}`
        : entry.name;

      result.push({
        name: entry.name,
        path: entryRelPath,
        type: entry.isDirectory() ? "directory" : "file",
      });
    }

    return result;
  } catch {
    return [];
  }
}

// ── Recursive directory tree ────────────────────────────
export async function getFileTree(
  workspaceId: string,
  relativePath: string = "",
  depth: number = 5
): Promise<FileEntry[]> {
  if (depth <= 0) return [];

  const entries = await listDirectory(workspaceId, relativePath);

  for (const entry of entries) {
    if (entry.type === "directory") {
      entry.children = await getFileTree(workspaceId, entry.path, depth - 1);
    }
  }

  return entries;
}

// ── Read file content ───────────────────────────────────
export async function readFile(
  workspaceId: string,
  relativePath: string
): Promise<string> {
  const wsPath = getWorkspacePath(workspaceId);
  const filePath = path.join(wsPath, relativePath);

  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(path.resolve(wsPath))) {
    throw new Error("Path traversal detected");
  }

  return fs.readFile(filePath, "utf-8");
}

// ── Write / save file content ───────────────────────────
export async function writeFile(
  workspaceId: string,
  relativePath: string,
  content: string
): Promise<void> {
  const wsPath = getWorkspacePath(workspaceId);
  const filePath = path.join(wsPath, relativePath);

  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(path.resolve(wsPath))) {
    throw new Error("Path traversal detected");
  }

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, "utf-8");
}

// ── Create file or folder ───────────────────────────────
export async function createEntry(
  workspaceId: string,
  relativePath: string,
  type: "file" | "directory"
): Promise<void> {
  const wsPath = getWorkspacePath(workspaceId);
  const fullPath = path.join(wsPath, relativePath);

  const resolved = path.resolve(fullPath);
  if (!resolved.startsWith(path.resolve(wsPath))) {
    throw new Error("Path traversal detected");
  }

  if (type === "directory") {
    await fs.mkdir(fullPath, { recursive: true });
  } else {
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, "", "utf-8");
  }
}

// ── Rename file or folder ───────────────────────────────
export async function renameEntry(
  workspaceId: string,
  oldPath: string,
  newPath: string
): Promise<void> {
  const wsPath = getWorkspacePath(workspaceId);
  const oldFull = path.join(wsPath, oldPath);
  const newFull = path.join(wsPath, newPath);

  const resolvedOld = path.resolve(oldFull);
  const resolvedNew = path.resolve(newFull);
  if (
    !resolvedOld.startsWith(path.resolve(wsPath)) ||
    !resolvedNew.startsWith(path.resolve(wsPath))
  ) {
    throw new Error("Path traversal detected");
  }

  await fs.mkdir(path.dirname(newFull), { recursive: true });
  await fs.rename(oldFull, newFull);
}

// ── Delete file or folder ───────────────────────────────
export async function deleteEntry(
  workspaceId: string,
  relativePath: string
): Promise<void> {
  const wsPath = getWorkspacePath(workspaceId);
  const fullPath = path.join(wsPath, relativePath);

  const resolved = path.resolve(fullPath);
  if (!resolved.startsWith(path.resolve(wsPath))) {
    throw new Error("Path traversal detected");
  }

  const stat = await fs.stat(fullPath);
  if (stat.isDirectory()) {
    await fs.rm(fullPath, { recursive: true, force: true });
  } else {
    await fs.unlink(fullPath);
  }
}

// ── Check if workspace exists on disk ───────────────────
export async function workspaceExists(workspaceId: string): Promise<boolean> {
  const wsPath = getWorkspacePath(workspaceId);
  try {
    await fs.access(wsPath);
    return true;
  } catch {
    return false;
  }
}
