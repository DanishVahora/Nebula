import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ClipboardList, Clock, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { userAPI } from "@/lib/api";

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  status: string;
  createdAt: string;
}

const statusStyles: Record<string, { icon: React.ReactNode; color: string; bg: string; border: string; label: string }> = {
  pending: {
    icon: <Clock className="h-3 w-3" />,
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/20",
    label: "Pending",
  },
  submitted: {
    icon: <CheckCircle2 className="h-3 w-3" />,
    color: "text-green-400",
    bg: "bg-green-500/10",
    border: "border-green-500/20",
    label: "Submitted",
  },
  graded: {
    icon: <CheckCircle2 className="h-3 w-3" />,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    label: "Graded",
  },
  overdue: {
    icon: <AlertTriangle className="h-3 w-3" />,
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    label: "Overdue",
  },
  failed: {
    icon: <XCircle className="h-3 w-3" />,
    color: "text-red-500",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    label: "Failed",
  },
};

export function AssignmentsCard() {
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
      className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0a0a0a] p-5 transition-all duration-300 hover:border-red-500/10"
    >
      {/* Accent glow */}
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-red-500/[0.04] blur-2xl transition-all duration-500 group-hover:bg-red-500/[0.08]" />

      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-red-500/20 to-rose-500/10 shadow-inner">
              <ClipboardList className="h-4 w-4 text-red-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">My Assignments</h3>
              <p className="text-[11px] text-zinc-600">{loading ? "..." : `${assignments.length} total`}</p>
            </div>
          </div>
          {pendingCount > 0 && (
            <span className="flex items-center gap-1 rounded-full border border-yellow-500/20 bg-yellow-500/10 px-2 py-0.5 text-[10px] font-semibold text-yellow-400 shadow-sm shadow-yellow-500/10">
              <Clock className="h-2.5 w-2.5" />
              {pendingCount} due
            </span>
          )}
        </div>

        {/* Content */}
        <div className="mt-4 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-800 border-t-red-400" />
            </div>
          ) : assignments.length === 0 ? (
            <div className="flex flex-col items-center py-6 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-dashed border-red-500/15 bg-red-500/5">
                <ClipboardList className="h-4 w-4 text-red-600" />
              </div>
              <p className="mt-2.5 text-xs text-zinc-500">No assignments yet</p>
              <p className="mt-0.5 text-[10px] text-zinc-700">They'll appear here when assigned</p>
            </div>
          ) : (
            assignments.slice(0, 4).map((a, i) => {
              const config = statusStyles[a.status] || statusStyles.pending;
              return (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.05 }}
                  className="flex items-center justify-between rounded-xl border border-white/[0.04] bg-white/[0.02] px-3 py-2.5 transition-all duration-200 hover:border-red-500/10 hover:bg-red-500/[0.02]"
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border ${config.border} ${config.bg} ${config.color}`}>
                      {config.icon}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-white">{a.title}</p>
                      <p className="text-[10px] text-zinc-600">
                        {a.dueDate ? `Due ${new Date(a.dueDate).toLocaleDateString()}` : "No due date"}
                      </p>
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${config.border} ${config.bg} ${config.color}`}>
                    {config.label}
                  </span>
                </motion.div>
              );
            })
          )}
        </div>

        {assignments.length > 4 && (
          <p className="mt-3 text-center text-[10px] text-red-500/50">+{assignments.length - 4} more</p>
        )}
      </div>
    </motion.div>
  );
}
