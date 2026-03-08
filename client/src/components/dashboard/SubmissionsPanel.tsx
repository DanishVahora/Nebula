import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { assignmentAPI } from "@/lib/api";
import { useTheme } from "@/contexts/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Eye,
  Award,
  X,
  Send,
  FileCode,
  User,
} from "lucide-react";

interface Submission {
  id: string;
  assignmentId: string;
  status: string;
  score: number | null;
  feedback: string | null;
  code: string | null;
  startedAt: string;
  submittedAt: string | null;
  workspaceId: string | null;
  student: { id: string; name: string | null; email: string; avatar: string | null };
}

interface Props {
  assignmentId: string;
  onBack: () => void;
}

const statusConfig: Record<string, { icon: React.ReactNode; color: string; bg: string; label: string }> = {
  IN_PROGRESS: { icon: <Clock className="h-3 w-3" />, color: "text-blue-400", bg: "bg-blue-500/10", label: "In Progress" },
  SUBMITTED: { icon: <FileCode className="h-3 w-3" />, color: "text-yellow-400", bg: "bg-yellow-500/10", label: "Submitted" },
  GRADED: { icon: <CheckCircle2 className="h-3 w-3" />, color: "text-green-400", bg: "bg-green-500/10", label: "Graded" },
  TIMED_OUT: { icon: <AlertTriangle className="h-3 w-3" />, color: "text-red-400", bg: "bg-red-500/10", label: "Timed Out" },
};

export function SubmissionsPanel({ assignmentId, onBack }: Props) {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [grading, setGrading] = useState<string | null>(null);
  const [gradeScore, setGradeScore] = useState("");
  const [gradeFeedback, setGradeFeedback] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await assignmentAPI.getSubmissions(assignmentId);
        setSubmissions(data.submissions);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, [assignmentId]);

  const handleGrade = async (submissionId: string) => {
    const score = parseInt(gradeScore, 10);
    if (isNaN(score) || score < 0) return;

    setSaving(true);
    try {
      await assignmentAPI.gradeSubmission(submissionId, {
        score,
        feedback: gradeFeedback.trim() || undefined,
      });
      // Refresh
      const { data } = await assignmentAPI.getSubmissions(assignmentId);
      setSubmissions(data.submissions);
      setGrading(null);
      setGradeScore("");
      setGradeFeedback("");
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to grade");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-transparent border-t-yellow-500" />
      </div>
    );
  }

  const inputClass = `w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors ${
    isDark
      ? "border-white/[0.08] bg-white/[0.04] text-white placeholder:text-zinc-600 focus:border-yellow-500/40"
      : "border-black/[0.08] bg-black/[0.02] text-black placeholder:text-zinc-400 focus:border-yellow-500/40"
  }`;

  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
          isDark ? "text-zinc-500 hover:text-zinc-300" : "text-zinc-500 hover:text-zinc-700"
        }`}
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back
      </button>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Submissions</h2>
        <p className={`text-sm ${isDark ? "text-zinc-500" : "text-zinc-500"}`}>
          {submissions.length} submission{submissions.length !== 1 ? "s" : ""}
        </p>
      </div>

      {submissions.length === 0 && (
        <div className={`flex flex-col items-center py-16 ${isDark ? "text-zinc-500" : "text-zinc-500"}`}>
          <FileCode className="mb-3 h-8 w-8" />
          <p className="text-sm font-medium">No submissions yet</p>
        </div>
      )}

      <div className="space-y-3">
        {submissions.map((s, i) => {
          const config = statusConfig[s.status] || statusConfig.IN_PROGRESS;

          return (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={`rounded-xl border p-4 ${
                isDark ? "border-white/[0.06] bg-white/[0.02]" : "border-black/[0.06] bg-black/[0.02]"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {s.student.avatar ? (
                    <img src={s.student.avatar} alt="" className="h-8 w-8 rounded-full" />
                  ) : (
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                      isDark ? "bg-white/10" : "bg-black/10"
                    }`}>
                      <User className="h-4 w-4" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium">{s.student.name || s.student.email}</p>
                    <div className="flex items-center gap-2">
                      <span className={`flex items-center gap-1 text-[10px] font-bold uppercase ${config.color}`}>
                        {config.icon} {config.label}
                      </span>
                      {s.submittedAt && (
                        <span className={`text-[10px] ${isDark ? "text-zinc-600" : "text-zinc-400"}`}>
                          {new Date(s.submittedAt).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {s.score != null && (
                    <span className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold ${
                      isDark ? "bg-green-500/10 text-green-400" : "bg-green-50 text-green-600"
                    }`}>
                      <Award className="h-3 w-3" />
                      {s.score}
                    </span>
                  )}

                  {s.workspaceId && (
                    <button
                      onClick={() => navigate(`/workspace/${s.workspaceId}`)}
                      className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                        isDark ? "bg-white/5 text-zinc-300 hover:bg-white/10" : "bg-black/5 text-zinc-600 hover:bg-black/10"
                      }`}
                    >
                      <Eye className="h-3 w-3" /> View Code
                    </button>
                  )}

                  {(s.status === "SUBMITTED" || s.status === "GRADED") && (
                    <button
                      onClick={() => {
                        setGrading(grading === s.id ? null : s.id);
                        setGradeScore(s.score?.toString() || "");
                        setGradeFeedback(s.feedback || "");
                      }}
                      className="flex items-center gap-1 rounded-lg bg-yellow-500/10 px-3 py-1.5 text-xs font-medium text-yellow-500 transition-colors hover:bg-yellow-500/20"
                    >
                      <Award className="h-3 w-3" /> Grade
                    </button>
                  )}
                </div>
              </div>

              {/* Grade form */}
              <AnimatePresence>
                {grading === s.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 overflow-hidden"
                  >
                    <div className={`rounded-lg border p-3 ${
                      isDark ? "border-white/[0.06] bg-white/[0.02]" : "border-black/[0.06] bg-black/[0.01]"
                    }`}>
                      <div className="grid grid-cols-4 gap-3">
                        <div>
                          <label className="mb-1 block text-[10px] font-medium uppercase text-zinc-500">Score</label>
                          <input
                            type="number"
                            value={gradeScore}
                            onChange={(e) => setGradeScore(e.target.value)}
                            min={0}
                            className={inputClass}
                            placeholder="0"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="mb-1 block text-[10px] font-medium uppercase text-zinc-500">Feedback</label>
                          <input
                            value={gradeFeedback}
                            onChange={(e) => setGradeFeedback(e.target.value)}
                            className={inputClass}
                            placeholder="Optional feedback..."
                          />
                        </div>
                        <div className="flex items-end gap-2">
                          <button
                            onClick={() => handleGrade(s.id)}
                            disabled={saving}
                            className="flex h-[38px] items-center gap-1.5 rounded-lg bg-yellow-500 px-4 text-xs font-medium text-black"
                          >
                            <Send className="h-3 w-3" />
                            {saving ? "..." : "Save"}
                          </button>
                          <button
                            onClick={() => setGrading(null)}
                            className={`flex h-[38px] items-center rounded-lg px-2 ${
                              isDark ? "text-zinc-500 hover:text-zinc-300" : "text-zinc-400 hover:text-zinc-600"
                            }`}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
