import { useEffect, useRef } from "react";
import { X, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

interface DeployLogsPanelProps {
  logs: string[];
  isDeploying: boolean;
  onClose?: () => void;
}

export function DeployLogsPanel({ logs, isDeploying, onClose }: DeployLogsPanelProps) {
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const isSuccess = logs.includes("Deployment successful");
  const isError = logs.some((log) => log.toLowerCase().includes("error") || log.toLowerCase().includes("failed"));

  return (
    <div className="bg-black rounded border border-[#3c3c3c] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#252526] border-b border-[#3c3c3c]">
        <div className="flex items-center gap-2">
          {isDeploying ? (
            <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
          ) : isSuccess ? (
            <CheckCircle className="w-4 h-4 text-green-400" />
          ) : isError ? (
            <AlertCircle className="w-4 h-4 text-red-400" />
          ) : null}
          <span className="text-xs font-medium text-[#d4d4d4]">
            Deployment Logs
          </span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 text-[#858585] hover:text-[#d4d4d4] hover:bg-[#3c3c3c] rounded transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Logs content */}
      <div className="h-40 overflow-auto p-3 font-mono text-xs">
        {logs.length === 0 ? (
          <div className="text-[#6e7681] italic">No deployment logs yet</div>
        ) : (
          logs.map((log, index) => (
            <div
              key={index}
              className={`py-0.5 ${
                log.toLowerCase().includes("error") || log.toLowerCase().includes("failed")
                  ? "text-red-400"
                  : log.toLowerCase().includes("successful")
                  ? "text-green-400"
                  : "text-green-300"
              }`}
            >
              <span className="text-[#6e7681] mr-2">[{index + 1}]</span>
              {log}
            </div>
          ))
        )}
        <div ref={logsEndRef} />
      </div>
    </div>
  );
}
