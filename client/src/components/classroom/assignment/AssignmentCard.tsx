import { motion } from "framer-motion";
import { useTheme } from "@/contexts/ThemeContext";
import { Calendar, FileCode, Play, PencilRuler } from "lucide-react";

export interface AssignmentListItem {
  id: string;
  title: string;
  description: string | null;
  type: "WEB_DEV" | "DSA";
  difficulty: "EASY" | "MEDIUM" | "HARD";
  deadline: string | null;
  mySubmission?: { status: string } | null;
}

interface Props {
  assignment: AssignmentListItem;
  isTeacher: boolean;
  onOpen: (id: string) => void;
  onStart: (id: string) => void;
  starting?: boolean;
}

export function AssignmentCard({ assignment, isTeacher, onOpen, onStart, starting = false }: Props) {
  const { isDark } = useTheme();
  const status = assignment.mySubmission?.status || "NOT_STARTED";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border p-4 ${
        isDark ? "border-white/8 bg-white/3" : "border-black/8 bg-black/2"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="truncate text-sm font-semibold tracking-tight">{assignment.title}</h4>
          {assignment.description && (
            <p className={`mt-1 line-clamp-2 text-xs ${isDark ? "text-zinc-500" : "text-zinc-600"}`}>
              {assignment.description}
            </p>
          )}
        </div>
        <span className={`rounded px-2 py-1 text-[10px] font-semibold ${
          assignment.difficulty === "EASY"
            ? "bg-green-500/10 text-green-400"
            : assignment.difficulty === "HARD"
            ? "bg-red-500/10 text-red-400"
            : "bg-yellow-500/10 text-yellow-400"
        }`}>
          {assignment.difficulty}
        </span>
      </div>

      <div className={`mt-3 flex flex-wrap items-center gap-3 text-[11px] ${isDark ? "text-zinc-500" : "text-zinc-600"}`}>
        <span className="inline-flex items-center gap-1">
          <FileCode className="h-3.5 w-3.5" />
          {assignment.type}
        </span>
        <span className="inline-flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5" />
          {assignment.deadline ? new Date(assignment.deadline).toLocaleDateString() : "No deadline"}
        </span>
        {!isTeacher && (
          <span className="rounded bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-400">
            {status}
          </span>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <button
          onClick={() => onOpen(assignment.id)}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
            isDark ? "bg-white/6 text-zinc-200 hover:bg-white/10" : "bg-black/6 text-zinc-700 hover:bg-black/10"
          }`}
        >
          View Details
        </button>

        {isTeacher ? (
          <span className="inline-flex items-center gap-1 text-xs text-yellow-400">
            <PencilRuler className="h-3.5 w-3.5" />
            Teacher Mode
          </span>
        ) : (
          <button
            onClick={() => onStart(assignment.id)}
            disabled={starting}
            className="inline-flex items-center gap-1 rounded-lg bg-green-500 px-3 py-1.5 text-xs font-semibold text-black hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Play className="h-3.5 w-3.5" />
            {starting ? "Starting..." : "Start Assignment"}
          </button>
        )}
      </div>
    </motion.div>
  );
}
