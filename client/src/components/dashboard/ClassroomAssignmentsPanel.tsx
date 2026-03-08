import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { assignmentAPI } from "@/lib/api";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { CreateAssignmentModal } from "./CreateAssignmentModal";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Code2,
  Globe,
  Clock,
  Calendar,
  Trophy,
  ChevronRight,
  Play,
  CheckCircle2,
  AlertCircle,
  FileCode,
  Users,
  Trash2,
  Eye,
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
  aiAllowed: boolean;
  createdAt: string;
  creator: { id: string; name: string | null; avatar: string | null };
  _count: { testCases: number; submissions: number };
  mySubmission?: {
    id: string;
    status: string;
    score: number | null;
    workspaceId: string | null;
    startedAt: string;
    submittedAt: string | null;
  } | null;
}

interface Props {
  classroomId: string;
  isTeacher: boolean;
}

const difficultyColors: Record<string, { dark: string; light: string; bg: string }> = {
  EASY: { dark: "text-green-400", light: "text-green-600", bg: "bg-green-500/10" },
  MEDIUM: { dark: "text-yellow-400", light: "text-yellow-600", bg: "bg-yellow-500/10" },
  HARD: { dark: "text-red-400", light: "text-red-600", bg: "bg-red-500/10" },
};

const statusLabels: Record<string, { label: string; color: string; bg: string }> = {
  IN_PROGRESS: { label: "In Progress", color: "text-blue-400", bg: "bg-blue-500/10" },
  SUBMITTED: { label: "Submitted", color: "text-yellow-400", bg: "bg-yellow-500/10" },
  GRADED: { label: "Graded", color: "text-green-400", bg: "bg-green-500/10" },
  TIMED_OUT: { label: "Timed Out", color: "text-red-400", bg: "bg-red-500/10" },
};

