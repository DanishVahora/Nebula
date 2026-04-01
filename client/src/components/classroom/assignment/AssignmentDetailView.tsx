import { useEffect, useState } from "react";
import { assignmentAPI } from "@/lib/api";
import { useTheme } from "@/contexts/ThemeContext";
import { ArrowLeft } from "lucide-react";
import { WebDevAssignmentView } from "./WebDevAssignmentView";
import { DSAPlayground } from "@/components/classroom/dsa/DSAPlayground";

interface Props {
  assignmentId: string;
  isTeacher: boolean;
  onBack: () => void;
  onStarted: () => void;
}

export function AssignmentDetailView({ assignmentId, isTeacher, onBack, onStarted }: Props) {
  const { isDark } = useTheme();
  const [assignment, setAssignment] = useState<any>(null);
  const [mySubmission, setMySubmission] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchAssignment = async () => {
    const { data } = await assignmentAPI.getOne(assignmentId);
    setAssignment(data.assignment);
    setMySubmission(data.mySubmission || null);
  };

  useEffect(() => {
    (async () => {
      try {
        await fetchAssignment();
      } finally {
        setLoading(false);
      }
    })();
  }, [assignmentId]);

  if (loading) {
    return <div className="py-12 text-center text-sm text-zinc-500">Loading assignment...</div>;
  }

  if (!assignment) {
    return <div className="py-12 text-center text-sm text-zinc-500">Assignment not found.</div>;
  }

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to assignments
      </button>

      <div className={`rounded-xl border p-5 ${isDark ? "border-white/8 bg-white/3" : "border-black/8 bg-black/2"}`}>
        <h3 className="text-lg font-semibold tracking-tight">{assignment.title}</h3>
        <p className={`mt-1 text-xs ${isDark ? "text-zinc-500" : "text-zinc-600"}`}>
          {assignment.type} • {assignment.difficulty} • Max {assignment.maxMarks} marks
        </p>

        {assignment.description && (
          <p className={`mt-3 text-sm ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>{assignment.description}</p>
        )}

        <div className={`mt-4 text-xs ${isDark ? "text-zinc-500" : "text-zinc-600"}`}>
          Deadline: {assignment.deadline ? new Date(assignment.deadline).toLocaleString() : "No deadline"}
        </div>

      </div>

      {assignment.type === "WEB_DEV" && (
        <WebDevAssignmentView
          assignment={assignment}
          mySubmission={mySubmission}
          isTeacher={isTeacher}
          onRefresh={async () => {
            await fetchAssignment();
            onStarted();
          }}
        />
      )}

      {assignment.type === "DSA" && !isTeacher && (
        <DSAPlayground
          assignment={assignment}
          mySubmission={mySubmission}
          onRefresh={fetchAssignment}
        />
      )}

      {assignment.type === "DSA" && isTeacher && (
        <div className={`rounded-xl border p-4 text-sm ${isDark ? "border-white/8 bg-white/3 text-zinc-300" : "border-black/8 bg-black/2 text-zinc-700"}`}>
          Students get the full DSA playground for this assignment. Use the submissions view to review attempts.
        </div>
      )}
    </div>
  );
}
