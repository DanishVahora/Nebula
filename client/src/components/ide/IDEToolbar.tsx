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
    <div className="h-10 flex items-center px-2 bg-[#181818] border-b border-[#2d2d2d] gap-1 shrink-0"
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
      </div>
    </div>
  );
}
