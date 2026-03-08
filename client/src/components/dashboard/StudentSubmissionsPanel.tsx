import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { assignmentAPI } from "@/lib/api";
import { useTheme } from "@/contexts/ThemeContext";
import { motion } from "framer-motion";
import {
  FileCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Code2,
  Globe,
  Award,
  ChevronRight,
} from "lucide-react";

interface MySubmission {
  id: string;
  status: string;
  score: number | null;
  feedback: string | null;
  startedAt: string;
  submittedAt: string | null;
  workspaceId: string | null;
  assignment: {
    id: string;
    title: string;
    type: string;
    difficulty: string;
    maxMarks: number;
    deadline: string | null;
    classroom: { id: string; name: string };
  };
}

const statusStyles: Record<string, { label: string; color: string; bg: string }> = {
  IN_PROGRESS: { label: "In Progress", color: "text-blue-400", bg: "bg-blue-500/10" },
  SUBMITTED: { label: "Submitted", color: "text-yellow-400", bg: "bg-yellow-500/10" },
  GRADED: { label: "Graded", color: "text-green-400", bg: "bg-green-500/10" },
  TIMED_OUT: { label: "Timed Out", color: "text-red-400", bg: "bg-red-500/10" },
};

export function StudentSubmissionsPanel() {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<MySubmission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await assignmentAPI.getMySubmissions();
        setSubmissions(data.submissions);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-transparent border-t-yellow-500" />
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center rounded-2xl border py-16 ${
        isDark ? "border-white/[0.06] bg-white/[0.02]" : "border-black/[0.06] bg-black/[0.02]"
      }`}>
        <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${isDark ? "bg-white/5" : "bg-black/5"}`}>
          <FileCheck className={`h-7 w-7 ${isDark ? "text-zinc-600" : "text-zinc-400"}`} />
        </div>
        <h3 className="text-base font-semibold">No submissions yet</h3>
        <p className={`mt-1.5 max-w-sm text-center text-sm ${isDark ? "text-zinc-500" : "text-zinc-500"}`}>
          Start an assignment from your classrooms to create your first submission.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className={`text-sm ${isDark ? "text-zinc-500" : "text-zinc-500"}`}>
        {submissions.length} submission{submissions.length !== 1 ? "s" : ""}
      </p>

      {submissions.map((s, i) => {
        const style = statusStyles[s.status] || statusStyles.IN_PROGRESS;

        return (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className={`group rounded-xl border p-4 transition-all ${
              isDark
                ? "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]"
                : "border-black/[0.06] bg-black/[0.02] hover:border-black/[0.12]"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                  s.assignment.type === "DSA"
                    ? isDark ? "bg-purple-500/10" : "bg-purple-50"
                    : isDark ? "bg-blue-500/10" : "bg-blue-50"
                }`}>
                  {s.assignment.type === "DSA" ? (
                    <Code2 className={`h-4 w-4 ${isDark ? "text-purple-400" : "text-purple-600"}`} />
                  ) : (
                    <Globe className={`h-4 w-4 ${isDark ? "text-blue-400" : "text-blue-600"}`} />
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold">{s.assignment.title}</p>
                  <p className={`text-[10px] ${isDark ? "text-zinc-600" : "text-zinc-400"}`}>
                    {s.assignment.classroom.name}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold uppercase ${style.bg} ${style.color}`}>
                  {style.label}
                </span>

                {s.score != null && (
                  <span className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold ${
                    isDark ? "bg-green-500/10 text-green-400" : "bg-green-50 text-green-600"
                  }`}>
                    <Award className="h-3 w-3" />
                    {s.score}/{s.assignment.maxMarks}
                  </span>
                )}

                {s.status === "IN_PROGRESS" && s.workspaceId && (
                  <button
                    onClick={() => navigate(`/workspace/${s.workspaceId}`)}
                    className="flex items-center gap-1 rounded-lg bg-yellow-500 px-3 py-1.5 text-xs font-medium text-black"
                  >
                    <ChevronRight className="h-3 w-3" /> Continue
                  </button>
                )}
              </div>
            </div>

            {s.feedback && s.status === "GRADED" && (
              <div className={`mt-3 rounded-lg border px-3 py-2 text-xs ${
                isDark ? "border-white/[0.04] bg-white/[0.02] text-zinc-400" : "border-black/[0.04] bg-black/[0.01] text-zinc-500"
              }`}>
                <span className="font-medium">Feedback:</span> {s.feedback}
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
