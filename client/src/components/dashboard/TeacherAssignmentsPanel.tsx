import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Code2,
  Globe,
  Clock,
  Users,
  Trash2,
  Eye,
  Plus,
  Loader2,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { assignmentAPI, classroomAPI, userAPI } from "@/lib/api";
import { useTheme } from "@/contexts/ThemeContext";
import { CreateAssignmentModal } from "./CreateAssignmentModal";
import { SubmissionsPanel } from "./SubmissionsPanel";

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  type: "WEB_DEV" | "DSA";
  difficulty: string;
  deadline: string | null;
  maxMarks: number;
  classroomId: string;
  createdAt: string;
  classroom: { id: string; name: string };
  creator: { id: string; name: string };
  _count: { testCases: number; submissions: number };
}

const difficultyColors: Record<string, { dark: string; light: string }> = {
  EASY: { dark: "text-green-400 bg-green-500/10", light: "text-green-600 bg-green-50" },
  MEDIUM: { dark: "text-yellow-400 bg-yellow-500/10", light: "text-yellow-600 bg-yellow-50" },
  HARD: { dark: "text-red-400 bg-red-500/10", light: "text-red-600 bg-red-50" },
};

export function TeacherAssignmentsPanel() {
  const { isDark } = useTheme();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [createForClassroom, setCreateForClassroom] = useState<string | null>(null);
  const [viewingSubmissions, setViewingSubmissions] = useState<string | null>(null);
  const [classrooms, setClassrooms] = useState<{ id: string; name: string }[]>([]);
  const [pickingClassroom, setPickingClassroom] = useState(false);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const [aRes, cRes] = await Promise.all([
        assignmentAPI.getMyAll().catch(() => userAPI.getAssignments()),
        classroomAPI.getMy(),
      ]);
      setAssignments(aRes.data.assignments || []);
      // Keep classroom selection independent from assignment availability.
      const myClassrooms = (cRes.data.classrooms || [])
        .filter((c: { myRole?: string }) => !c.myRole || c.myRole === "TEACHER")
        .map((c: { id: string; name: string }) => ({
          id: c.id,
          name: c.name,
        }));
      setClassrooms(myClassrooms);
    } catch {
      console.error("Failed to fetch assignments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this assignment? All submissions will be lost.")) return;
    try {
      await assignmentAPI.delete(id);
      setAssignments((prev) => prev.filter((a) => a.id !== id));
    } catch {
      console.error("Failed to delete");
    }
  };

  if (viewingSubmissions) {
    return (
      <div>
        <button
          onClick={() => setViewingSubmissions(null)}
          className={`mb-4 flex items-center gap-1 text-sm font-medium transition-colors ${isDark ? "text-zinc-400 hover:text-zinc-200" : "text-zinc-500 hover:text-zinc-800"
            }`}
        >
          ← Back to assignments
        </button>
        <SubmissionsPanel assignmentId={viewingSubmissions} onBack={() => setViewingSubmissions(null)} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-yellow-500" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <p className={`text-sm ${isDark ? "text-zinc-500" : "text-zinc-500"}`}>
          {assignments.length} assignment{assignments.length !== 1 ? "s" : ""} across {classrooms.length} classroom{classrooms.length !== 1 ? "s" : ""}
        </p>
        <button
          onClick={() => setPickingClassroom(true)}
          className="flex items-center gap-2 rounded-lg bg-yellow-500 px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-yellow-400"
        >
          <Plus className="h-4 w-4" />
          New Assignment
        </button>
      </div>

      {assignments.length === 0 ? (
        <div className={`flex flex-col items-center justify-center rounded-2xl border py-16 ${isDark ? "border-white/[0.06] bg-white/[0.02]" : "border-black/[0.06] bg-black/[0.02]"
          }`}>
          <AlertTriangle className={`mb-3 h-8 w-8 ${isDark ? "text-zinc-600" : "text-zinc-400"}`} />
          <p className="text-sm font-medium">No assignments yet</p>
          <p className={`mt-1 text-sm ${isDark ? "text-zinc-500" : "text-zinc-500"}`}>
            Create an assignment inside a classroom to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {assignments.map((a, i) => {
              const diff = difficultyColors[a.difficulty] || difficultyColors.MEDIUM;
              const isOverdue = a.deadline && new Date(a.deadline) < new Date();
              return (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ delay: i * 0.04 }}
                  className={`group rounded-xl border p-4 transition-colors ${isDark
                      ? "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]"
                      : "border-black/[0.06] bg-white hover:bg-zinc-50"
                    }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg ${a.type === "DSA"
                          ? isDark ? "bg-purple-500/10 text-purple-400" : "bg-purple-50 text-purple-600"
                          : isDark ? "bg-blue-500/10 text-blue-400" : "bg-blue-50 text-blue-600"
                        }`}>
                        {a.type === "DSA" ? <Code2 className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold">{a.title}</h3>
                        <p className={`mt-0.5 text-xs ${isDark ? "text-zinc-500" : "text-zinc-500"}`}>
                          {a.classroom.name}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${isDark ? diff.dark : diff.light}`}>
                            {a.difficulty}
                          </span>
                          <span className={`text-xs ${isDark ? "text-zinc-600" : "text-zinc-400"}`}>
                            {a.type === "DSA" ? "DSA" : "Web Dev"}
                          </span>
                          {a.deadline && (
                            <span className={`flex items-center gap-1 text-xs ${isOverdue
                                ? "text-red-400"
                                : isDark ? "text-zinc-500" : "text-zinc-500"
                              }`}>
                              <Clock className="h-3 w-3" />
                              {new Date(a.deadline).toLocaleDateString()}
                            </span>
                          )}
                          <span className={`flex items-center gap-1 text-xs ${isDark ? "text-zinc-500" : "text-zinc-500"}`}>
                            <Users className="h-3 w-3" />
                            {a._count.submissions} submission{a._count.submissions !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setViewingSubmissions(a.id)}
                        className={`rounded-lg p-2 text-xs transition-colors ${isDark ? "hover:bg-white/5 text-zinc-500 hover:text-zinc-300" : "hover:bg-black/5 text-zinc-400 hover:text-zinc-700"
                          }`}
                        title="View submissions"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(a.id)}
                        className={`rounded-lg p-2 text-xs transition-colors ${isDark ? "hover:bg-red-500/10 text-zinc-500 hover:text-red-400" : "hover:bg-red-50 text-zinc-400 hover:text-red-500"
                          }`}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <ChevronRight className={`h-4 w-4 ${isDark ? "text-zinc-700" : "text-zinc-300"}`} />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {pickingClassroom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setPickingClassroom(false)}>
          <div
            className={`w-full max-w-sm rounded-2xl border p-6 shadow-xl ${isDark ? "border-white/10 bg-zinc-900" : "border-black/10 bg-white"
              }`}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-4 text-base font-semibold">Select a classroom</h3>
            {classrooms.length === 0 ? (
              <p className={`text-sm ${isDark ? "text-zinc-500" : "text-zinc-500"}`}>
                Create a classroom first to add assignments.
              </p>
            ) : (
              <div className="space-y-2">
                {classrooms.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => { setPickingClassroom(false); setCreateForClassroom(c.id); }}
                    className={`w-full rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors ${isDark
                        ? "border-white/[0.06] hover:bg-white/[0.04]"
                        : "border-black/[0.06] hover:bg-zinc-50"
                      }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={() => setPickingClassroom(false)}
              className={`mt-4 w-full rounded-lg px-4 py-2 text-sm transition-colors ${isDark ? "bg-white/5 hover:bg-white/10" : "bg-black/5 hover:bg-black/10"
                }`}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {createForClassroom && (
        <CreateAssignmentModal
          classroomId={createForClassroom}
          open={true}
          onClose={() => setCreateForClassroom(null)}
          onCreated={() => { setCreateForClassroom(null); fetchAssignments(); }}
        />
      )}
    </div>
  );
}
