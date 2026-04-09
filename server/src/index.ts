import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { env } from "./config/env";
import "./config/passport"; // Initialize passport strategies

import authRoutes from "./routes/auth";
import githubRoutes from "./routes/github";
import userRoutes from "./routes/user";
import workspaceRoutes from "./routes/workspace";
import workspaceGitRoutes from "./routes/workspace-git";
import workspaceRunRoutes from "./routes/workspace-run";
import workspaceTerminalRoutes, {
  attachTerminalWebSocket,
} from "./routes/workspace-terminal";
import previewRoutes from "./routes/preview";
import classroomRoutes from "./routes/classroom";
import classroomBlogRoutes from "./routes/classroom-blog";
import assignmentRoutes from "./routes/assignment";
import dsaRoutes from "./routes/dsa";
import submissionRoutes from "./routes/submissions";
import assignmentAIRoutes from "./routes/assignment-ai";
import aiErrorRoutes from "./routes/ai-error";
import contextRoutes from "./routes/context";
import deployRoutes from "./routes/deploy";
import deployStreamRoutes from "./routes/deploy-stream";
import deploymentRoutes from "./routes/deployments";
import { previewFallbackProxy } from "./middleware/preview-fallback";
import { sessionManager } from "./lib/session-manager";
import httpProxy from "http-proxy";
import * as cookieModule from "cookie";
import { verifyToken } from "./lib/jwt";

const app = express();

// ── Security ───────────────────────────────────────────
const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      // OAuth providers return remote avatar URLs (Google/GitHub), so allow external images.
      "img-src": ["'self'", "data:", "blob:", "https:", "http:"],
      "frame-ancestors": ["'self'", env.CLIENT_URL],
    },
  },
  crossOriginEmbedderPolicy: false,
});

// Skip helmet for preview routes and preview-fallback requests so that
// proxied pages (Vite dev servers etc.) can run inline scripts and load
// root-relative resources without being blocked by the server's CSP.
app.use((req, res, next) => {
  if (req.path.startsWith("/api/preview/")) return next();
  const referer = (req.headers.referer || req.headers.referrer || "") as string;
  if (
    !req.path.startsWith("/api/") &&
    !req.path.startsWith("/ws/") &&
    (referer.includes("/api/preview/") ||
      cookieModule.parse(req.headers.cookie || "").__orbit_preview_port)
  ) {
    return next();
  }
  helmetMiddleware(req, res, next);
});

app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  })
);

// ── Parsing ────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── Preview fallback proxy ─────────────────────────────
// Must be before API routes so root-relative requests from preview
// iframes (e.g. /@vite/client) get proxied to the dev server.
app.use(previewFallbackProxy);

// ── Routes ─────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/github", githubRoutes);
app.use("/api/user", userRoutes);
app.use("/api/workspace", workspaceRoutes);
app.use("/api/workspace-git", workspaceGitRoutes);
app.use("/api/workspace-run", workspaceRunRoutes);
app.use("/api/workspace", workspaceTerminalRoutes);
app.use("/api/preview", previewRoutes);
app.use("/api/classrooms", classroomRoutes);
app.use("/api", classroomBlogRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/dsa", dsaRoutes);
app.use("/api/submissions", submissionRoutes);
app.use("/api/assignments/ai", assignmentAIRoutes);
app.use("/api/ai", aiErrorRoutes);
app.use("/api/workspace", contextRoutes);
app.use("/api/deploy", deployStreamRoutes);
app.use("/api/deploy", deployRoutes);
app.use("/api/deployments", deploymentRoutes);

// ── Health check ───────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Start ──────────────────────────────────────────────
import http from "http";

const server = http.createServer(app);

// ── Attach terminal WebSocket handler ──────────────────
attachTerminalWebSocket(server);

// ── Proxy WebSocket upgrades for preview (Vite HMR etc.) ──
const previewWsProxy = httpProxy.createProxyServer({ ws: true, changeOrigin: true });
previewWsProxy.on("error", (err) => {
  console.error("[Preview WS Proxy] Error:", err.message);
});

server.on("upgrade", (request, socket, head) => {
  const url = request.url || "";

  // Skip terminal WebSocket paths (handled by attachTerminalWebSocket)
  if (url.startsWith("/ws/terminal/")) return;

  // Check for preview port cookie
  const cookies = cookieModule.parse(request.headers.cookie || "");
  const port = parseInt(cookies.__orbit_preview_port || "", 10);
  const token = cookies.token;

  if (!port || isNaN(port) || port < 1 || port > 65535 || !token) {
    socket.destroy();
    return;
  }

  try {
    verifyToken(token);
  } catch {
    socket.destroy();
    return;
  }

  const target = `http://localhost:${port}`;
  previewWsProxy.ws(request, socket, head, { target });
});

server.listen(env.PORT, () => {
  console.log(`🚀 Nebula server running on http://localhost:${env.PORT}`);
  console.log(`   Environment: ${env.NODE_ENV}`);
  console.log(`   Client URL: ${env.CLIENT_URL}`);
});

process.on("SIGTERM", () => {
  sessionManager.disposeAll();
  server.close();
});

export default app;
