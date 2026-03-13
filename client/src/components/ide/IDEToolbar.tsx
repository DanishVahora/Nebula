import { useState } from "react";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Terminal,
  Rocket,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import api, { API_BASE } from "@/lib/api";
import { DeployLogsPanel } from "./DeployLogsPanel";

interface IDEToolbarProps {
  workspace: any;
  onBack: () => void;
  showPreview: boolean;
  onTogglePreview: () => void;
  isWebTemplate: boolean;
  showTerminal: boolean;
  onToggleTerminal: () => void;
}

export function IDEToolbar({
  workspace,
  onBack,
  showPreview,
  onTogglePreview,
  isWebTemplate,
  showTerminal,
  onToggleTerminal,
}: IDEToolbarProps) {
  const [deployStatus, setDeployStatus] = useState<string | null>(null);
  const [deployUrl, setDeployUrl] = useState<string | null>(null);
  const [deployLogs, setDeployLogs] = useState<string[]>([]);
  const [isDeploying, setIsDeploying] = useState(false);
  const [showLogs, setShowLogs] = useState(false);

  async function handleDeploy() {
    if (isDeploying) return;

    setIsDeploying(true);
    setDeployStatus("Starting deployment...");
    setDeployUrl(null);
    setDeployLogs([]);
    setShowLogs(true); // Auto-show logs when deployment starts

    // Start SSE stream for deployment logs
    const eventSource = new EventSource(
      `${API_BASE}/api/deploy/stream/${workspace.id}`,
      { withCredentials: true }
    );

    eventSource.onmessage = (event) => {
      setDeployLogs((prev) => [...prev, event.data]);
      setDeployStatus(event.data);

      if (event.data === "Deployment successful") {
        eventSource.close();
        // Now call the actual deploy endpoint to get the URL
        api.post(`/deploy/${workspace.id}`)
          .then((res) => {
            if (res.data.url) {
              setDeployUrl(res.data.url);
            }
            setIsDeploying(false);
          })
          .catch(() => {
            setDeployStatus("Deployment failed");
            setIsDeploying(false);
          });
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      setDeployStatus("Deployment failed");
      setDeployLogs((prev) => [...prev, "Error: Connection lost"]);
      setIsDeploying(false);
    };
  }

  return (
    <div className="h-10 flex items-center px-2 bg-[#181818] border-b border-[#2d2d2d] gap-1 shrink-0 relative"
      style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
    >
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1 px-1.5 py-1 text-[#858585] hover:text-[#d4d4d4] hover:bg-[#2d2d2d] rounded transition-colors"
        title="Back to dashboard"
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
      >
        <ArrowLeft className="w-4 h-4" />
      </button>

      {/* Workspace title */}
      <div className="flex items-center gap-2 px-2">
        <span className="text-[13px] font-semibold text-[#d4d4d4] truncate max-w-[200px]">
          {workspace.name}
        </span>
        {workspace.template && (
          <span className="text-[10px] font-medium px-1.5 py-0.5 bg-[#2d2d2d] text-[#858585] rounded">
            {workspace.template}
          </span>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right actions */}
      <div className="flex items-center gap-0.5" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
        {/* Terminal toggle */}
        <button
          onClick={onToggleTerminal}
          className={`p-1.5 rounded transition-colors ${
            showTerminal ? "text-[#d4d4d4] bg-[#2d2d2d]" : "text-[#858585] hover:text-[#d4d4d4] hover:bg-[#2d2d2d]"
          }`}
          title="Toggle Terminal (Ctrl+`)"
        >
          <Terminal className="w-4 h-4" />
        </button>

        {/* Preview toggle */}
        {isWebTemplate && (
          <button
            onClick={onTogglePreview}
            className={`p-1.5 rounded transition-colors ${
              showPreview ? "text-[#d4d4d4] bg-[#2d2d2d]" : "text-[#858585] hover:text-[#d4d4d4] hover:bg-[#2d2d2d]"
            }`}
            title={showPreview ? "Hide preview" : "Show preview"}
          >
            {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}

        {/* Deploy button */}
        <button
          onClick={handleDeploy}
          disabled={isDeploying}
          className={`flex items-center gap-1 px-3 py-1 rounded text-sm transition-colors ml-2 ${
            isDeploying
              ? "bg-green-700 text-white/70 cursor-not-allowed"
              : "bg-green-600 hover:bg-green-700 text-white"
          }`}
          title="Deploy workspace"
        >
          {isDeploying ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Rocket className="w-4 h-4" />
          )}
          {isDeploying ? "Deploying..." : "Deploy"}
        </button>

        {/* Deploy status */}
        {deployStatus && (
          <span className="ml-3 text-xs text-yellow-400">
            {deployStatus}
          </span>
        )}

        {/* Deploy URL link */}
        {deployUrl && (
          <a
            href={deployUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-3 text-green-400 underline text-xs"
          >
            Open App
          </a>
        )}

        {/* Logs toggle */}
        {deployLogs.length > 0 && (
          <button
            onClick={() => setShowLogs(!showLogs)}
            className="ml-2 p-1 text-[#858585] hover:text-[#d4d4d4] hover:bg-[#2d2d2d] rounded transition-colors"
            title={showLogs ? "Hide logs" : "Show logs"}
          >
            {showLogs ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        )}
      </div>

      {/* Deploy logs panel */}
      {showLogs && deployLogs.length > 0 && (
        <div className="absolute right-2 top-full mt-1 w-96 z-50 shadow-xl">
          <DeployLogsPanel
            logs={deployLogs}
            isDeploying={isDeploying}
            onClose={() => setShowLogs(false)}
          />
        </div>
      )}
    </div>
  );
}