export function ClassroomAssignmentsPanel({ classroomId, isTeacher }: Props) {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [starting, setStarting] = useState<string | null>(null);

  const fetchAssignments = useCallback(async () => {
    try {
      const { data } = await assignmentAPI.getForClassroom(classroomId);
      setAssignments(data.assignments);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [classroomId]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  const handleStart = async (assignmentId: string) => {
    setStarting(assignmentId);
    try {
      const { data } = await assignmentAPI.start(assignmentId);
      if (data.workspaceId) {
        navigate(`/workspace/${data.workspaceId}`);
      } else if (data.submission?.workspaceId) {
        navigate(`/workspace/${data.submission.workspaceId}`);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to start assignment");
    } finally {
      setStarting(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this assignment? All submissions will be lost.")) return;
    try {
      await assignmentAPI.delete(id);
      fetchAssignments();
    } catch {
      // ignore
    }
  };

  const handleViewSubmissions = (assignmentId: string) => {
    navigate(`/teacher-dashboard?view=submissions&assignmentId=${assignmentId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-transparent border-t-yellow-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className={`text-sm ${isDark ? "text-zinc-500" : "text-zinc-500"}`}>
          {assignments.length} assignment{assignments.length !== 1 ? "s" : ""}
        </p>
        {isTeacher && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-lg bg-yellow-500/10 px-4 py-2 text-sm font-medium text-yellow-500 transition-colors hover:bg-yellow-500/20"
          >
            <Plus className="h-4 w-4" />
            New Assignment
          </button>
        )}
      </div>

      {/* Create modal */}
      <AnimatePresence>
        {showCreate && (
          <CreateAssignmentModal
            classroomId={classroomId}
            open={showCreate}
            onClose={() => setShowCreate(false)}
            onCreated={() => {
              setShowCreate(false);
              fetchAssignments();
            }}
          />
        )}
      </AnimatePresence>

      {/* Empty state */}
      {assignments.length === 0 && (
        <div className={`flex flex-col items-center justify-center rounded-2xl border py-16 ${
          isDark ? "border-white/[0.06] bg-white/[0.02]" : "border-black/[0.06] bg-black/[0.02]"
        }`}>
          <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${isDark ? "bg-white/5" : "bg-black/5"}`}>
            <FileCode className={`h-7 w-7 ${isDark ? "text-zinc-600" : "text-zinc-400"}`} />
          </div>
          <h3 className="text-base font-semibold">No assignments yet</h3>
          <p className={`mt-1.5 max-w-sm text-center text-sm ${isDark ? "text-zinc-500" : "text-zinc-500"}`}>
            {isTeacher ? "Create your first assignment for this classroom." : "Your teacher hasn't created any assignments yet."}
          </p>
        </div>
      )}

      {/* Assignment list */}
      <div className="space-y-3">
        {assignments.map((a, i) => {
          const diff = difficultyColors[a.difficulty] || difficultyColors.MEDIUM;
          const submission = a.mySubmission;
          const subStatus = submission ? statusLabels[submission.status] || statusLabels.IN_PROGRESS : null;
          const isExpired = a.deadline && new Date(a.deadline) < new Date();

          return (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={`group rounded-xl border p-5 transition-all ${
                isDark
                  ? "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]"
                  : "border-black/[0.06] bg-black/[0.02] hover:border-black/[0.12]"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    a.type === "DSA"
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
                    <h3 className="text-sm font-semibold tracking-tight">{a.title}</h3>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${diff.bg} ${isDark ? diff.dark : diff.light}`}>
                        {a.difficulty}
                      </span>
                      <span className={`text-[10px] ${isDark ? "text-zinc-600" : "text-zinc-400"}`}>
                        {a.type === "DSA" ? `DSA · ${a.language?.toUpperCase() || "C++"}` : `Web · ${a.template || "React"}`}
                      </span>
                      {a.timeLimit && (
                        <span className={`flex items-center gap-0.5 text-[10px] ${isDark ? "text-zinc-600" : "text-zinc-400"}`}>
                          <Clock className="h-2.5 w-2.5" /> {a.timeLimit}min
                        </span>
                      )}
                      {a.deadline && (
                        <span className={`flex items-center gap-0.5 text-[10px] ${
                          isExpired
                            ? "text-red-400"
                            : isDark ? "text-zinc-600" : "text-zinc-400"
                        }`}>
                          <Calendar className="h-2.5 w-2.5" />
                          {new Date(a.deadline).toLocaleDateString()}
                        </span>
                      )}
                      <span className={`text-[10px] ${isDark ? "text-zinc-600" : "text-zinc-400"}`}>
                        <Trophy className="mr-0.5 inline h-2.5 w-2.5" />{a.maxMarks} pts
                      </span>
                    </div>
                    {a.description && (
                      <p className={`mt-1.5 text-xs line-clamp-2 ${isDark ? "text-zinc-500" : "text-zinc-500"}`}>
                        {a.description.replace(/[#*`]/g, "").slice(0, 150)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Teacher actions */}
                  {isTeacher && (
                    <>
                      <button
                        onClick={() => handleViewSubmissions(a.id)}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                          isDark ? "bg-white/5 text-zinc-300 hover:bg-white/10" : "bg-black/5 text-zinc-600 hover:bg-black/10"
                        }`}
                      >
                        <Users className="h-3 w-3" />
                        {a._count.submissions}
                      </button>
                      <button
                        onClick={() => handleDelete(a.id)}
                        className="rounded-lg p-1.5 text-red-400 transition-colors hover:bg-red-500/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}

                  {/* Student actions */}
                  {!isTeacher && (
                    <>
                      {subStatus && (
                        <span className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase ${subStatus.bg} ${subStatus.color}`}>
                          {submission?.status === "GRADED" ? (
                            <>{submission.score}/{a.maxMarks}</>
                          ) : (
                            subStatus.label
                          )}
                        </span>
                      )}

                      {!submission ? (
                        <button
                          onClick={() => handleStart(a.id)}
                          disabled={starting === a.id || !!isExpired}
                          className="flex items-center gap-1.5 rounded-lg bg-yellow-500 px-4 py-1.5 text-xs font-medium text-black transition-opacity hover:opacity-90 disabled:opacity-50"
                        >
                          {starting === a.id ? (
                            <div className="h-3 w-3 animate-spin rounded-full border-2 border-black/30 border-t-black" />
                          ) : (
                            <Play className="h-3 w-3" />
                          )}
                          Start
                        </button>
                      ) : submission.status === "IN_PROGRESS" ? (
                        <button
                          onClick={() => navigate(`/workspace/${submission.workspaceId}`)}
                          className="flex items-center gap-1.5 rounded-lg bg-yellow-500 px-4 py-1.5 text-xs font-medium text-black transition-opacity hover:opacity-90"
                        >
                          <ChevronRight className="h-3 w-3" />
                          Continue
                        </button>
                      ) : null}
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
