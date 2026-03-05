import {
  ArrowLeft,
  Eye,
  EyeOff,
  Terminal,
} from "lucide-react";

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
  return (
    <div className="h-10 flex items-center px-2 bg-[#f6f8fa] border-b border-[#d0d7de] gap-1 shrink-0"
      style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
    >
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1 px-1.5 py-1 text-[#656d76] hover:text-[#1f2328] hover:bg-[#eaeef2] rounded transition-colors"
        title="Back to dashboard"
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
      >
        <ArrowLeft className="w-4 h-4" />
      </button>

      {/* Workspace title */}
      <div className="flex items-center gap-2 px-2">
        <span className="text-[13px] font-semibold text-[#1f2328] truncate max-w-[200px]">
          {workspace.name}
        </span>
        {workspace.template && (
          <span className="text-[10px] font-medium px-1.5 py-0.5 bg-[#e8e8e8] text-[#656d76] rounded">
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
            showTerminal ? "text-[#1f2328] bg-[#e8e8e8]" : "text-[#656d76] hover:text-[#1f2328] hover:bg-[#eaeef2]"
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
              showPreview ? "text-[#1f2328] bg-[#e8e8e8]" : "text-[#656d76] hover:text-[#1f2328] hover:bg-[#eaeef2]"
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
