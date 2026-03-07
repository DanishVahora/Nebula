import { useState, useRef, useCallback } from "react";
import {
  Globe,
  RefreshCw,
  ExternalLink,
  X,
  Loader2,
  ChevronDown,
} from "lucide-react";
import { API_BASE } from "@/lib/api";

interface PreviewPanelProps {
  workspaceId: string;
  port: number | null;
  ports: number[];
  onPortSelect: (port: number) => void;
  workspace: any;
  onClose: () => void;
}

export function PreviewPanel({
  workspaceId,
  port,
  ports,
  onPortSelect,
  workspace,
  onClose,
}: PreviewPanelProps) {
  const [iframeKey, setIframeKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [urlInput, setUrlInput] = useState("/");
  const [showPortMenu, setShowPortMenu] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const previewUrl = port
    ? `${API_BASE}/api/preview/${workspaceId}/${port}${urlInput}`
    : null;

  const handleRefresh = useCallback(() => {
    setIsLoading(true);
    setIframeKey((k) => k + 1);
  }, []);

  const handleOpenNewTab = useCallback(() => {
    if (previewUrl) window.open(previewUrl, "_blank");
  }, [previewUrl]);

  const handleIframeLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleUrlSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoading(true);
      setIframeKey((k) => k + 1);
    },
    []
  );

  // ── Empty state: no port detected yet ───────────────
  if (!port) {
    const isStaticWeb = workspace?.template === "static";
    return (
      <div className="h-full flex flex-col bg-[#1e1e1e]">
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#181818] border-b border-[#2d2d2d] shrink-0">
          <Globe className="w-3.5 h-3.5 text-[#858585]" />
          <div className="flex-1 flex items-center bg-[#2d2d2d] border border-[#3c3c3c] rounded px-2 py-1 text-[12px] text-[#858585]">
            <span className="truncate">No server running</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#3c3c3c] rounded transition-colors"
            title="Close preview"
          >
            <X className="w-3.5 h-3.5 text-[#858585]" />
          </button>
        </div>

        {/* Placeholder */}
        <div className="flex-1 flex items-center justify-center bg-[#1e1e1e]">
          <div className="text-center px-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#252526] border border-[#3c3c3c] flex items-center justify-center">
              <Globe className="w-8 h-8 text-[#858585]" />
            </div>
            <p className="text-[14px] font-medium text-[#d4d4d4]">
              Live Preview
            </p>
            <p className="text-[12px] text-[#858585] mt-1.5 max-w-[220px] mx-auto leading-relaxed">
              {isStaticWeb
                ? "Run the workspace to preview your website here."
                : "Start the dev server to see your app preview."}
            </p>
            {workspace?.runCommand && (
              <div className="mt-3 px-3 py-2 bg-[#252526] rounded border border-[#3c3c3c] text-[11px] text-[#858585] font-mono">
                $ {workspace.runCommand}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Active preview with iframe ──────────────────────
  return (
    <div className="h-full flex flex-col bg-[#1e1e1e]">
      {/* Browser-like toolbar */}
      <div className="flex items-center gap-1.5 px-2 py-1 bg-[#181818] border-b border-[#2d2d2d] shrink-0">
        {/* Refresh */}
        <button
          onClick={handleRefresh}
          className="p-1 hover:bg-[#3c3c3c] rounded transition-colors"
          title="Refresh preview"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 text-[#858585] hover:text-[#d4d4d4] ${
              isLoading ? "animate-spin" : ""
            }`}
          />
        </button>

        {/* URL bar */}
        <form onSubmit={handleUrlSubmit} className="flex-1 flex items-center">
          <div className="flex-1 flex items-center bg-[#2d2d2d] border border-[#3c3c3c] rounded px-2 py-0.5 text-[12px] focus-within:border-[#007acc] transition-colors">
            <Globe className="w-3 h-3 text-[#858585] shrink-0 mr-1.5" />
            <span className="text-[#858585] shrink-0">localhost:{port}</span>
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="flex-1 bg-transparent text-[#d4d4d4] outline-none min-w-0 ml-0"
              spellCheck={false}
            />
          </div>
        </form>

        {/* Open in new tab */}
        <button
          onClick={handleOpenNewTab}
          className="p-1 hover:bg-[#3c3c3c] rounded transition-colors"
          title="Open in new tab"
        >
          <ExternalLink className="w-3.5 h-3.5 text-[#858585] hover:text-[#d4d4d4]" />
        </button>

        {/* Close preview */}
        <button
          onClick={onClose}
          className="p-1 hover:bg-[#3c3c3c] rounded transition-colors"
          title="Close preview"
        >
          <X className="w-3.5 h-3.5 text-[#858585] hover:text-[#d4d4d4]" />
        </button>
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div className="h-0.5 bg-[#181818] shrink-0 overflow-hidden">
          <div className="h-full bg-[#007acc] animate-pulse" style={{ width: "60%" }} />
        </div>
      )}

      {/* iframe */}
      <div className="flex-1 relative min-h-0">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#1e1e1e] z-10">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-[#007acc]" />
              <span className="text-[12px] text-[#858585]">Loading preview...</span>
            </div>
          </div>
        )}
        <iframe
          key={iframeKey}
          ref={iframeRef}
          src={previewUrl || "about:blank"}
          className="w-full h-full border-none bg-white"
          title="Preview"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
          onLoad={handleIframeLoad}
        />
      </div>

      {/* Port indicator / selector */}
      <div className="flex items-center justify-between px-2 py-0.5 bg-[#181818] border-t border-[#2d2d2d] shrink-0">
        {ports.length > 1 ? (
          <div className="relative">
            <button
              onClick={() => setShowPortMenu((v) => !v)}
              className="flex items-center gap-1 text-[10px] text-[#858585] hover:text-[#d4d4d4] transition-colors"
            >
              Port {port}
              <ChevronDown className="w-3 h-3" />
            </button>
            {showPortMenu && (
              <div className="absolute bottom-full left-0 mb-1 bg-[#252526] border border-[#3c3c3c] rounded shadow-lg z-20 min-w-[100px]">
                {ports.map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      onPortSelect(p);
                      setShowPortMenu(false);
                      setIsLoading(true);
                      setIframeKey((k) => k + 1);
                    }}
                    className={`w-full text-left px-3 py-1 text-[11px] transition-colors ${
                      p === port
                        ? "text-[#d4d4d4] bg-[#2d2d2d]"
                        : "text-[#858585] hover:bg-[#2d2d2d] hover:text-[#d4d4d4]"
                    }`}
                  >
                    Port {p}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <span className="text-[10px] text-[#858585]">
            Port {port}
          </span>
        )}
        <span className="text-[10px] text-[#858585]">
          {isLoading ? "Loading..." : "Connected"}
        </span>
      </div>
    </div>
  );
}
