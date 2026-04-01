import { useCallback, useEffect, useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { assignmentAPI } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";
import { AssignmentCard } from "./AssignmentCard";
import type { AssignmentListItem } from "./AssignmentCard";
import { CreateAssignmentModal } from "./CreateAssignmentModal";
import { AssignmentDetailView } from "./AssignmentDetailView";

interface Props {
  classroomId: string;
  isTeacher: boolean;
}

export function AssignmentsPanel({ classroomId, isTeacher }: Props) {
  const { isDark } = useTheme();
  const [assignments, setAssignments] = useState<AssignmentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const fetchAssignments = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await assignmentAPI.getForClassroom(classroomId);
      setAssignments(data.assignments || []);
    } catch {
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  }, [classroomId]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  const handleStart = async (id: string) => {
    setStartingId(id);
    try {
      await assignmentAPI.start(id);
      await fetchAssignments();
      setSelectedId(id);
    } catch {
      // If start API fails (e.g. already started), still open details so the student can continue.
      setSelectedId(id);
    } finally {
      setStartingId(null);
    }
  };

  if (selectedId) {
    return (
      <AssignmentDetailView
        assignmentId={selectedId}
        isTeacher={isTeacher}
        onBack={() => setSelectedId(null)}
        onStarted={fetchAssignments}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-14">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-transparent border-t-yellow-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className={`text-sm ${isDark ? "text-zinc-500" : "text-zinc-600"}`}>
          {assignments.length} assignment{assignments.length === 1 ? "" : "s"}
        </p>
        {isTeacher && (
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-yellow-500/10 px-4 py-2 text-sm font-medium text-yellow-500 hover:bg-yellow-500/20"
          >
            <Plus className="h-4 w-4" />
            Create Assignment
          </button>
        )}
      </div>

      <AnimatePresence>
        {showCreate && (
          <CreateAssignmentModal
            open={showCreate}
            classroomId={classroomId}
            onClose={() => setShowCreate(false)}
            onCreated={fetchAssignments}
          />
        )}
      </AnimatePresence>

      {assignments.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-xl border p-8 text-center ${
            isDark ? "border-white/8 bg-white/3" : "border-black/8 bg-black/2"
          }`}
        >
          <h4 className="text-sm font-semibold">No assignments yet</h4>
          <p className={`mt-1 text-xs ${isDark ? "text-zinc-500" : "text-zinc-600"}`}>
            {isTeacher ? "Create your first assignment for this classroom." : "Your teacher has not created assignments yet."}
          </p>
        </motion.div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {assignments.map((assignment) => (
            <AssignmentCard
              key={assignment.id}
              assignment={assignment}
              isTeacher={isTeacher}
              onOpen={setSelectedId}
              onStart={handleStart}
              starting={startingId === assignment.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
