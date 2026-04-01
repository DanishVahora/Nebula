import { useTheme } from "@/contexts/ThemeContext";
import { CheckCircle2, Clock3, ExternalLink, Rocket, Send } from "lucide-react";

interface SubmissionLike {
  id: string;
  status: string;
  submittedAt?: string | null;
  score?: number | null;
  workspaceId?: string | null;
  deploymentUrl?: string | null;
}

interface Props {
  submission: SubmissionLike | null;
  starting?: boolean;
  submitting?: boolean;
  onStart: () => void;
  onOpenWorkspace: () => void;
  onSubmit: () => void;
  onViewDeployment: () => void;
}

export function SubmissionStatusCard({
  submission,
  starting,
  submitting,
  onStart,
  onOpenWorkspace,
  onSubmit,
  onViewDeployment,
}: Props) {
  const { isDark } = useTheme();
  const hasStarted = !!submission;
  const canOpenWorkspace = !!submission?.workspaceId;
  const canSubmit = submission?.status === "IN_PROGRESS";

  return (
    <div
      className={`rounded-xl border p-4 ${
        isDark ? "border-white/8 bg-white/3" : "border-black/8 bg-black/2"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold">Submission Status</h4>
        <span
          className={`rounded px-2 py-1 text-[10px] font-semibold ${
            submission?.status === "GRADED"
              ? "bg-emerald-500/15 text-emerald-400"
              : submission?.status === "SUBMITTED"
              ? "bg-blue-500/15 text-blue-400"
              : submission?.status === "IN_PROGRESS"
              ? "bg-amber-500/15 text-amber-400"
              : "bg-zinc-500/15 text-zinc-400"
          }`}
        >
          {submission?.status || "NOT_STARTED"}
        </span>
      </div>

      {hasStarted ? (
        <div className={`mt-2 space-y-1 text-xs ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>
          <div className="flex items-center gap-1.5">
            <Clock3 className="h-3.5 w-3.5" />
            Started in Orbit workspace
          </div>
          {submission?.submittedAt && (
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Submitted {new Date(submission.submittedAt).toLocaleString()}
            </div>
          )}
          {typeof submission?.score === "number" && <div>Score: {submission.score}</div>}
        </div>
      ) : (
        <p className={`mt-2 text-xs ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>
          Start the assignment to create your isolated web development workspace.
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {!hasStarted && (
          <button
            onClick={onStart}
            disabled={!!starting}
            className="inline-flex items-center gap-1.5 rounded-lg bg-yellow-400 px-3 py-2 text-xs font-semibold text-black disabled:opacity-50"
          >
            <Rocket className="h-3.5 w-3.5" />
            {starting ? "Starting..." : "Start Assignment"}
          </button>
        )}

        {canOpenWorkspace && (
          <button
            onClick={onOpenWorkspace}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-white/15"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open Workspace
          </button>
        )}

        {canSubmit && (
          <button
            onClick={onSubmit}
            disabled={!!submitting}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-black disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
            {submitting ? "Submitting..." : "Submit Assignment"}
          </button>
        )}

        {submission?.deploymentUrl && (
          <button
            onClick={onViewDeployment}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-500/20 px-3 py-2 text-xs font-semibold text-blue-300 hover:bg-blue-500/30"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            View Deployment
          </button>
        )}
      </div>
    </div>
  );
}
