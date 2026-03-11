import { Router, Request, Response } from "express";
import httpProxy from "http-proxy";
import { authenticate } from "../middleware/auth";
import prisma from "../lib/prisma";

const router = Router();

// ── Shared proxy instance ──────────────────────────────
const proxy = httpProxy.createProxyServer({
  changeOrigin: true,
  selfHandleResponse: false,
  // Don't verify SSL in development
  secure: false,
});

proxy.on("error", (err, _req, res) => {
  console.error("[Preview Proxy] Error:", err.message);
  if (res && "writeHead" in res && typeof res.writeHead === "function") {
    try {
      (res as any).writeHead(502, { "Content-Type": "text/html" });
      (res as any).end(
        `<html><body style="margin:0;display:flex;align-items:center;justify-content:center;height:100vh;background:#1e1e1e;color:#858585;font-family:sans-serif;">` +
          `<div style="text-align:center"><h2 style="color:#d4d4d4">Preview Unavailable</h2>` +
          `<p>The dev server is not responding. Make sure it is running.</p></div></body></html>`
      );
    } catch {
      // Response may already be sent
    }
  }
});

// Remove restrictive CSP headers and set a tracking cookie so the
// preview-fallback middleware can identify nested resource requests
// (e.g. ES module imports whose Referer is the importing module URL
// rather than the /api/preview/... page URL).
proxy.on("proxyRes", (proxyRes, req) => {
  delete proxyRes.headers["content-security-policy"];
  delete proxyRes.headers["x-frame-options"];

  const port = (req as any).__orbitPreviewPort;
  if (port) {
    const cookieStr = `__orbit_preview_port=${port}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`;
    const existing = proxyRes.headers["set-cookie"];
    if (Array.isArray(existing)) {
      existing.push(cookieStr);
    } else if (existing) {
      proxyRes.headers["set-cookie"] = [existing, cookieStr];
    } else {
      proxyRes.headers["set-cookie"] = [cookieStr];
    }
  }
});

// ── Helper: validate and proxy ─────────────────────────
async function handlePreviewProxy(req: Request, res: Response) {
  const workspaceId = req.params.workspaceId as string;
  const port = req.params.port as string;
  const portNum = parseInt(port, 10);

  if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
    res.status(400).json({ error: "Invalid port" });
    return;
  }

  // Verify workspace ownership
  const workspace = await prisma.workspace.findFirst({
    where: { id: workspaceId, userId: req.user!.userId },
  });
  if (!workspace) {
    res.status(404).json({ error: "Workspace not found" });
    return;
  }

  // Store port on the request so the proxyRes handler can set the tracking cookie
  (req as any).__orbitPreviewPort = portNum;

  const target = `http://localhost:${portNum}`;

  // Rewrite URL: strip /api/preview/:workspaceId/:port prefix
  const prefix = `/api/preview/${workspaceId}/${port}`;
  let forwardPath = req.originalUrl;
  if (forwardPath.startsWith(prefix)) {
    forwardPath = forwardPath.slice(prefix.length) || "/";
  }
  req.url = forwardPath;

  // Remove any CSP / framing headers set by upstream middleware (e.g. helmet)
  // so the proxied page can run inline scripts and be embedded in the iframe.
  res.removeHeader("Content-Security-Policy");
  res.removeHeader("X-Frame-Options");
  res.removeHeader("Cross-Origin-Opener-Policy");
  res.removeHeader("Cross-Origin-Resource-Policy");
  res.removeHeader("X-Content-Type-Options");

  proxy.web(req, res, { target });
}

// ── Routes: Proxy all HTTP methods ─────────────────────
// With additional path segments
router.all("/:workspaceId/:port/*path", authenticate, handlePreviewProxy);

// Root path (no trailing path)
router.all("/:workspaceId/:port", authenticate, handlePreviewProxy);

// ── Export proxy for WebSocket upgrade handling ────────
export { proxy };
export default router;
