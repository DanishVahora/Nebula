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

  const referer =
    (req.headers.referer as string) ||
    (req.headers.referrer as string) ||
    "";

  if (!referer) {
    next();
    return;
  }

  const match = referer.match(PREVIEW_REFERER_REGEX);
  if (!match) {
    next();
    return;
  }

  const [, , portStr] = match;
  const port = parseInt(portStr, 10);

  if (isNaN(port) || port < 1 || port > 65535) {
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

  // Proxy the request to the dev server
  const target = `http://localhost:${port}`;
  fallbackProxy.web(req, res, { target });
}
