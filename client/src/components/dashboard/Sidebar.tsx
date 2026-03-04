import { motion } from "framer-motion";
import {
  LayoutDashboard,
  FolderOpen,
  ClipboardList,
  Github,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "workspaces", label: "Workspaces", icon: FolderOpen },
  { id: "assignments", label: "Assignments", icon: ClipboardList },
  { id: "github", label: "GitHub", icon: Github },
  { id: "settings", label: "Settings", icon: Settings },
];

interface SidebarProps {
  activeSection: string;
  onNavigate: (section: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function Sidebar({ activeSection, onNavigate, collapsed, onToggleCollapse }: SidebarProps) {
  const { isDark } = useTheme();

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 72 : 240 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className={`fixed left-0 top-0 z-40 flex h-screen flex-col border-r backdrop-blur-xl transition-colors duration-300 ${
        isDark
          ? "border-white/8 bg-black/80"
          : "border-black/8 bg-white/80"
      }`}
    >
      {/* Logo */}
      <div className={`flex h-14 items-center gap-3 border-b px-5 ${isDark ? "border-white/8" : "border-black/8"}`}>
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${isDark ? "bg-white/5" : "bg-black/5"}`}>
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-green-500" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20z" />
          </svg>
        </div>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-sm font-semibold tracking-tight"
          >
            Nebula
          </motion.span>
        )}
      </div>

      {/* Nav Items */}
      <nav className="mt-4 flex-1 space-y-0.5 px-3">
        {navItems.map((item) => {
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`group relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-200 ${
                isActive
                  ? isDark
                    ? "bg-white/8 text-white"
                    : "bg-black/6 text-black"
                  : isDark
                    ? "text-zinc-500 hover:bg-white/5 hover:text-zinc-200"
                    : "text-zinc-500 hover:bg-black/4 hover:text-zinc-700"
              }`}
            >
              {/* Active indicator bar */}
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-green-500"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}

              <item.icon className="h-[18px] w-[18px] shrink-0" />

              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.05 }}
                  className="truncate"
                >
                  {item.label}
                </motion.span>
              )}
            </button>
          );
        })}
      </nav>

      {/* System status */}
      {!collapsed && (
        <div className={`mx-3 mb-3 rounded-lg border px-3 py-2.5 ${
          isDark ? "border-white/5 bg-white/[0.03]" : "border-black/5 bg-black/[0.02]"
        }`}>
          <div className="flex items-center gap-2">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-50" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-500" />
            </span>
            <span className={`text-[11px] ${isDark ? "text-zinc-500" : "text-zinc-500"}`}>All systems online</span>
          </div>
        </div>
      )}

      {/* Collapse toggle */}
      <div className={`border-t p-3 ${isDark ? "border-white/8" : "border-black/8"}`}>
        <button
          onClick={onToggleCollapse}
          className={`flex w-full items-center justify-center rounded-lg py-1.5 transition-colors duration-200 ${
            isDark
              ? "text-zinc-600 hover:bg-white/5 hover:text-zinc-400"
              : "text-zinc-400 hover:bg-black/4 hover:text-zinc-600"
          }`}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
    </motion.aside>
  );
}
