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
import { terminalManager } from "./lib/terminal-manager";

const app = express();

// ── Security ───────────────────────────────────────────
app.use(helmet());
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

// ── Routes ─────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/github", githubRoutes);
app.use("/api/user", userRoutes);
app.use("/api/workspace", workspaceRoutes);
app.use("/api/workspace-git", workspaceGitRoutes);
app.use("/api/workspace-run", workspaceRunRoutes);
app.use("/api/workspace", workspaceTerminalRoutes);

// ── Health check ───────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Start ──────────────────────────────────────────────
import http from "http";

const server = http.createServer(app);

// ── Attach terminal WebSocket handler ──────────────────
attachTerminalWebSocket(server);

server.listen(env.PORT, () => {
  console.log(`🚀 Nebula server running on http://localhost:${env.PORT}`);
  console.log(`   Environment: ${env.NODE_ENV}`);
  console.log(`   Client URL: ${env.CLIENT_URL}`);
});

process.on("SIGTERM", () => {
  terminalManager.disposeAll();
  server.close();
});

export default app;
