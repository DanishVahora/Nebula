import { Router, Request, Response } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { authenticate } from "../middleware/auth";
import { workspaceExists } from "../lib/workspace";
import { buildContext, buildErrorPrompt } from "../lib/context";
import { env } from "../config/env";

const router = Router();

// ── POST /api/ai/error-fix ─────────────────────────────
router.post(
    "/error-fix",
    authenticate,
    async (req: Request, res: Response) => {
        try {
            const { workspaceId, filePath, errorLine, errorMessage } = req.body;

            // ── Validate request ───────────────────────
            if (!workspaceId || typeof workspaceId !== "string") {
                res.status(400).json({ error: "workspaceId is required" });
                return;
            }
            if (!filePath || typeof filePath !== "string") {
                res.status(400).json({ error: "filePath is required" });
                return;
            }
            if (errorLine == null || typeof errorLine !== "number") {
                res.status(400).json({ error: "errorLine must be a number" });
                return;
            }
            if (!errorMessage || typeof errorMessage !== "string") {
                res.status(400).json({ error: "errorMessage is required" });
                return;
            }

            // ── Verify API key ─────────────────────────
            if (!env.GEMINI_API_KEY) {
                res.status(503).json({ error: "Gemini API key is not configured" });
                return;
            }

            // ── Verify workspace exists ────────────────
            const exists = await workspaceExists(workspaceId);
            if (!exists) {
                res.status(404).json({ error: "Workspace not found" });
                return;
            }

            // 1. Build project context
            const context = await buildContext(workspaceId, filePath, errorLine);

            // 2. Build the LLM prompt
            const prompt = buildErrorPrompt(context, errorMessage);

            if (env.NODE_ENV === "development") {
                console.log("[AI Error Fix] Generated prompt length:", prompt.length);
            }

            // 3. Send to Gemini with fallback models
            const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
            const models = ["gemini-2.0-flash", "gemini-1.5-flash"];
            let text = "";

            for (const modelName of models) {
                try {
                    const model = genAI.getGenerativeModel({ model: modelName });
                    const result = await model.generateContent(prompt);
                    text = result.response.text();
                    break;
                } catch (modelErr) {
                    const msg = modelErr instanceof Error ? modelErr.message : String(modelErr);
                    console.warn(`[AI Error Fix] Model ${modelName} failed: ${msg}`);
                    // Try next model
                }
            }

            if (!text) {
                res.status(502).json({
                    error: "Could not reach the AI service. Please check your network connection and API key.",
                });
                return;
            }

            // 4. Parse structured sections from the response
            const explanation = extractSection(text, "explanation") || text;
            const suggestedFix = extractSection(text, "suggested fix") || "";
            const correctedCode = extractSection(text, "corrected code") || extractCodeBlock(text);

            res.json({ explanation, suggestedFix, correctedCode });
        } catch (err) {
            const message = err instanceof Error ? err.message : "AI error fix failed";
            console.error("[AI Error Fix] Error:", message);

            // Provide user-friendly error for network issues
            if (message.includes("fetch failed") || message.includes("ECONNREFUSED") || message.includes("ETIMEDOUT")) {
                res.status(502).json({
                    error: "Cannot connect to AI service. Check server network connectivity.",
                });
                return;
            }

            res.status(500).json({ error: message });
        }
    }
);

// ── Helpers to extract structured parts from LLM text ──

/**
 * Look for a markdown heading matching `label` and return the content
 * below it until the next heading of the same or higher level.
 */
function extractSection(text: string, label: string): string {
    const pattern = new RegExp(
        `#+\\s*${label}[:\\s]*\\n([\\s\\S]*?)(?=\\n#+\\s|$)`,
        "i"
    );
    const match = text.match(pattern);
    return match ? match[1].trim() : "";
}

/**
 * Extract the first fenced code block from the text.
 */
function extractCodeBlock(text: string): string {
    const match = text.match(/```[\w]*\n([\s\S]*?)```/);
    return match ? match[1].trim() : "";
}

export default router;
