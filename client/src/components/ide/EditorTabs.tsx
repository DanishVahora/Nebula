import { useRef, useCallback } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import type { FileTab } from "@/pages/WorkspaceIDE";
import { X, Circle } from "lucide-react";

interface EditorTabsProps {
  tabs: FileTab[];
  activeTab: string | null;
  onTabClick: (path: string) => void;
  onTabClose: (path: string) => void;
  onContentChange: (path: string, content: string) => void;
  onSave: (path: string) => void;
  activeFileTab: FileTab | null;
}

function getFileIconColor(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  const colors: Record<string, string> = {
    ts: "#3178c6", tsx: "#3178c6", js: "#f0db4f", jsx: "#f0db4f",
    json: "#cbcb41", html: "#e34c26", css: "#563d7c", scss: "#cd6799",
    md: "#083fa1", py: "#3572a5", java: "#b07219", vue: "#41b883",
  };
  return colors[ext] || "#858585";
}

export function EditorTabs({
  tabs, activeTab, onTabClick, onTabClose, onContentChange, onSave, activeFileTab,
}: EditorTabsProps) {
  const editorRef = useRef<any>(null);

  const handleEditorMount: OnMount = (editor, _monaco) => {
    editorRef.current = editor;
    editor.addCommand(2097, () => { if (activeTab) onSave(activeTab); });
  };

  const handleEditorChange = useCallback(
    (value: string | undefined) => {
      if (activeTab && value !== undefined) onContentChange(activeTab, value);
    },
    [activeTab, onContentChange]
  );

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Tab bar */}
      {tabs.length > 0 && (
        <div className="flex items-center bg-[#f6f8fa] border-b border-[#d0d7de] overflow-x-auto shrink-0"
          style={{ scrollbarWidth: "thin", scrollbarColor: "#d0d7de #f6f8fa" }}
        >
          {tabs.map((tab) => {
            const isActive = tab.path === activeTab;
            return (
              <div
                key={tab.path}
                className={`group relative flex items-center gap-1.5 px-3 h-[36px] cursor-pointer border-r border-[#e8e8e8] min-w-0 max-w-[180px] transition-colors ${
                  isActive
                    ? "bg-white text-[#1f2328]"
                    : "bg-[#f0f0f0] text-[#656d76] hover:bg-[#eaeef2]"
                }`}
                onClick={() => onTabClick(tab.path)}
              >
                {isActive && (
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#0969da]" />
                )}
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: getFileIconColor(tab.name) }} />
                <span className="text-[13px] truncate">{tab.name}</span>
                {tab.isDirty && (
                  <Circle className="w-2 h-2 fill-current text-[#656d76] shrink-0" />
                )}
                <button
                  className="ml-auto p-0.5 hover:bg-[#d0d7de] rounded opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  onClick={(e) => { e.stopPropagation(); onTabClose(tab.path); }}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Editor */}
      <div className="flex-1 min-h-0">
        {activeFileTab ? (
          <Editor
            key={activeFileTab.path}
            height="100%"
            language={activeFileTab.language}
            value={activeFileTab.content}
            onChange={handleEditorChange}
            onMount={handleEditorMount}
            theme="vs"
            options={{
              fontSize: 14,
              fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace",
              fontLigatures: true,
              lineHeight: 20,
              minimap: { enabled: true, maxColumn: 80, renderCharacters: false },
              scrollBeyondLastLine: false,
              smoothScrolling: true,
              cursorBlinking: "smooth",
              cursorSmoothCaretAnimation: "on",
              renderLineHighlight: "line",
              bracketPairColorization: { enabled: true },
              autoClosingBrackets: "always",
              autoClosingQuotes: "always",
              formatOnPaste: true,
              tabSize: 2,
              wordWrap: "on",
              padding: { top: 8, bottom: 8 },
              lineNumbers: "on",
              renderWhitespace: "selection",
              guides: { indentation: true, bracketPairs: true },
              suggest: { showKeywords: true, showSnippets: true },
              scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
              overviewRulerLanes: 0,
            }}
          />
        ) : (
          <div className="h-full flex items-center justify-center bg-white">
            <div className="text-center max-w-sm">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-[#f6f8fa] border border-[#e8e8e8] flex items-center justify-center">
                <svg className="w-10 h-10 text-[#c9d1d9]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                </svg>
              </div>
              <p className="text-[15px] font-semibold text-[#1f2328] mb-1">Nebula IDE</p>
              <p className="text-[13px] text-[#656d76] mb-4">Open a file from the explorer to start editing</p>
              <div className="space-y-1.5 text-[12px] text-[#8b949e]">
                <p><kbd className="px-1.5 py-0.5 bg-[#f6f8fa] border border-[#d0d7de] rounded text-[#656d76] text-[11px]">Ctrl+S</kbd> Save file</p>
                <p><kbd className="px-1.5 py-0.5 bg-[#f6f8fa] border border-[#d0d7de] rounded text-[#656d76] text-[11px]">Ctrl+`</kbd> Toggle terminal</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
