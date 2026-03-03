import { motion } from "framer-motion";
import {
  LayoutDashboard,
  FolderOpen,
  ClipboardList,
  GraduationCap,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, color: "text-green-400", glow: "shadow-green-500/20", gradient: "from-green-500 to-emerald-600" },
  { id: "workspaces", label: "Workspaces", icon: FolderOpen, color: "text-yellow-400", glow: "shadow-yellow-500/20", gradient: "from-yellow-500 to-amber-600" },
  { id: "assignments", label: "Assignments", icon: ClipboardList, color: "text-red-400", glow: "shadow-red-500/20", gradient: "from-red-500 to-rose-600" },
  { id: "classroom", label: "Classroom", icon: GraduationCap, color: "text-blue-400", glow: "shadow-blue-500/20", gradient: "from-blue-500 to-indigo-600" },
  { id: "settings", label: "Settings", icon: Settings, color: "text-zinc-400", glow: "shadow-zinc-500/20", gradient: "from-zinc-500 to-zinc-600" },
];

interface SidebarProps {
  activeSection: string;
  onNavigate: (section: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function Sidebar({ activeSection, onNavigate, collapsed, onToggleCollapse }: SidebarProps) {
  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 64 : 220 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className="fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-white/[0.06] bg-[#030303]"
    >
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 border-b border-white/[0.06] px-4">
        <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5">
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-white" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1c6.075 0 11 4.925 11 11s-4.925 11-11 11S1 18.075 1 12 5.925 1 12 1z" />
          </svg>
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
        </div>
        {!collapsed && (
          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm font-bold tracking-tight text-white">
            Nebula
          </motion.span>
        )}
      </div>

      {/* Nav Items */}
      <nav className="mt-4 flex-1 space-y-1 px-2">
        {navItems.map((item) => {
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-white/[0.07] text-white"
                  : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className={`absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-gradient-to-b ${item.gradient}`}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all duration-200 ${
                isActive ? `bg-gradient-to-br ${item.gradient} shadow-lg ${item.glow}` : ""
              }`}>
                <item.icon className={`h-3.5 w-3.5 ${isActive ? "text-white" : "text-zinc-600 group-hover:text-zinc-400"}`} />
              </div>
              {!collapsed && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="truncate">
                  {item.label}
                </motion.span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Status */}
      {!collapsed && (
        <div className="mx-2 mb-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
            </span>
            <span className="text-[10px] font-medium text-zinc-500">All systems online</span>
          </div>
        </div>
      )}

      {/* Collapse */}
      <div className="border-t border-white/[0.06] p-2">
        <button
          onClick={onToggleCollapse}
          className="flex w-full items-center justify-center rounded-lg py-2 text-zinc-600 transition-colors hover:bg-white/[0.04] hover:text-zinc-400"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
    </motion.aside>
  );
}
