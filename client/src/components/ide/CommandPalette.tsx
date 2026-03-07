import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import Fuse from "fuse.js";
import {
  FilePlus,
  FolderPlus,
  Terminal,
  Play,
  RotateCcw,
  Package,
  GitCommit,
  Upload,
  Download,
  Search,
  Files,
  GitBranch,
  Network,
  Eye,
  Save,
  Settings,
  Command,
  type LucideIcon,
} from "lucide-react";

// ── Command definition ──────────────────────────────────
export interface PaletteCommand {
  id: string;
  label: string;
  category?: string;
  icon?: LucideIcon;
  shortcut?: string;
  action: () => void;
}

// ── Props ───────────────────────────────────────────────
interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  commands: PaletteCommand[];
}

// ── Component ───────────────────────────────────────────
export function CommandPalette({
  isOpen,
  onClose,
  commands,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  // ── Fuse instance ─────────────────────────────────────
  const fuse = useMemo(
    () =>
      new Fuse(commands, {
        keys: ["label", "category"],
        includeMatches: true,
        threshold: 0.35,
        distance: 80,
        minMatchCharLength: 1,
      }),
    [commands]
  );

  // ── Filtered results ──────────────────────────────────
  const results = useMemo(() => {
    if (!query.trim()) return commands;
    return fuse.search(query, { limit: 30 }).map((r) => r.item);
  }, [query, fuse, commands]);

  // Reset selection on query change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Scroll selected item into view
  useEffect(() => {
    const el = itemRefs.current.get(selectedIndex);
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  // ── Execute selected command ──────────────────────────
  const executeCommand = useCallback(
    (cmd: PaletteCommand) => {
      onClose();
      // Run action after the palette closes to avoid conflicts with focused inputs
      requestAnimationFrame(() => cmd.action());
    },
    [onClose]
  );

  // ── Keyboard navigation ───────────────────────────────
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
            executeCommand(results[selectedIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    },
    [results, selectedIndex, executeCommand, onClose]
  );

  if (!isOpen) return null;

  // Group results by category for display
  const grouped: { category: string; items: PaletteCommand[] }[] = [];
  const seenCategories = new Map<string, number>();
  for (const cmd of results) {
    const cat = cmd.category || "General";
    if (seenCategories.has(cat)) {
      grouped[seenCategories.get(cat)!].items.push(cmd);
    } else {
      seenCategories.set(cat, grouped.length);
      grouped.push({ category: cat, items: [cmd] });
    }
  }

  // Flat index tracker for keyboard navigation across groups
  let flatIndex = 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Palette panel */}
      <div
        className="relative w-130 max-h-95 bg-[#252526] border border-[#3c3c3c] rounded-lg shadow-2xl flex flex-col overflow-hidden"
        style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.55)" }}
      >
        {/* Input */}
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-[#3c3c3c]">
          <Command className="w-4 h-4 text-[#007acc] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command..."
            className="flex-1 bg-transparent text-[13px] text-[#d4d4d4] outline-none placeholder-[#6e7681] font-[JetBrains_Mono,Fira_Code,Consolas,monospace]"
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        {/* Command list */}
        <div ref={listRef} className="flex-1 overflow-y-auto min-h-0 py-1">
          {results.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <span className="text-[12px] text-[#6e7681]">
                No matching commands
              </span>
            </div>
          ) : (
            grouped.map((group) => (
              <div key={group.category}>
                {/* Category header */}
                <div className="px-3.5 pt-2 pb-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6e7681]">
                    {group.category}
                  </span>
                </div>

                {group.items.map((cmd) => {
                  const idx = flatIndex++;
                  const isSelected = idx === selectedIndex;
                  const Icon = cmd.icon;

                  return (
                    <div
                      key={cmd.id}
                      ref={(el) => {
                        if (el) itemRefs.current.set(idx, el);
                        else itemRefs.current.delete(idx);
                      }}
                      className={`flex items-center gap-2.5 mx-1.5 px-2.5 py-1.5 rounded cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-[#04395e] text-white"
                          : "text-[#d4d4d4] hover:bg-[#2a2d2e]"
                      }`}
                      onClick={() => executeCommand(cmd)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                    >
                      {Icon && (
                        <Icon
                          className={`w-4 h-4 shrink-0 ${
                            isSelected ? "text-[#75beff]" : "text-[#858585]"
                          }`}
                        />
                      )}
                      <span className="flex-1 text-[13px] truncate">
                        {cmd.label}
                      </span>
                      {cmd.shortcut && (
                        <span className="text-[11px] text-[#6e7681] shrink-0 flex items-center gap-0.5">
                          {cmd.shortcut.split("+").map((key, i) => (
                            <kbd
                              key={i}
                              className="px-1 py-0.5 bg-[#2d2d2d] rounded text-[10px] border border-[#3c3c3c] min-w-4.5 text-center"
                            >
                              {key}
                            </kbd>
                          ))}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-3.5 py-1.5 border-t border-[#3c3c3c] bg-[#1e1e1e]">
          <div className="flex items-center gap-3 text-[11px] text-[#6e7681]">
            <span>
              <kbd className="px-1 py-0.5 bg-[#2d2d2d] rounded text-[10px] border border-[#3c3c3c]">
                ↑↓
              </kbd>{" "}
              navigate
            </span>
            <span>
              <kbd className="px-1 py-0.5 bg-[#2d2d2d] rounded text-[10px] border border-[#3c3c3c]">
                ↵
              </kbd>{" "}
              run
            </span>
            <span>
              <kbd className="px-1 py-0.5 bg-[#2d2d2d] rounded text-[10px] border border-[#3c3c3c]">
                esc
              </kbd>{" "}
              close
            </span>
          </div>
          <span className="text-[11px] text-[#6e7681]">
            {results.length} command{results.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Re-export icon set so WorkspaceIDE can build its command list ──
export {
  FilePlus,
  FolderPlus,
  Terminal,
  Play,
  RotateCcw,
  Package,
  GitCommit,
  Upload,
  Download,
  Search,
  Files,
  GitBranch,
  Network,
  Eye,
  Save,
  Settings,
};
