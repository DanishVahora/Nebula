import { useState, useRef, useEffect, useCallback } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import "@xterm/xterm/css/xterm.css";
import { workspaceAPI, API_BASE } from "@/lib/api";
import {
  Plus,
  X,
  Terminal as TerminalIcon,
  Trash2,
} from "lucide-react";

interface TerminalTab {
  id: string;          // server terminalId
  label: string;       // "Terminal 1", "Terminal 2", etc.
  terminal: Terminal;
  fitAddon: FitAddon;
  ws: WebSocket | null;
  alive: boolean;
}

interface TerminalPanelProps {
  workspaceId: string;
}

export function TerminalPanel({ workspaceId }: TerminalPanelProps) {
  const [tabs, setTabs] = useState<TerminalTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const terminalContainerRef = useRef<HTMLDivElement>(null);
  const tabCounterRef = useRef(0);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  // Persistent wrapper div per terminal — survives tab switches
  const wrappersRef = useRef<Map<string, HTMLDivElement>>(new Map());
  // Track which terminals have already been opened (open() should only be called once)
  const mountedRef = useRef<Set<string>>(new Set());
  // Keep a ref to the latest tabs so callbacks can read them
  const tabsRef = useRef<TerminalTab[]>([]);
  tabsRef.current = tabs;
  const activeTabIdRef = useRef<string | null>(null);
  activeTabIdRef.current = activeTabId;

  // Derive the WebSocket URL directly from API_BASE (e.g. http://localhost:5000)
  // so we connect straight to the backend server, avoiding unreliable Vite
  // dev-server WebSocket proxying.  Works in production too since API_BASE
  // can be overridden via VITE_API_URL.
  const wsBaseUrl = API_BASE.replace(/^http/, "ws");

  // ── Create a new terminal session ─────────────────────
  const createTerminal = useCallback(async () => {
    try {
      const res = await workspaceAPI.createTerminal(workspaceId);
      const { terminalId, wsToken } = res.data;
      tabCounterRef.current += 1;

      const term = new Terminal({
        cursorBlink: true,
        cursorStyle: "bar",
        fontSize: 13,
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace",
        lineHeight: 1.35,
        theme: {
          background: "#0f0f0f",
          foreground: "#d4d4d4",
          cursor: "#aeafad",
          selectionBackground: "#264f78",
          selectionForeground: "#ffffff",
          black: "#1e1e1e",
          red: "#f44747",
          green: "#6a9955",
          yellow: "#dcdcaa",
          blue: "#569cd6",
          magenta: "#c586c0",
          cyan: "#4ec9b0",
          white: "#d4d4d4",
          brightBlack: "#808080",
          brightRed: "#f44747",
          brightGreen: "#6a9955",
          brightYellow: "#dcdcaa",
          brightBlue: "#569cd6",
          brightMagenta: "#c586c0",
          brightCyan: "#4ec9b0",
          brightWhite: "#ffffff",
        },
        allowTransparency: false,
        scrollback: 5000,
      });

      const fitAddon = new FitAddon();
      const webLinksAddon = new WebLinksAddon();
      term.loadAddon(fitAddon);
      term.loadAddon(webLinksAddon);

      // Connect WebSocket — append the short-lived token so the backend
      // can authenticate even when cookies aren't sent cross-origin.
      const wsUrl = `${wsBaseUrl}/ws/terminal/${workspaceId}/${terminalId}?token=${encodeURIComponent(wsToken)}`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        // Send initial size
        try {
          fitAddon.fit();
          ws.send(JSON.stringify({ type: "resize", cols: term.cols, rows: term.rows }));
        } catch {
          // Ignore fit errors before mount
        }
      };

      ws.onmessage = (event) => {
        term.write(event.data);
      };

      ws.onclose = () => {
        setTabs((prev) =>
          prev.map((t) => (t.id === terminalId ? { ...t, alive: false, ws: null } : t))
        );
      };

      ws.onerror = () => {
        // Will trigger onclose
      };

      // Forward terminal input to WS
      term.onData((data) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(data);
        }
      });

      const newTab: TerminalTab = {
        id: terminalId,
        label: `Terminal ${tabCounterRef.current}`,
        terminal: term,
        fitAddon,
        ws,
        alive: true,
      };

      setTabs((prev) => [...prev, newTab]);
      setActiveTabId(terminalId);
    } catch (error) {
      console.error("Failed to create terminal:", error);
    }
  }, [workspaceId, wsBaseUrl]);

  // ── Close a terminal tab ──────────────────────────────
  const closeTerminal = useCallback(
    async (terminalId: string) => {
      const tab = tabsRef.current.find((t) => t.id === terminalId);
      if (tab) {
        tab.ws?.close();
        tab.terminal.dispose();
        // Remove the persistent wrapper div
        const wrapper = wrappersRef.current.get(terminalId);
        wrapper?.remove();
        wrappersRef.current.delete(terminalId);
        mountedRef.current.delete(terminalId);
        try {
          await workspaceAPI.killTerminal(workspaceId, terminalId);
        } catch {
          // May already be dead
        }
      }

      setTabs((prev) => {
        const filtered = prev.filter((t) => t.id !== terminalId);
        if (activeTabIdRef.current === terminalId) {
          setActiveTabId(filtered.length > 0 ? filtered[filtered.length - 1].id : null);
        }
        return filtered;
      });
    },
    [workspaceId]
  );

  // ── Mount/unmount terminal into DOM when active tab changes ──
  // Each terminal gets its own persistent wrapper div so switching tabs
  // never destroys the terminal DOM (no re-open, no lost scrollback).
  useEffect(() => {
    const container = terminalContainerRef.current;
    if (!container) return;

    // 1. Ensure every tab has a wrapper div; open() only the first time
    tabs.forEach((tab) => {
      if (!wrappersRef.current.has(tab.id)) {
        const wrapper = document.createElement("div");
        wrapper.dataset.terminalId = tab.id;
        wrapper.style.width = "100%";
        wrapper.style.height = "100%";
        wrapper.style.display = "none";
        container.appendChild(wrapper);
        wrappersRef.current.set(tab.id, wrapper);
      }

      if (!mountedRef.current.has(tab.id)) {
        const wrapper = wrappersRef.current.get(tab.id)!;
        tab.terminal.open(wrapper);
        mountedRef.current.add(tab.id);
      }
    });

    // 2. Show only the active terminal, hide the rest
    wrappersRef.current.forEach((wrapper, id) => {
      wrapper.style.display = id === activeTabId ? "" : "none";
    });

    // 3. Fit + focus the active terminal after the DOM settles
    const activeTab = tabs.find((t) => t.id === activeTabId);
    if (activeTab) {
      requestAnimationFrame(() => {
        try {
          activeTab.fitAddon.fit();
          if (activeTab.ws?.readyState === WebSocket.OPEN) {
            activeTab.ws.send(
              JSON.stringify({
                type: "resize",
                cols: activeTab.terminal.cols,
                rows: activeTab.terminal.rows,
              })
            );
          }
        } catch {
          // Ignore
        }
        activeTab.terminal.focus();
      });
    }
  }, [activeTabId, tabs]);

  // ── Resize observer for the container ─────────────────
  useEffect(() => {
    const container = terminalContainerRef.current;
    if (!container) return;

    resizeObserverRef.current = new ResizeObserver(() => {
      const activeTab = tabsRef.current.find((t) => t.id === activeTabIdRef.current);
      if (!activeTab) return;
      try {
        activeTab.fitAddon.fit();
        if (activeTab.ws?.readyState === WebSocket.OPEN) {
          activeTab.ws.send(
            JSON.stringify({
              type: "resize",
              cols: activeTab.terminal.cols,
              rows: activeTab.terminal.rows,
            })
          );
        }
      } catch {
        // Ignore
      }
    });

    resizeObserverRef.current.observe(container);
    return () => resizeObserverRef.current?.disconnect();
  }, []);

  // ── Auto-create first terminal on mount ───────────────
  useEffect(() => {
    createTerminal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Clean up all terminals on unmount ─────────────────
  useEffect(() => {
    return () => {
      tabsRef.current.forEach((tab) => {
        tab.ws?.close();
        tab.terminal.dispose();
      });
      wrappersRef.current.forEach((wrapper) => wrapper.remove());
      wrappersRef.current.clear();
      mountedRef.current.clear();
    };
  }, []);

  return (
    <div className="h-full flex flex-col bg-[#0f0f0f] font-mono text-[13px] relative">
      {/* ── Tab bar ──────────────────────────────────── */}
      <div className="flex items-center justify-between bg-[#181818] shrink-0 border-b border-[#0f0f0f]">
        <div className="flex items-center overflow-x-auto" style={{ scrollbarWidth: "thin" }}>
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <div
                key={tab.id}
                className={`group flex items-center gap-1.5 px-3 py-1.5 cursor-pointer border-r border-[#0f0f0f] min-w-0 max-w-[160px] transition-colors ${
                  isActive
                    ? "bg-[#0f0f0f] text-[#d4d4d4] border-t-2 border-t-[#007acc]"
                    : "bg-[#1e1e1e] text-[#858585] hover:bg-[#1e1e1e]/80 border-t-2 border-t-transparent"
                }`}
                onClick={() => setActiveTabId(tab.id)}
              >
                <TerminalIcon className="w-3.5 h-3.5 shrink-0" />
                <span className="text-[12px] truncate">{tab.label}</span>
                {!tab.alive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#f44747] shrink-0" title="Disconnected" />
                )}
                <button
                  className="ml-auto p-0.5 hover:bg-[#3c3c3c] rounded opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTerminal(tab.id);
                  }}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}

          {/* ── New terminal button ─────────────────── */}
          <button
            className="flex items-center gap-1 px-2.5 py-1.5 text-[#858585] hover:text-[#d4d4d4] hover:bg-[#3c3c3c] transition-colors rounded-sm"
            onClick={createTerminal}
            title="New Terminal"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-0.5 pr-2 shrink-0">
          <button
            className="p-1 hover:bg-[#3c3c3c] rounded transition-colors"
            title="Kill terminal"
            onClick={() => {
              if (activeTabId) closeTerminal(activeTabId);
            }}
          >
            <Trash2 className="w-3.5 h-3.5 text-[#858585] hover:text-[#d4d4d4]" />
          </button>
        </div>
      </div>

      {/* ── Terminal output area ─────────────────────── */}
      <div
        ref={terminalContainerRef}
        className="flex-1 min-h-0"
        style={{ padding: "4px 0 0 4px" }}
      />

      {/* ── Empty state ─────────────────────────────── */}
      {tabs.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <button
            onClick={createTerminal}
            className="flex items-center gap-2 px-4 py-2 bg-[#0e639c] text-white rounded text-[13px] hover:bg-[#1177bb] transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Terminal
          </button>
        </div>
      )}
    </div>
  );
}
