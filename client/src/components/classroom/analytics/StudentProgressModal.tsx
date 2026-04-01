import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { classroomAPI } from "@/lib/api";

interface Student {
  id: string;
  name?: string | null;
  email?: string | null;
}

interface ProgressRow {
  assignmentId: string;
  assignmentTitle: string;
  score: number | null;
  status: string;
  submittedAt: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  classroomId: string;
  student: Student | null;
}

export function StudentProgressModal({ open, onClose, classroomId, student }: Props) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<ProgressRow[]>([]);

  useEffect(() => {
    if (!open || !student) return;

    let active = true;
    setLoading(true);

    (async () => {
      try {
        const { data } = await classroomAPI.getStudentProgress(classroomId, student.id);
        if (!active) return;
        setProgress(data.progress || []);
      } catch {
        if (!active) return;
        setProgress([]);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [open, student, classroomId]);

  return (
    <AnimatePresence>
      {open && student && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="w-full max-w-4xl rounded-2xl border border-white/[0.08] bg-zinc-950 p-5"
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-zinc-100">Student Progress</h3>
                <p className="text-xs text-zinc-500">{student.name || student.email || "Student"}</p>
              </div>
              <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-10">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-transparent border-t-yellow-500" />
              </div>
            ) : progress.length === 0 ? (
              <p className="py-8 text-center text-sm text-zinc-500">No progress data available.</p>
            ) : (
              <div className="max-h-[60vh] overflow-auto rounded-lg border border-white/[0.06]">
                <table className="w-full min-w-[700px] border-collapse">
                  <thead>
                    <tr className="border-b border-white/[0.06] bg-white/[0.02] text-left text-[11px] uppercase tracking-wide text-zinc-500">
                      <th className="px-3 py-2">Assignment</th>
                      <th className="px-3 py-2">Score</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Submission Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {progress.map((row) => (
                      <tr key={row.assignmentId} className="border-b border-white/[0.04] last:border-b-0">
                        <td className="px-3 py-3 text-sm text-zinc-100">{row.assignmentTitle}</td>
                        <td className="px-3 py-3 text-sm text-zinc-300">{row.score ?? "-"}</td>
                        <td className="px-3 py-3 text-sm text-zinc-300">{row.status}</td>
                        <td className="px-3 py-3 text-sm text-zinc-400">
                          {row.submittedAt ? new Date(row.submittedAt).toLocaleString() : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
