import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { workspaceAPI } from "@/lib/api";
import Fuse, { type FuseResultMatch, type RangeTuple } from "fuse.js";
import { File, Search, Loader2 } from "lucide-react";

// ── File icon color by extension ────────────────────────
function getFileIconColor(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const map: Record<string, string> = {
    ts: "#3178c6", tsx: "#3178c6", js: "#f7df1e", jsx: "#f7df1e",
    json: "#c4a23a", html: "#e44d26", css: "#264de4", scss: "#c6538c",
    md: "#519aba", py: "#3572a5", cpp: "#f34b7d", c: "#555555",
    java: "#b07219", rs: "#dea584", go: "#00add8", yaml: "#cb171e",
    yml: "#cb171e", xml: "#f34b7d", sql: "#e38c00", sh: "#89e051",
    bash: "#89e051", vue: "#42b883", svelte: "#ff3e00", prisma: "#2d3748",
    env: "#ecd53f", gitignore: "#f05032", lock: "#6e7681",
    svg: "#ffb13b", png: "#a074c4", jpg: "#a074c4", gif: "#a074c4",
    ico: "#a074c4", txt: "#6e7681", toml: "#9c4221", cfg: "#6e7681",
  };
  return map[ext] || "#858585";
}

// ── Highlight matched characters in the result ──────────
function HighlightedText({
  text,
  indices,
}: {
  text: string;
  indices?: readonly RangeTuple[];
}) {
  if (!indices || indices.length === 0) {
    return <span>{text}</span>;
  }

  const chars: React.ReactNode[] = [];
  let lastEnd = 0;

  for (const [start, end] of indices) {
    if (start > lastEnd) {
      chars.push(
        <span key={`plain-${lastEnd}`}>{text.slice(lastEnd, start)}</span>
      );
    }
    chars.push(
      <span key={`hl-${start}`} className="text-[#e8a863] font-semibold">
        {text.slice(start, end + 1)}
      </span>
    );
    lastEnd = end + 1;
  }

  if (lastEnd < text.length) {
    chars.push(<span key={`plain-${lastEnd}`}>{text.slice(lastEnd)}</span>);
  }

  return <>{chars}</>;
}

// ── QuickOpen Props ─────────────────────────────────────
interface QuickOpenProps {
  workspaceId: string;
  isOpen: boolean;
  onClose: () => void;
  onOpenFile: (filePath: string) => void;
}

