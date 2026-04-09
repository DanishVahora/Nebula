import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ClipboardList, Clock, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { userAPI } from "@/lib/api";
import { useTheme } from "@/contexts/ThemeContext";

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  status: string;
  createdAt: string;
}

interface AssignmentsCardProps {
  onOpenAssignments?: () => void;
}

const statusStyles: Record<string, { icon: React.ReactNode; darkColor: string; lightColor: string; darkBg: string; lightBg: string; darkBorder: string; lightBorder: string; label: string }> = {
  pending: {
    icon: <Clock className="h-3 w-3" />,
    darkColor: "text-yellow-400",
    lightColor: "text-yellow-600",
    darkBg: "bg-yellow-500/10",
    lightBg: "bg-yellow-50",
    darkBorder: "border-yellow-500/15",
    lightBorder: "border-yellow-200",
    label: "Pending",
  },
  submitted: {
    icon: <CheckCircle2 className="h-3 w-3" />,
    darkColor: "text-green-400",
    lightColor: "text-green-600",
    darkBg: "bg-green-500/10",
    lightBg: "bg-green-50",
    darkBorder: "border-green-500/15",
    lightBorder: "border-green-200",
    label: "Submitted",
  },
  graded: {
    icon: <CheckCircle2 className="h-3 w-3" />,
    darkColor: "text-blue-400",
    lightColor: "text-blue-600",
    darkBg: "bg-blue-500/10",
    lightBg: "bg-blue-50",
    darkBorder: "border-blue-500/15",
    lightBorder: "border-blue-200",
    label: "Graded",
  },
  overdue: {
    icon: <AlertTriangle className="h-3 w-3" />,
    darkColor: "text-red-400",
    lightColor: "text-red-600",
    darkBg: "bg-red-500/10",
    lightBg: "bg-red-50",
    darkBorder: "border-red-500/15",
    lightBorder: "border-red-200",
    label: "Overdue",
  },
  failed: {
    icon: <XCircle className="h-3 w-3" />,
    darkColor: "text-red-500",
    lightColor: "text-red-600",
    darkBg: "bg-red-500/10",
    lightBg: "bg-red-50",
    darkBorder: "border-red-500/15",
    lightBorder: "border-red-200",
    label: "Failed",
  },
};

