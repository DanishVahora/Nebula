import { Router, Request, Response } from "express";
import { authenticate } from "../middleware/auth";
import { workspaceExists } from "../lib/workspace";
import {
    indexWorkspace,
    getOrBuildIndex,
    getIndexSummary,
    invalidateIndex,
    buildErrorContext,
    buildQueryContext,
    buildContext,
} from "../lib/context";

const router = Router();

// ── Middleware: verify workspace exists ─────────────────
async function ensureWorkspace(
    req: Request,
    res: Response,
    next: () => void
): Promise<void> {
    const workspaceId = req.params.workspaceId as string;
    if (!workspaceId) {
        res.status(400).json({ error: "workspaceId is required" });
        return;
    }
    const exists = await workspaceExists(workspaceId);
    if (!exists) {
        res.status(404).json({ error: "Workspace not found" });
        return;
    }
    next();
}

// ── POST /:workspaceId/context/index ───────────────────
// Trigger a full workspace indexing (or re-index)
router.post(
    "/:workspaceId/context/index",
    authenticate,
    ensureWorkspace,
    async (req: Request, res: Response) => {
        try {
            const workspaceId = req.params.workspaceId as string;
            const index = await indexWorkspace(workspaceId);
            const summary = getIndexSummary(index);
            res.json(summary);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Indexing failed";
            console.error("[Context] Indexing error:", message);
            res.status(500).json({ error: message });
        }
    }
);

// ── GET /:workspaceId/context ──────────────────────────
// Get workspace context summary (returns cached or builds fresh)
router.get(
    "/:workspaceId/context",
    authenticate,
    ensureWorkspace,
    async (req: Request, res: Response) => {
        try {
            const workspaceId = req.params.workspaceId as string;
            const index = await getOrBuildIndex(workspaceId);
            const summary = getIndexSummary(index);
            res.json(summary);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to get context";
            console.error("[Context] Error:", message);
            res.status(500).json({ error: message });
        }
    }
);

// ── DELETE /:workspaceId/context ───────────────────────
// Invalidate cached index for a workspace
router.delete(
    "/:workspaceId/context",
    authenticate,
    ensureWorkspace,
    async (req: Request, res: Response) => {
        const workspaceId = req.params.workspaceId as string;
        invalidateIndex(workspaceId);
        res.json({ success: true });
    }
);

// ── POST /:workspaceId/context/error ───────────────────
// Build context for a specific error (for AI debugging)
router.post(
    "/:workspaceId/context/error",
    authenticate,
    ensureWorkspace,
    async (req: Request, res: Response) => {
        try {
            const workspaceId = req.params.workspaceId as string;
            const { file, error: errorMessage, line } = req.body;

            if (!file || !errorMessage) {
                res.status(400).json({ error: "file and error are required" });
                return;
            }

            const context = await buildErrorContext(workspaceId, {
                errorFile: file,
                errorMessage,
                errorLine: typeof line === "number" ? line : undefined,
            });

            res.json(context);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to build error context";
            console.error("[Context] Error context failure:", message);
            res.status(500).json({ error: message });
        }
    }
);

// ── POST /:workspaceId/context/query ───────────────────
// Build context for a general AI query about the project
router.post(
    "/:workspaceId/context/query",
    authenticate,
    ensureWorkspace,
    async (req: Request, res: Response) => {
        try {
            const workspaceId = req.params.workspaceId as string;
            const { query, file } = req.body;

            if (!query) {
                res.status(400).json({ error: "query is required" });
                return;
            }

            const context = await buildQueryContext(
                workspaceId,
                query,
                file || undefined
            );

            res.json(context);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to build query context";
            console.error("[Context] Query context failure:", message);
            res.status(500).json({ error: message });
        }
    }
);

// ── POST /:workspaceId/context/build ───────────────────
// Lightweight context builder for AI debugging
router.post(
    "/:workspaceId/context/build",
    authenticate,
    ensureWorkspace,
    async (req: Request, res: Response) => {
        try {
            const workspaceId = req.params.workspaceId as string;
            const { file, errorLine } = req.body;

            if (!file || typeof errorLine !== "number") {
                res.status(400).json({ error: "file (string) and errorLine (number) are required" });
                return;
            }

            const context = await buildContext(workspaceId, file, errorLine);
            res.json(context);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to build context";
            console.error("[Context] Build context failure:", message);
            res.status(500).json({ error: message });
        }
    }
);

export default router;