export function QuickOpen({
  workspaceId,
  isOpen,
  onClose,
  onOpenFile,
}: QuickOpenProps) {
  const [query, setQuery] = useState("");
  const [allFiles, setAllFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // ── Fetch file list when opened ─────────────────────
  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    setLoading(true);
    setQuery("");
    setSelectedIndex(0);

    workspaceAPI.getAllFiles(workspaceId).then((res) => {
      if (!cancelled) {
        setAllFiles(res.data.files);
        setLoading(false);
      }
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });

    // Focus the input after mount
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

    return () => { cancelled = true; };
  }, [isOpen, workspaceId]);

  // ── Fuse.js instance ───────────────────────────────
  const fuse = useMemo(() => {
    return new Fuse(allFiles, {
      includeMatches: true,
      threshold: 0.4,
      distance: 100,
      minMatchCharLength: 1,
      // We search raw strings, not objects. Fuse treats each item as the key.
    });
  }, [allFiles]);

  // ── Search results ─────────────────────────────────
  const results = useMemo(() => {
    if (!query.trim()) {
      // Show all files when no query, capped to 100
      return allFiles.slice(0, 100).map((item) => ({
        path: item,
        matches: undefined as FuseResultMatch[] | undefined,
      }));
    }
    return fuse.search(query, { limit: 50 }).map((r) => ({
      path: r.item,
      matches: r.matches,
    }));
  }, [query, fuse, allFiles]);

  // ── Keep selectedIndex in bounds ───────────────────
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // ── Scroll selected item into view ─────────────────
  useEffect(() => {
    const el = itemRefs.current.get(selectedIndex);
    if (el) {
      el.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  // ── Select & open ──────────────────────────────────
  const selectFile = useCallback(
    (filePath: string) => {
      onOpenFile(filePath);
      onClose();
    },
    [onOpenFile, onClose]
  );

  // ── Keyboard navigation ────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (results[selectedIndex]) {
            selectFile(results[selectedIndex].path);
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    },
    [results, selectedIndex, selectFile, onClose]
  );

  if (!isOpen) return null;

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Backdrop overlay */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Quick Open panel */}
      <div
        className="relative w-140 max-h-100 bg-[#252526] border border-[#3c3c3c] rounded-md shadow-2xl flex flex-col overflow-hidden"
        style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.5)" }}
      >
        {/* Search input */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-[#3c3c3c]">
          <Search className="w-4 h-4 text-[#858585] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search files by name..."
            className="flex-1 bg-transparent text-[13px] text-[#d4d4d4] outline-none placeholder-[#6e7681] font-[JetBrains_Mono,Fira_Code,Consolas,monospace]"
            autoComplete="off"
            spellCheck={false}
          />
          {loading && (
            <Loader2 className="w-4 h-4 text-[#858585] animate-spin shrink-0" />
          )}
        </div>

        {/* Results list */}
        <div ref={listRef} className="flex-1 overflow-y-auto min-h-0">
          {loading && allFiles.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-[#858585] animate-spin" />
              <span className="ml-2 text-[12px] text-[#858585]">
                Scanning workspace files...
              </span>
            </div>
          ) : results.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <span className="text-[12px] text-[#6e7681]">
                {query ? "No matching files found" : "No files in workspace"}
              </span>
            </div>
          ) : (
            results.map((result, index) => {
              const fileName = result.path.split("/").pop() || result.path;
              const dirPath = result.path.includes("/")
                ? result.path.slice(0, result.path.lastIndexOf("/"))
                : "";
              const isSelected = index === selectedIndex;
              const matchIndices = result.matches?.[0]?.indices;

              return (
                <div
                  key={result.path}
                  ref={(el) => {
                    if (el) itemRefs.current.set(index, el);
                    else itemRefs.current.delete(index);
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-[#04395e] text-[#ffffff]"
                      : "text-[#d4d4d4] hover:bg-[#2a2d2e]"
                  }`}
                  onClick={() => selectFile(result.path)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <File
                    className="w-4 h-4 shrink-0"
                    style={{ color: getFileIconColor(fileName) }}
                  />
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <span className="text-[13px] truncate font-[JetBrains_Mono,Fira_Code,Consolas,monospace]">
                      {matchIndices ? (
                        <HighlightedText
                          text={result.path}
                          indices={matchIndices}
                        />
                      ) : (
                        <span>
                          <span className="text-[#e8e8e8]">{fileName}</span>
                        </span>
                      )}
                    </span>
                    {!matchIndices && dirPath && (
                      <span className="text-[11px] text-[#6e7681] truncate">
                        {dirPath}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center justify-between px-3 py-1.5 border-t border-[#3c3c3c] bg-[#1e1e1e]">
          <div className="flex items-center gap-3 text-[11px] text-[#6e7681]">
            <span>
              <kbd className="px-1 py-0.5 bg-[#2d2d2d] rounded text-[10px] border border-[#3c3c3c]">↑↓</kbd>{" "}
              navigate
            </span>
            <span>
              <kbd className="px-1 py-0.5 bg-[#2d2d2d] rounded text-[10px] border border-[#3c3c3c]">↵</kbd>{" "}
              open
            </span>
            <span>
              <kbd className="px-1 py-0.5 bg-[#2d2d2d] rounded text-[10px] border border-[#3c3c3c]">esc</kbd>{" "}
              close
            </span>
          </div>
          <span className="text-[11px] text-[#6e7681]">
            {results.length} file{results.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>
    </div>
  );
}
