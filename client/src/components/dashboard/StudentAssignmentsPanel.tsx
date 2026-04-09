import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { assignmentAPI, userAPI } from "@/lib/api";
import { useTheme } from "@/contexts/ThemeContext";
import { motion } from "framer-motion";
import {
  ClipboardList,
  Code2,
  Globe,
  Clock,
  Calendar,
  Trophy,
  Play,
  ChevronRight,
  Award,
} from "lucide-react";

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  type: "WEB_DEV" | "DSA";
  difficulty: string;
  template: string | null;
  language: string | null;
  timeLimit: number | null;
  deadline: string | null;
  maxMarks: number;
  createdAt: string;
  classroom: { id: string; name: string };
  creator: { id: string; name: string | null };
  _count: { testCases: number; submissions: number };
  mySubmission?: {
    id: string;
    status: string;
    score: number | null;
    workspaceId: string | null;
  } | null;
}

const diffColors: Record<string, { text: string; bg: string }> = {
  EASY: { text: "text-green-400", bg: "bg-green-500/10" },
  MEDIUM: { text: "text-yellow-400", bg: "bg-yellow-500/10" },
  HARD: { text: "text-red-400", bg: "bg-red-500/10" },
};

const subStatus: Record<string, { label: string; color: string; bg: string }> = {
  IN_PROGRESS: { label: "In Progress", color: "text-blue-400", bg: "bg-blue-500/10" },
  SUBMITTED: { label: "Submitted", color: "text-yellow-400", bg: "bg-yellow-500/10" },
  GRADED: { label: "Graded", color: "text-green-400", bg: "bg-green-500/10" },
  TIMED_OUT: { label: "Timed Out", color: "text-red-400", bg: "bg-red-500/10" },
};

export function StudentAssignmentsPanel() {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await userAPI.getAssignments();
        setAssignments(data.assignments);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleStart = async (id: string) => {
    setStarting(id);
    try {
      const { data } = await assignmentAPI.start(id);
      const wsId = data.workspaceId || data.submission?.workspaceId;
      if (wsId) navigate(`/workspace/${wsId}`);
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to start");
    } finally {
      setStarting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-transparent border-t-yellow-500" />
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center rounded-2xl border py-16 ${isDark ? "border-white/6 bg-white/2" : "border-black/6 bg-black/2"
        }`}>
        <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${isDark ? "bg-white/5" : "bg-black/5"}`}>
          <ClipboardList className={`h-7 w-7 ${isDark ? "text-zinc-600" : "text-zinc-400"}`} />
        </div>
        <h3 className="text-base font-semibold">No assignments yet</h3>
        <p className={`mt-1.5 max-w-sm text-center text-sm ${isDark ? "text-zinc-500" : "text-zinc-500"}`}>
          Assignments from your classrooms will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className={`text-sm ${isDark ? "text-zinc-500" : "text-zinc-500"}`}>
        {assignments.length} assignment{assignments.length !== 1 ? "s" : ""}
      </p>

      {assignments.map((a, i) => {
        const diff = diffColors[a.difficulty] || diffColors.MEDIUM;
        const sub = a.mySubmission;
        const ss = sub ? subStatus[sub.status] || subStatus.IN_PROGRESS : null;
        const isExpired = a.deadline && new Date(a.deadline) < new Date();

        return (
          <motion.div
            key={a.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className={`group rounded-xl border p-5 transition-all ${isDark
                ? "border-white/6 bg-white/2 hover:border-white/12"
                : "border-black/6 bg-black/2 hover:border-black/12"
              }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${a.type === "DSA"
                    ? isDark ? "bg-purple-500/10" : "bg-purple-50"
                    : isDark ? "bg-blue-500/10" : "bg-blue-50"
                  }`}>
                  {a.type === "DSA" ? (
                    <Code2 className={`h-5 w-5 ${isDark ? "text-purple-400" : "text-purple-600"}`} />
                  ) : (
                    <Globe className={`h-5 w-5 ${isDark ? "text-blue-400" : "text-blue-600"}`} />
                  )}
                </div>

                <div className="min-w-0">
                  <h3 className="text-sm font-semibold">{a.title}</h3>
                  <p className={`text-[10px] ${isDark ? "text-zinc-600" : "text-zinc-400"}`}>
                    {a.classroom.name}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${diff.bg} ${diff.text}`}>
                      {a.difficulty}
                    </span>
                    {a.timeLimit && (
                      <span className={`flex items-center gap-0.5 text-[10px] ${isDark ? "text-zinc-600" : "text-zinc-400"}`}>
                        <Clock className="h-2.5 w-2.5" /> {a.timeLimit}min
                      </span>
                    )}
                    {a.deadline && (
                      <span className={`flex items-center gap-0.5 text-[10px] ${isExpired ? "text-red-400" : isDark ? "text-zinc-600" : "text-zinc-400"}`}>
                        <Calendar className="h-2.5 w-2.5" /> {new Date(a.deadline).toLocaleDateString()}
                      </span>
                    )}
                    <span className={`text-[10px] ${isDark ? "text-zinc-600" : "text-zinc-400"}`}>
                      <Trophy className="mr-0.5 inline h-2.5 w-2.5" />{a.maxMarks} pts
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {ss && (
                  <span className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold uppercase ${ss.bg} ${ss.color}`}>
                    {sub?.status === "GRADED" && sub.score != null ? (
                      <><Award className="h-2.5 w-2.5" /> {sub.score}/{a.maxMarks}</>
                    ) : (
                      ss.label
                    )}
                  </span>
                )}

                {!sub ? (
                  <button
                    onClick={() => handleStart(a.id)}
                    disabled={starting === a.id || !!isExpired}
                    className="flex items-center gap-1.5 rounded-lg bg-yellow-500 px-4 py-1.5 text-xs font-medium text-black hover:opacity-90 disabled:opacity-50"
                  >
                    {starting === a.id ? (
                      <div className="h-3 w-3 animate-spin rounded-full border-2 border-black/30 border-t-black" />
                    ) : (
                      <Play className="h-3 w-3" />
                    )}
                    Start
                  </button>
                ) : sub.status === "IN_PROGRESS" && sub.workspaceId ? (
                  <button
                    onClick={() => navigate(`/workspace/${sub.workspaceId}`)}
                    className="flex items-center gap-1.5 rounded-lg bg-yellow-500 px-4 py-1.5 text-xs font-medium text-black hover:opacity-90"
                  >
                    <ChevronRight className="h-3 w-3" /> Continue
                  </button>
                ) : null}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
