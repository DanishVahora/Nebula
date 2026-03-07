import { useState, useCallback, useEffect } from "react";
import {
  Globe,
  ExternalLink,
  RefreshCw,
  Radio,
  Unplug,
} from "lucide-react";
import { workspaceAPI, API_BASE } from "@/lib/api";

/** Common port → service name mapping */
const PORT_SERVICE_MAP: Record<number, string> = {
  80: "HTTP",
  443: "HTTPS",
  3000: "Dev Server",
  3001: "Dev Server",
  4000: "GraphQL",
  4200: "Angular CLI",
  4321: "Astro",
  5000: "Flask / API",
  5173: "Vite",
  5174: "Vite",
  5500: "Live Server",
  8000: "Django / API",
  8080: "HTTP Proxy",
  8081: "Metro Bundler",
  8443: "HTTPS Alt",
  8888: "Jupyter",
  9000: "PHP / API",
  19006: "Expo DevTools",
};

function getServiceName(port: number): string {
  return PORT_SERVICE_MAP[port] || "Application";
}

interface PortInfo {
  port: number;
  name: string;
}

interface PortsPanelProps {
  workspaceId: string;
  ports: number[];
  onOpenPreview: (port: number) => void;
  onRefresh?: () => void;
}

export function PortsPanel({
  workspaceId,
  ports,
  onOpenPreview,
  onRefresh,
}: PortsPanelProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Auto-fetch ports from REST API on mount as a fallback in case
  // the WebSocket port-open event was missed (e.g. ANSI escape codes,
  // reconnection timing, etc.)
  useEffect(() => {
    let cancelled = false;
    workspaceAPI.getActivePorts(workspaceId).then((res) => {
      if (cancelled) return;
      const fetchedPorts: number[] = res.data.ports;
      if (fetchedPorts.length > 0 && onRefresh) {
        onRefresh();
      }
    }).catch(() => { /* ignore */ });
    return () => { cancelled = true; };
  }, [workspaceId]); // eslint-disable-line react-hooks/exhaustive-deps

  const portInfos: PortInfo[] = ports.map((p) => ({
    port: p,
    name: getServiceName(p),
  }));

  const handleRefresh = useCallback(async () => {
    if (!onRefresh) return;
    setIsRefreshing(true);
    try {
      onRefresh();
    } finally {
      // Small delay so spinner is visible
      setTimeout(() => setIsRefreshing(false), 400);
    }
  }, [onRefresh]);

  const handleOpenExternal = useCallback(
    (port: number) => {
      const url = `${API_BASE}/api/preview/${workspaceId}/${port}/`;
      window.open(url, "_blank");
    },
    [workspaceId]
  );

  // ── Empty state ──────────────────────────────────────
  if (ports.length === 0) {
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 shrink-0">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#858585]">
            Ports
          </span>
          {onRefresh && (
            <button
              onClick={handleRefresh}
              className="p-1 hover:bg-[#3c3c3c] rounded transition-colors"
              title="Refresh ports"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-[#858585] hover:text-[#d4d4d4] ${
                  isRefreshing ? "animate-spin" : ""
                }`}
              />
            </button>
          )}
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#252526] border border-[#3c3c3c] flex items-center justify-center">
            <Unplug className="w-6 h-6 text-[#6e7681]" />
          </div>
          <p className="text-[13px] text-[#d4d4d4] text-center font-medium">
            No forwarded ports
          </p>
          <p className="text-[12px] text-[#6e7681] text-center leading-relaxed max-w-[200px]">
            Start a dev server in the terminal and it will appear here automatically.
          </p>
        </div>
      </div>
    );
  }

  // ── Port list ────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 shrink-0">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#858585]">
          Ports
        </span>
        <div className="flex items-center gap-0.5">
          {onRefresh && (
            <button
              onClick={handleRefresh}
              className="p-1 hover:bg-[#3c3c3c] rounded transition-colors"
              title="Refresh ports"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-[#858585] hover:text-[#d4d4d4] ${
                  isRefreshing ? "animate-spin" : ""
                }`}
              />
            </button>
          )}
        </div>
      </div>

      {/* Column headers */}
      <div className="flex items-center gap-2 px-4 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#6e7681] border-b border-[#2d2d2d]">
        <span className="w-14 shrink-0">Port</span>
        <span className="flex-1 min-w-0">Service</span>
        <span className="w-[52px] shrink-0 text-right">Actions</span>
      </div>

      {/* Port rows */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {portInfos.map((info) => (
          <div
            key={info.port}
            className="group flex items-center gap-2 px-4 py-2 hover:bg-[#2d2d2d] transition-colors cursor-pointer border-b border-[#1e1e1e]"
            onClick={() => onOpenPreview(info.port)}
            title={`Open preview for port ${info.port}`}
          >
            {/* Status indicator + Port number */}
            <div className="w-14 shrink-0 flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-[#4ec9b0] shrink-0 shadow-[0_0_4px_rgba(78,201,176,0.4)]" />
              <span className="text-[13px] font-mono text-[#d4d4d4] font-medium">
                {info.port}
              </span>
            </div>

            {/* Service name */}
            <div className="flex-1 min-w-0 flex items-center gap-1.5">
              <Radio className="w-3 h-3 text-[#858585] shrink-0" />
              <span className="text-[12px] text-[#858585] truncate">
                {info.name}
              </span>
            </div>

            {/* Action buttons */}
            <div className="w-[52px] shrink-0 flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenPreview(info.port);
                }}
                className="p-1 hover:bg-[#3c3c3c] rounded transition-colors"
                title="Open in preview panel"
              >
                <Globe className="w-3.5 h-3.5 text-[#858585] hover:text-[#d4d4d4]" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenExternal(info.port);
                }}
                className="p-1 hover:bg-[#3c3c3c] rounded transition-colors"
                title="Open in new tab"
              >
                <ExternalLink className="w-3.5 h-3.5 text-[#858585] hover:text-[#d4d4d4]" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-1.5 border-t border-[#2d2d2d] shrink-0">
        <span className="text-[10px] text-[#6e7681]">
          {ports.length} forwarded port{ports.length !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
}
