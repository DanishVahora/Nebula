import { useEffect, useState } from "react";
import { assignmentAPI } from "@/lib/api";
import { useTheme } from "@/contexts/ThemeContext";
import { ExternalLink, PencilLine } from "lucide-react";

interface Props {
  assignmentId: string;
  onOpenWorkspace: (workspaceId: string) => void;
}

export function TeacherSubmissionViewer({ assignmentId, onOpenWorkspace }: Props) {
  const { isDark } = useTheme();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await assignmentAPI.getSubmissions(assignmentId);
      setSubmissions(data.submissions || []);
    } catch {
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [assignmentId]);

  const handleGrade = async (submissionId: string) => {
    const scoreValue = window.prompt("Enter score");
    if (scoreValue == null) return;
    const score = Number(scoreValue);
    if (!Number.isFinite(score) || score < 0) return;

    await assignmentAPI.gradeSubmission(submissionId, { score });
    load();
  };

  const handleViewDeployment = async (submissionId: string) => {
    const { data } = await assignmentAPI.getSubmissionDeployment(submissionId);
    if (data?.deploymentUrl) {
      window.open(data.deploymentUrl, "_blank", "noopener,noreferrer");
    }
  };

  if (loading) {
    return <div className="py-10 text-center text-xs text-zinc-500">Loading submissions...</div>;
  }

  if (submissions.length === 0) {
    return <div className="py-10 text-center text-xs text-zinc-500">No submissions yet.</div>;
  }

  return (
    <div className="space-y-3">
      {submissions.map((submission) => (
        <div
          key={submission.id}
          className={`rounded-xl border p-4 ${
            isDark ? "border-white/8 bg-white/3" : "border-black/8 bg-black/2"
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h5 className="text-sm font-semibold">{submission.user?.name || submission.user?.email || "Student"}</h5>
              <p className={`mt-1 text-xs ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>
                Submitted: {submission.submittedAt ? new Date(submission.submittedAt).toLocaleString() : "Not submitted"}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="rounded bg-blue-500/15 px-2 py-1 text-blue-300">{submission.status}</span>
              <span className="rounded bg-emerald-500/15 px-2 py-1 text-emerald-300">
                Score: {typeof submission.score === "number" ? submission.score : "-"}
              </span>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              disabled={!submission.workspaceId}
              onClick={() => submission.workspaceId && onOpenWorkspace(submission.workspaceId)}
              className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-zinc-200 disabled:opacity-50"
            >
              View Code
            </button>
            <button
              onClick={() => handleViewDeployment(submission.id)}
              className="inline-flex items-center gap-1 rounded-lg bg-blue-500/20 px-3 py-1.5 text-xs font-medium text-blue-300"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              View Deployment
            </button>
            <button
              onClick={() => handleGrade(submission.id)}
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-medium text-emerald-300"
            >
              <PencilLine className="h-3.5 w-3.5" />
              Grade
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
