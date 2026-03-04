import {
  Play,
  Square,
  ArrowLeft,
  Eye,
  EyeOff,
  Terminal,
} from "lucide-react";

interface IDEToolbarProps {
  workspace: any;
  isRunning: boolean;
  onRun: () => void;
  onStop: () => void;
  onBack: () => void;
  showPreview: boolean;
  onTogglePreview: () => void;
  isWebTemplate: boolean;
  showTerminal: boolean;
  onToggleTerminal: () => void;
}

export function IDEToolbar({
  workspace,
  isRunning,
  onRun,
  onStop,
  onBack,
  showPreview,
  onTogglePreview,
  isWebTemplate,
  showTerminal,
  onToggleTerminal,
}: IDEToolbarProps) {
  return (
    <div className="h-9 flex items-center px-2 bg-[#3c3c3c] border-b border-[#252526] gap-1 shrink-0"
      style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
    >
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1 px-1.5 py-1 text-[#cccccc] hover:text-white hover:bg-[#505050] rounded transition-colors"
        title="Back to dashboard"
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
      >
        <ArrowLeft className="w-4 h-4" />
      </button>

      {/* Workspace title - centered feel */}
      <div className="flex items-center gap-2 px-2">
        <span className="text-[13px] font-medium text-[#cccccc] truncate max-w-[200px]">
          {workspace.name}
        </span>
        {workspace.template && (
          <span className="text-[10px] font-medium px-1.5 py-0.5 bg-[#505050] text-[#999] rounded">
            {workspace.template}
          </span>
        )}
      </div>

      {/* Center spacer */}
      <div className="flex-1" />

      {/* Run / Stop */}
      <div className="flex items-center gap-1" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
        {isRunning ? (
          <button
            onClick={onStop}
            className="flex items-center gap-1.5 px-3 py-1 bg-[#c74e39] text-white rounded text-[12px] font-medium hover:bg-[#d65745] transition-colors"
          >
            <Square className="w-3 h-3" />
            Stop
          </button>
        ) : (
          <button
            onClick={onRun}
            className="flex items-center gap-1.5 px-3 py-1 bg-[#2ea043] text-white rounded text-[12px] font-medium hover:bg-[#3fb950] transition-colors disabled:opacity-40"
            disabled={!workspace.runCommand}
            title={workspace.runCommand || "No run command"}
          >
            <Play className="w-3 h-3 fill-white" />
            Run
          </button>
        )}
      </div>

      <div className="flex-1" />

      {/* Right actions */}
      <div className="flex items-center gap-0.5" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
        {/* Terminal toggle */}
        <button
          onClick={onToggleTerminal}
          className={`p-1.5 rounded transition-colors ${
            showTerminal ? "text-white bg-[#505050]" : "text-[#858585] hover:text-[#cccccc] hover:bg-[#505050]"
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
              showPreview ? "text-white bg-[#505050]" : "text-[#858585] hover:text-[#cccccc] hover:bg-[#505050]"
            }`}
            title={showPreview ? "Hide preview" : "Show preview"}
          >
            {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  );
}
