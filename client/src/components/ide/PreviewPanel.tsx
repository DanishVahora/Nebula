import { Globe, RefreshCw } from "lucide-react";

interface PreviewPanelProps {
  workspace: any;
}

export function PreviewPanel({ workspace }: PreviewPanelProps) {
  const isStaticWeb = workspace.template === "static";

  return (
    <div className="h-full flex flex-col bg-[#1e1e1e]">
      {/* Browser-like header */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-[#252526] border-b border-[#1e1e1e] shrink-0">
        <Globe className="w-3.5 h-3.5 text-[#858585]" />
        <div className="flex-1 flex items-center bg-[#3c3c3c] rounded px-2 py-1 text-[12px] text-[#858585]">
          <span className="truncate">localhost:3000</span>
        </div>
        <button className="p-1 hover:bg-[#3c3c3c] rounded transition-colors">
          <RefreshCw className="w-3.5 h-3.5 text-[#858585]" />
        </button>
      </div>

      {/* Preview content */}
      <div className="flex-1 flex items-center justify-center bg-[#1e1e1e]">
        <div className="text-center px-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#252526] flex items-center justify-center">
            <Globe className="w-8 h-8 text-[#3c3c3c]" />
          </div>
          <p className="text-[14px] font-medium text-[#858585]">Live Preview</p>
          <p className="text-[12px] text-[#6a6a6a] mt-1.5 max-w-[220px] mx-auto leading-relaxed">
            {isStaticWeb
              ? "Run the workspace to preview your website here."
              : "Start the dev server to see your app preview."}
          </p>
          {workspace.runCommand && (
            <div className="mt-3 px-3 py-2 bg-[#252526] rounded border border-[#333] text-[11px] text-[#858585] font-mono">
              $ {workspace.runCommand}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