export function AssignmentsCard({ onOpenAssignments }: AssignmentsCardProps) {
  const { isDark } = useTheme();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await userAPI.getAssignments();
        setAssignments(data.assignments);
      } catch {
        // No assignments
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const pendingCount = assignments.filter((a) => a.status === "pending").length;
  const completedCount = assignments.filter((a) => a.status === "submitted" || a.status === "graded").length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15 }}
      className={`group relative overflow-hidden rounded-2xl border p-6 backdrop-blur-sm transition-all duration-500 hover:shadow-[0_0_30px_rgba(234,179,8,0.08)] ${isDark
        ? "border-white/8 bg-white/[0.03] hover:border-yellow-500/15"
        : "border-black/8 bg-white/70 hover:border-yellow-500/20"
        }`}
    >
      {/* Corner glow */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-yellow-500/[0.04] blur-[40px] transition-all duration-700 group-hover:bg-yellow-500/[0.08]" />

      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${isDark ? "bg-yellow-500/10" : "bg-yellow-50"}`}>
              <ClipboardList className={`h-4.5 w-4.5 ${isDark ? "text-yellow-400" : "text-yellow-600"}`} />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">Assignments</h3>
              <p className={`text-[11px] ${isDark ? "text-zinc-500" : "text-zinc-500"}`}>{loading ? "..." : `${assignments.length} total`}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {pendingCount > 0 && (
              <span className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold ${isDark
                ? "border-yellow-500/15 bg-yellow-500/10 text-yellow-400"
                : "border-yellow-200 bg-yellow-50 text-yellow-600"
                }`}>
                <Clock className="h-2.5 w-2.5" />
                {pendingCount} due
              </span>
            )}
            {onOpenAssignments && (
              <button
                onClick={onOpenAssignments}
                className={`rounded-md border px-2.5 py-1 text-[10px] font-semibold transition-colors ${isDark
                  ? "border-white/10 text-zinc-300 hover:bg-white/5"
                  : "border-black/10 text-zinc-700 hover:bg-black/5"
                  }`}
              >
                Open
              </button>
            )}
          </div>
        </div>

        {/* Bold stat */}
        <div className="mt-5 flex items-end gap-6">
          <div>
            <span className="text-4xl font-bold tracking-tight">
              {loading ? <span className={`inline-block h-10 w-10 animate-pulse rounded ${isDark ? "bg-white/5" : "bg-black/5"}`} /> : pendingCount}
            </span>
            <span className={`ml-2 text-sm ${isDark ? "text-yellow-500/60" : "text-yellow-600/60"}`}>pending</span>
          </div>
          <div>
            <span className={`text-2xl font-bold tracking-tight ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
              {loading ? <span className={`inline-block h-7 w-8 animate-pulse rounded ${isDark ? "bg-white/5" : "bg-black/5"}`} /> : completedCount}
            </span>
            <span className={`ml-1.5 text-xs ${isDark ? "text-zinc-600" : "text-zinc-400"}`}>done</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className={`mt-3 h-1 overflow-hidden rounded-full ${isDark ? "bg-white/[0.06]" : "bg-black/[0.06]"}`}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: loading ? "0%" : `${assignments.length > 0 ? (completedCount / assignments.length) * 100 : 0}%` }}
            transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
            className="h-full rounded-full bg-gradient-to-r from-yellow-500 to-amber-400"
          />
        </div>
        <p className={`mt-1.5 text-[10px] ${isDark ? "text-zinc-600" : "text-zinc-500"}`}>
          {assignments.length > 0 ? `${Math.round((completedCount / assignments.length) * 100)}% completed` : "No assignments"}
        </p>

        {/* Assignment list */}
        <div className="mt-4 max-h-56 space-y-2 overflow-y-auto pr-1">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-transparent border-t-yellow-500" />
            </div>
          ) : assignments.length === 0 ? (
            <div className="flex flex-col items-center py-6 text-center">
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl border border-dashed ${isDark ? "border-yellow-500/15 bg-yellow-500/5" : "border-yellow-200 bg-yellow-50"
                }`}>
                <ClipboardList className={`h-4.5 w-4.5 ${isDark ? "text-yellow-600" : "text-yellow-500"}`} />
              </div>
              <p className={`mt-3 text-xs font-medium ${isDark ? "text-zinc-500" : "text-zinc-500"}`}>No assignments yet</p>
              <p className={`mt-0.5 text-[10px] ${isDark ? "text-zinc-600" : "text-zinc-400"}`}>They'll appear here when assigned</p>
            </div>
          ) : (
            assignments.map((a, i) => {
              const config = statusStyles[a.status] || statusStyles.pending;
              return (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 + i * 0.06 }}
                  onClick={onOpenAssignments}
                  className={`group/item flex items-center justify-between rounded-xl border px-3.5 py-3 transition-all duration-300 ${isDark
                    ? "border-white/[0.04] bg-white/[0.02] hover:border-yellow-500/10 hover:bg-yellow-500/[0.03]"
                    : "border-black/[0.04] bg-black/[0.01] hover:border-yellow-500/15 hover:bg-yellow-50/50"
                    } ${onOpenAssignments ? "cursor-pointer" : ""}`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${isDark
                      ? `${config.darkBorder} ${config.darkBg} ${config.darkColor}`
                      : `${config.lightBorder} ${config.lightBg} ${config.lightColor}`
                      }`}>
                      {config.icon}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold">{a.title}</p>
                      <p className={`text-[10px] ${isDark ? "text-zinc-600" : "text-zinc-400"}`}>
                        {a.dueDate ? `Due ${new Date(a.dueDate).toLocaleDateString()}` : "No due date"}
                      </p>
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold ${isDark
                    ? `${config.darkBorder} ${config.darkBg} ${config.darkColor}`
                    : `${config.lightBorder} ${config.lightBg} ${config.lightColor}`
                    }`}>
                    {config.label}
                  </span>
                </motion.div>
              );
            })
          )}
        </div>

      </div>
    </motion.div>
  );
}
