import { useRef, useEffect } from "react";
import { loader } from "@monaco-editor/react";
import { X, GitCompareArrows } from "lucide-react";

interface DiffViewerProps {
  filePath: string;
  originalContent: string;
  modifiedContent: string;
  language: string;
  onClose: () => void;
}

export function DiffViewer({
  filePath,
  originalContent,
  modifiedContent,
  language,
  onClose,
}: DiffViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);

  useEffect(() => {
    let disposed = false;

    loader.init().then((monaco) => {
      if (disposed || !containerRef.current) return;

      const originalModel = monaco.editor.createModel(
        originalContent,
        language,
        monaco.Uri.parse(`diff-original:///${filePath}`)
      );

      const modifiedModel = monaco.editor.createModel(
        modifiedContent,
        language,
        monaco.Uri.parse(`diff-modified:///${filePath}`)
      );

      const diffEditor = monaco.editor.createDiffEditor(containerRef.current!, {
        theme: "vs-dark",
        readOnly: true,
        originalEditable: false,
        automaticLayout: true,
        fontSize: 14,
        fontFamily:
          "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace",
        fontLigatures: true,
        lineHeight: 20,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        smoothScrolling: true,
        renderLineHighlight: "none",
        bracketPairColorization: { enabled: true },
        tabSize: 2,
        wordWrap: "on",
        padding: { top: 8, bottom: 8 },
        lineNumbers: "on",
        renderWhitespace: "selection",
        scrollbar: {
          verticalScrollbarSize: 10,
          horizontalScrollbarSize: 10,
        },
        overviewRulerLanes: 0,
        renderSideBySide: true,
        enableSplitViewResizing: true,
        renderIndicators: true,
        renderMarginRevertIcon: false,
      });

      diffEditor.setModel({ original: originalModel, modified: modifiedModel });
      editorRef.current = { diffEditor, originalModel, modifiedModel };
    });

    return () => {
      disposed = true;
      if (editorRef.current) {
        editorRef.current.diffEditor.dispose();
        editorRef.current.originalModel.dispose();
        editorRef.current.modifiedModel.dispose();
        editorRef.current = null;
      }
    };
  }, [filePath, originalContent, modifiedContent, language]);

  const fileName = filePath.split("/").pop() || filePath;

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e]">
      {/* Diff tab bar */}
      <div className="flex items-center bg-[#252526] border-b border-[#1e1e1e] shrink-0">
        <div className="flex items-center gap-2 px-3 h-[36px] bg-[#1e1e1e] text-[#d4d4d4] border-r border-[#1e1e1e] relative">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#007acc]" />
          <GitCompareArrows className="w-3.5 h-3.5 text-[#dcdcaa] shrink-0" />
          <span className="text-[13px] truncate max-w-[300px]">
            {fileName}
            <span className="text-[#858585] ml-1.5">(Working Tree)</span>
          </span>
          <button
            className="ml-2 p-0.5 hover:bg-[#3c3c3c] rounded transition-colors shrink-0"
            onClick={onClose}
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Diff header labels */}
      <div className="flex items-center bg-[#252526] border-b border-[#1e1e1e] shrink-0 text-[11px]">
        <div className="flex-1 px-3 py-1 text-[#858585] border-r border-[#3c3c3c]">
          HEAD (committed)
        </div>
        <div className="flex-1 px-3 py-1 text-[#858585]">
          Working Tree
        </div>
      </div>

      {/* Diff editor container */}
      <div ref={containerRef} className="flex-1 min-h-0" />
    </div>
  );
}
