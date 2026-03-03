import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ClipboardList, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { userAPI } from "@/lib/api";

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
  { icon: React.ReactNode; color: string; bg: string }
> = {
  pending: {
    icon: <Clock className="h-3 w-3" />,
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
  },
  submitted: {
    icon: <CheckCircle2 className="h-3 w-3" />,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
  },
  graded: {
    icon: <AlertCircle className="h-3 w-3" />,
    color: "text-green-400",
    bg: "bg-green-500/10",
  },
};

export function AssignmentsPanel() {
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
      <div className="flex items-center justify-center py-20">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-700 border-t-white" />
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.02]">
          <ClipboardList className="h-5 w-5 text-zinc-600" />
        </div>
        <p className="mt-3 text-sm text-zinc-400">No assignments yet</p>
        <p className="mt-1 text-xs text-zinc-600">
          Assignments from your classes will appear here.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-zinc-400">
        {assignments.length} assignment{assignments.length !== 1 && "s"}
      </p>

      <div className="mt-4 space-y-2">
        {assignments.map((a, i) => {
          const config = statusConfig[a.status] || statusConfig.pending;
          return (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-[#0a0a0a] px-4 py-3 transition-colors hover:border-white/[0.12]"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-lg ${config.bg} ${config.color}`}
                >
                  {config.icon}
                </div>
                <div>
                  <h3 className="text-sm font-medium">{a.title}</h3>
                  {a.description && (
                    <p className="mt-0.5 text-xs text-zinc-600 line-clamp-1">
                      {a.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                {a.dueDate && (
                  <span className="text-[10px] text-zinc-600">
                    Due {new Date(a.dueDate).toLocaleDateString()}
                  </span>
                )}
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${config.bg} ${config.color}`}
                >
                  {a.status}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
