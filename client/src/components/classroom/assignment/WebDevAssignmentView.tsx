import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { assignmentAPI } from "@/lib/api";
import { useTheme } from "@/contexts/ThemeContext";
import { AssignmentInstructions } from "./AssignmentInstructions";
import { SubmissionStatusCard } from "./SubmissionStatusCard";
import { TeacherSubmissionViewer } from "./TeacherSubmissionViewer";

interface Props {
  assignment: any;
  mySubmission: any;
  isTeacher: boolean;
  onRefresh: () => void;
}

export function WebDevAssignmentView({ assignment, mySubmission, isTeacher, onRefresh }: Props) {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const config = assignment.assignmentConfig || {};

  const openWorkspace = (workspaceId?: string | null, submissionId?: string | null) => {
    if (!workspaceId) return;
    const qs = new URLSearchParams({
      assignmentMode: "webdev",
      assignmentId: assignment.id,
    });
    if (submissionId) qs.set("submissionId", submissionId);
    navigate(`/workspace/${workspaceId}?${qs.toString()}`);
  };

  const handleStart = async () => {
    setStarting(true);
    try {
      const { data } = await assignmentAPI.start(assignment.id);
      onRefresh();
      const workspaceId = data?.submission?.workspaceId || data?.workspace?.id;
      const submissionId = data?.submission?.id;
      if (workspaceId) openWorkspace(workspaceId, submissionId);
    } finally {
      setStarting(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await assignmentAPI.submit(assignment.id);
      onRefresh();
    } finally {
      setSubmitting(false);
    }
  };

  if (isTeacher) {
    return (
      <div className="space-y-4">
        <div className={`rounded-xl border p-4 ${isDark ? "border-white/8 bg-white/3" : "border-black/8 bg-black/2"}`}>
          <h4 className="text-sm font-semibold">Teacher Submission Viewer</h4>
          <p className={`mt-1 text-xs ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>
            Review student submissions, open code, preview deployment, and assign grades.
          </p>
        </div>
        <TeacherSubmissionViewer assignmentId={assignment.id} onOpenWorkspace={(workspaceId) => openWorkspace(workspaceId)} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AssignmentInstructions
        instructions={config.instructions || assignment.description}
        referenceImages={Array.isArray(config.referenceImages) ? config.referenceImages : []}
      />

      <SubmissionStatusCard
        submission={mySubmission}
        starting={starting}
        submitting={submitting}
        onStart={handleStart}
        onOpenWorkspace={() => openWorkspace(mySubmission?.workspaceId, mySubmission?.id)}
        onSubmit={handleSubmit}
        onViewDeployment={() => mySubmission?.deploymentUrl && window.open(mySubmission.deploymentUrl, "_blank", "noopener,noreferrer")}
      />
    </div>
  );
}
