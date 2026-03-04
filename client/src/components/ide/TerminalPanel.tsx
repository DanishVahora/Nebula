import { useState, useRef, useEffect } from "react";
import { Trash2, Terminal as TerminalIcon } from "lucide-react";

interface TerminalPanelProps {
  lines: string[];
  isRunning: boolean;
  onExec: (command: string) => void;
  onClear: () => void;
}

export function TerminalPanel({
  lines,
  isRunning,
  onExec,
  onClear,
}: TerminalPanelProps) {
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onExec(input.trim());
    setHistory((prev) => [...prev, input.trim()]);
    setHistoryIndex(-1);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length === 0) return;
      const newIdx = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(newIdx);
      setInput(history[newIdx]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex === -1) return;
      const newIdx = historyIndex + 1;
      if (newIdx >= history.length) { setHistoryIndex(-1); setInput(""); }
      else { setHistoryIndex(newIdx); setInput(history[newIdx]); }
    }
  };

  return (
    <div
      className="h-full flex flex-col bg-[#1e1e1e] font-mono text-[13px]"
      onClick={() => inputRef.current?.focus()}
    >
      {/* Tab bar */}
      <div className="flex items-center justify-between bg-[#252526] shrink-0">
        <div className="flex items-center">
          {/* Terminal tab */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1e1e1e] text-[#cccccc] border-t border-t-[#007acc] text-[12px]">
            <TerminalIcon className="w-3.5 h-3.5" />
            <span>Terminal</span>
            {isRunning && (
              <span className="flex items-center gap-1 text-[10px] text-[#89d185]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#89d185] animate-pulse" />
              </span>
            )}
          </div>
          {/* Problems tab placeholder */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 text-[#858585] text-[12px] hover:text-[#cccccc] cursor-pointer transition-colors">
            <span>Problems</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 text-[#858585] text-[12px] hover:text-[#cccccc] cursor-pointer transition-colors">
            <span>Output</span>
          </div>
        </div>
        <div className="flex items-center gap-0.5 pr-2">
          <button
            onClick={(e) => { e.stopPropagation(); onClear(); }}
            className="p-1 hover:bg-[#3c3c3c] rounded transition-colors"
            title="Clear terminal"
          >
            <Trash2 className="w-3.5 h-3.5 text-[#858585] hover:text-[#cccccc]" />
          </button>
        </div>
      </div>

      {/* Output */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-0"
        style={{ scrollbarWidth: "thin", scrollbarColor: "#3c3c3c #1e1e1e" }}
      >
        {lines.length === 0 && (
          <div className="text-[#858585] text-[12px] py-1">
            Terminal ready — type a command or click Run
          </div>
        )}
        {lines.map((line, i) => (
          <div
            key={i}
            className={`whitespace-pre-wrap break-all leading-[20px] ${
              line.startsWith("[stderr]") || line.startsWith("[Error]") || line.startsWith("[Git Error]")
                ? "text-[#f14c4c]"
                : line.startsWith("✓")
                ? "text-[#89d185]"
                : line.startsWith("▶")
                ? "text-[#3794ff]"
                : line.startsWith("$")
                ? "text-[#dcdcaa]"
                : line.startsWith("[Process")
                ? "text-[#858585]"
                : "text-[#d4d4d4]"
            }`}
          >
            {line}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex items-center border-t border-[#333] bg-[#1e1e1e] shrink-0">
        <span className="pl-3 text-[#89d185] text-[13px] select-none">$</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent text-[#d4d4d4] outline-none px-2 py-2 text-[13px] font-mono placeholder-[#4a4a4a]"
          placeholder="Type a command..."
          spellCheck={false}
          autoComplete="off"
        />
      </form>
    </div>
  );
}
