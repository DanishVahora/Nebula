import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ClipboardList, Clock, CheckCircle2, AlertCircle } from "lucide-react";
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

const statusConfig: Record<
  string,
  { icon: React.ReactNode; darkColor: string; lightColor: string; darkBg: string; lightBg: string; label: string }
> = {
  pending: {
    icon: <Clock className="h-3.5 w-3.5" />,
    darkColor: "text-yellow-400",
    lightColor: "text-yellow-600",
    darkBg: "bg-yellow-500/10",
    lightBg: "bg-yellow-50",
    label: "Pending",
  },
  submitted: {
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    darkColor: "text-blue-400",
    lightColor: "text-blue-600",
    darkBg: "bg-blue-500/10",
    lightBg: "bg-blue-50",
    label: "Submitted",
  },
  graded: {
    icon: <AlertCircle className="h-3.5 w-3.5" />,
    darkColor: "text-green-400",
    lightColor: "text-green-600",
    darkBg: "bg-green-500/10",
    lightBg: "bg-green-50",
    label: "Graded",
  },
};

export function AssignmentsPanel() {
  const { isDark } = useTheme();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await userAPI.getAssignments();
        setAssignments(data.assignments);
      } catch {
        // No assignments
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-transparent border-t-green-500" />
          <p className={`text-xs ${isDark ? "text-zinc-600" : "text-zinc-400"}`}>Loading assignments...</p>
        </div>
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className={`flex h-14 w-14 items-center justify-center rounded-2xl border ${
          isDark ? "border-white/8 bg-white/[0.03]" : "border-black/8 bg-black/[0.03]"
        }`}>
          <ClipboardList className={`h-6 w-6 ${isDark ? "text-zinc-600" : "text-zinc-400"}`} />
        </div>
        <p className={`mt-4 text-sm font-medium ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>No assignments yet</p>
        <p className={`mt-1 text-xs ${isDark ? "text-zinc-600" : "text-zinc-400"}`}>
          Assignments from your classes will appear here.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className={`text-sm font-medium ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
        {assignments.length} assignment{assignments.length !== 1 && "s"}
      </p>

      <div className="mt-5 space-y-3">
        {assignments.map((a, i) => {
          const config = statusConfig[a.status] || statusConfig.pending;
          return (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`group flex items-center justify-between rounded-2xl border px-5 py-4 backdrop-blur-sm transition-all duration-300 ${
                isDark
                  ? "border-white/8 bg-white/[0.03] hover:border-white/12"
                  : "border-black/8 bg-white/70 hover:border-black/12"
              }`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                    isDark ? `${config.darkBg} ${config.darkColor}` : `${config.lightBg} ${config.lightColor}`
                  }`}
                >
                  {config.icon}
                </div>
                <div>
                  <h3 className="text-sm font-semibold tracking-tight">{a.title}</h3>
                  {a.description && (
                    <p className={`mt-0.5 text-xs line-clamp-1 ${isDark ? "text-zinc-600" : "text-zinc-400"}`}>
                      {a.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4">
                {a.dueDate && (
                  <span className={`text-[10px] ${isDark ? "text-zinc-600" : "text-zinc-400"}`}>
                    Due {new Date(a.dueDate).toLocaleDateString()}
                  </span>
                )}
                <span
                  className={`rounded-lg border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${
                    isDark
                      ? `border-white/[0.04] ${config.darkBg} ${config.darkColor}`
                      : `border-black/[0.04] ${config.lightBg} ${config.lightColor}`
                  }`}
                >
                  {config.label}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
