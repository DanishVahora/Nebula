import { Request, Response, NextFunction } from "express";
import httpProxy from "http-proxy";
import { verifyToken } from "../lib/jwt";
import * as cookie from "cookie";

/**
 * Regex to extract workspaceId and port from a preview Referer URL.
 * Matches: /api/preview/<workspaceId>/<port>
 */
const PREVIEW_REFERER_REGEX = /\/api\/preview\/([a-zA-Z0-9_-]+)\/(\d+)/;

const fallbackProxy = httpProxy.createProxyServer({
  changeOrigin: true,
  selfHandleResponse: false,
  secure: false,
});

fallbackProxy.on("error", (err, _req, res) => {
  console.error("[Preview Fallback] Error:", err.message);
  if (res && "writeHead" in res && typeof res.writeHead === "function") {
    try {
      (res as any).writeHead(502);
      (res as any).end("");
    } catch {
      // Already sent
    }
  }
});

// Remove restrictive CSP headers from proxied preview responses
fallbackProxy.on("proxyRes", (proxyRes) => {
  delete proxyRes.headers["content-security-policy"];
  delete proxyRes.headers["x-frame-options"];
});

/**
 * Middleware that catches root-relative requests originating from preview iframes.
 *
 * When a proxied page (e.g. a Vite app) references resources with absolute paths
 * like `/@vite/client` or `/src/main.tsx`, the browser resolves them against the
 * server origin instead of the dev server. This middleware detects such requests
 * via the Referer header and proxies them to the correct dev server port.
 *
 * Must be mounted BEFORE regular API routes in the middleware chain.
 */
export function previewFallbackProxy(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Skip API routes, WebSocket paths, and known static paths
  if (
    req.path.startsWith("/api/") ||
    req.path.startsWith("/ws/")
  ) {
    next();
    return;
  }

  let port: number | null = null;

  // ── Strategy 1: Extract port from Referer header ─────
  // Works for resources directly referenced from the preview page HTML.
  const referer =
    (req.headers.referer as string) ||
    (req.headers.referrer as string) ||
    "";

  if (referer) {
    const match = referer.match(PREVIEW_REFERER_REGEX);
    if (match) {
      const parsed = parseInt(match[2], 10);
      if (!isNaN(parsed) && parsed > 0 && parsed < 65536) {
        port = parsed;
      }
    }
  }

  // ── Strategy 2: Fall back to tracking cookie ─────────
  // Handles nested ES module imports where the Referer is the
  // importing module’s URL (e.g. /src/main.tsx) instead of the
  // /api/preview/... page URL. The cookie is set by the preview
  // proxy on the initial page response.
  if (!port) {
    const cookies = cookie.parse(req.headers.cookie || "");
    const cookiePort = parseInt(cookies.__orbit_preview_port || "", 10);
    if (!isNaN(cookiePort) && cookiePort > 0 && cookiePort < 65536) {
      port = cookiePort;
    }
  }

  // Neither strategy matched — not a preview resource request
  if (!port) {
    next();
    return;
  }

  // Authenticate the request via cookie
  const cookies = cookie.parse(req.headers.cookie || "");
  const token = cookies.token;
  if (!token) {
    next();
    return;
  }

  try {
    verifyToken(token); // Throws if invalid
  } catch {
    next();
    return;
  }

  // Remove any CSP / framing headers set by upstream middleware
  res.removeHeader("Content-Security-Policy");
  res.removeHeader("X-Frame-Options");
  res.removeHeader("Cross-Origin-Opener-Policy");
  res.removeHeader("Cross-Origin-Resource-Policy");
  res.removeHeader("X-Content-Type-Options");

  // Proxy the request to the dev server
  const target = `http://localhost:${port}`;
  fallbackProxy.web(req, res, { target });
}
