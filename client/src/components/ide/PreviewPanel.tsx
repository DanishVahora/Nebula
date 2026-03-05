import { Globe, RefreshCw } from "lucide-react";

interface PreviewPanelProps {
  workspace: any;
}

export function PreviewPanel({ workspace }: PreviewPanelProps) {
  const isStaticWeb = workspace.template === "static";

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Browser-like header */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-[#f6f8fa] border-b border-[#d0d7de] shrink-0">
        <Globe className="w-3.5 h-3.5 text-[#656d76]" />
        <div className="flex-1 flex items-center bg-white border border-[#d0d7de] rounded px-2 py-1 text-[12px] text-[#656d76]">
          <span className="truncate">localhost:3000</span>
        </div>
        <button className="p-1 hover:bg-[#eaeef2] rounded transition-colors">
          <RefreshCw className="w-3.5 h-3.5 text-[#656d76]" />
        </button>
      </div>

      {/* Preview content */}
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="text-center px-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#f6f8fa] border border-[#e8e8e8] flex items-center justify-center">
            <Globe className="w-8 h-8 text-[#c9d1d9]" />
          </div>
          <p className="text-[14px] font-medium text-[#1f2328]">Live Preview</p>
          <p className="text-[12px] text-[#656d76] mt-1.5 max-w-[220px] mx-auto leading-relaxed">
            {isStaticWeb
              ? "Run the workspace to preview your website here."
              : "Start the dev server to see your app preview."}
          </p>
          {workspace.runCommand && (
            <div className="mt-3 px-3 py-2 bg-[#f6f8fa] rounded border border-[#d0d7de] text-[11px] text-[#656d76] font-mono">
              $ {workspace.runCommand}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
