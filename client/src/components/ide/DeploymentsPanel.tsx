import { useState, useEffect } from "react";
import { ExternalLink, Square, Trash2, RefreshCw } from "lucide-react";
import api from "@/lib/api";

interface Deployment {
  id: string;
  workspaceId: string;
  containerId: string;
  imageTag: string;
  port: number;
  url: string;
  status: string;
  createdAt: string;
}

interface DeploymentsPanelProps {
  onRefresh?: () => void;
}

export function DeploymentsPanel({ onRefresh }: DeploymentsPanelProps) {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadDeployments() {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get("/deployments");
      setDeployments(res.data);
    } catch (err) {
      setError("Failed to load deployments");
      console.error("Error loading deployments:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDeployments();
  }, []);

  async function handleStop(containerId: string) {
    try {
      await api.post(`/deployments/${containerId}/stop`);
      loadDeployments();
      onRefresh?.();
    } catch (err) {
      console.error("Error stopping deployment:", err);
    }
  }

  async function handleDelete(containerId: string) {
    try {
      await api.delete(`/deployments/${containerId}`);
      loadDeployments();
      onRefresh?.();
    } catch (err) {
      console.error("Error deleting deployment:", err);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2d2d2d]">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#858585]">
          Deployments
        </span>
        <button
          onClick={loadDeployments}
          className="p-1 text-[#858585] hover:text-[#d4d4d4] hover:bg-[#2d2d2d] rounded transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="flex items-center justify-center h-20">
            <span className="text-[12px] text-[#6e7681]">Loading...</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-20">
            <span className="text-[12px] text-red-400">{error}</span>
          </div>
        ) : deployments.length === 0 ? (
          <div className="flex items-center justify-center h-20">
            <span className="text-[12px] text-[#6e7681]">No deployments yet</span>
          </div>
        ) : (
          <div className="space-y-2">
            {deployments.map((deployment) => (
              <div
                key={deployment.id}
                className="bg-[#252526] border border-[#3c3c3c] rounded p-3"
              >
                {/* URL */}
                <div className="text-[12px] text-[#d4d4d4] mb-1 truncate">
                  {deployment.url}
                </div>

                {/* Status Badge */}
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded ${
                      deployment.status === "running"
                        ? "bg-green-900/50 text-green-400"
                        : "bg-yellow-900/50 text-yellow-400"
                    }`}
                  >
                    {deployment.status}
                  </span>
                  <span className="text-[10px] text-[#6e7681]">
                    Port {deployment.port}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <a
                    href={deployment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-2 py-1 text-[11px] text-green-400 hover:bg-green-900/30 rounded transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Open
                  </a>
                  {deployment.status === "running" && (
                    <button
                      onClick={() => handleStop(deployment.containerId)}
                      className="flex items-center gap-1 px-2 py-1 text-[11px] text-yellow-400 hover:bg-yellow-900/30 rounded transition-colors"
                    >
                      <Square className="w-3 h-3" />
                      Stop
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(deployment.containerId)}
                    className="flex items-center gap-1 px-2 py-1 text-[11px] text-red-400 hover:bg-red-900/30 rounded transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
