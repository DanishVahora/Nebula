import { useState, useEffect } from "react";
import { classroomAPI } from "@/lib/api";
import { useTheme } from "@/contexts/ThemeContext";
import { BlogsPanel } from "@/components/classroom/BlogsPanel";
import { AssignmentsPanel } from "@/components/classroom/assignment/AssignmentsPanel";
import { AnalyticsOverview } from "@/components/classroom/analytics/AnalyticsOverview";
import { LeaderboardPanel } from "@/components/classroom/analytics/LeaderboardPanel";
import { StudentProgressModal } from "@/components/classroom/analytics/StudentProgressModal";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  School,
  Users,
  Copy,
  Check,
  FileCode,
  LayoutDashboard,
  Trophy,
  Newspaper,
} from "lucide-react";

interface Props {
  classroomId: string;
  onBack: () => void;
}

interface ClassroomDetail {
  id: string;
  name: string;
  description: string | null;
  joinCode?: string;
  myRole: string;
  teacher: { id: string; name: string | null; avatar: string | null; email: string };
  memberCount: number;
}

export function ClassroomDetailView({ classroomId, onBack }: Props) {
  const { isDark } = useTheme();
  const [classroom, setClassroom] = useState<ClassroomDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<{
    id: string;
    name: string | null;
    email: string;
  } | null>(null);
  const [tab, setTab] = useState<"overview" | "blogs" | "assignments" | "leaderboard" | "students">("overview");

  useEffect(() => {
    (async () => {
      try {
        const { data } = await classroomAPI.getOne(classroomId);
        setClassroom(data.classroom);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, [classroomId]);

  const copyCode = () => {
    if (!classroom?.joinCode) return;
    navigator.clipboard.writeText(classroom.joinCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-transparent border-t-yellow-500" />
      </div>
    );
  }

  if (!classroom) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-zinc-500">Classroom not found.</p>
        <button onClick={onBack} className="mt-4 text-sm text-yellow-500 hover:underline">Go back</button>
      </div>
    );
  }

  const isTeacher = classroom.myRole === "TEACHER";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      {/* Back + Header */}
      <div>
        <button
          onClick={onBack}
          className={`mb-3 flex items-center gap-1.5 text-xs font-medium transition-colors ${
            isDark ? "text-zinc-500 hover:text-zinc-300" : "text-zinc-500 hover:text-zinc-700"
          }`}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to classrooms
        </button>

        <div className={`rounded-xl border p-5 ${
          isDark ? "border-white/[0.06] bg-white/[0.02]" : "border-black/[0.06] bg-black/[0.02]"
        }`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${isDark ? "bg-yellow-500/10" : "bg-yellow-50"}`}>
                <School className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">{classroom.name}</h2>
                {classroom.description && (
                  <p className={`mt-0.5 text-xs ${isDark ? "text-zinc-500" : "text-zinc-500"}`}>{classroom.description}</p>
                )}
              </div>
            </div>

            {isTeacher && classroom.joinCode && (
              <button
                onClick={copyCode}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-mono font-medium transition-colors ${
                  isDark
                    ? "border-white/[0.08] bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08]"
                    : "border-black/[0.08] bg-black/[0.02] text-zinc-600 hover:bg-black/[0.06]"
                }`}
              >
                {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
                {classroom.joinCode}
              </button>
            )}
          </div>

          <div className="mt-3 flex items-center gap-4">
            <span className={`flex items-center gap-1 text-xs ${isDark ? "text-zinc-500" : "text-zinc-500"}`}>
              <Users className="h-3 w-3" /> {classroom.memberCount} members
            </span>
            <span className={`text-xs ${isDark ? "text-zinc-600" : "text-zinc-400"}`}>
              Teacher: {classroom.teacher.name || classroom.teacher.email}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1">
        {(["overview", "blogs", "assignments", "leaderboard", "students"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium transition-colors ${
              tab === t
                ? isDark
                  ? "bg-yellow-500/10 text-yellow-400"
                  : "bg-yellow-50 text-yellow-600"
                : isDark
                ? "text-zinc-500 hover:text-zinc-300"
                : "text-zinc-500 hover:text-zinc-700"
            }`}
          >
            {t === "overview" && <LayoutDashboard className="h-3 w-3" />}
            {t === "blogs" && <Newspaper className="h-3 w-3" />}
            {t === "assignments" && <FileCode className="h-3 w-3" />}
            {t === "leaderboard" && <Trophy className="h-3 w-3" />}
            {t === "students" && <Users className="h-3 w-3" />}
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "overview" && (
        <AnalyticsOverview classroomId={classroomId} />
      )}

      {tab === "students" && (
        <MembersList classroomId={classroomId} isTeacher={isTeacher} onStudentClick={setSelectedStudent} />
      )}

      {tab === "blogs" && (
        <BlogsPanel classroomId={classroomId} isTeacher={isTeacher} />
      )}

      {tab === "assignments" && (
        <AssignmentsPanel classroomId={classroomId} isTeacher={isTeacher} />
      )}

      {tab === "leaderboard" && (
        <LeaderboardPanel classroomId={classroomId} />
      )}

      <StudentProgressModal
        open={Boolean(selectedStudent)}
        onClose={() => setSelectedStudent(null)}
        classroomId={classroomId}
        student={selectedStudent}
      />
    </motion.div>
  );
}

// ── Members list sub-component ─────────────────────────
function MembersList({
  classroomId,
  isTeacher,
  onStudentClick,
}: {
  classroomId: string;
  isTeacher: boolean;
  onStudentClick: (student: { id: string; name: string | null; email: string }) => void;
}) {
  const { isDark } = useTheme();
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isTeacher) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const { data } = await classroomAPI.getStudents(classroomId);
        setStudents(data.students);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, [classroomId, isTeacher]);

  if (!isTeacher) {
    return (
      <p className={`text-sm ${isDark ? "text-zinc-500" : "text-zinc-500"}`}>
        Only teachers can view the member list.
      </p>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-transparent border-t-yellow-500" />
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className={`flex flex-col items-center py-12 ${isDark ? "text-zinc-500" : "text-zinc-500"}`}>
        <Users className="mb-3 h-8 w-8" />
        <p className="text-sm font-medium">No students yet</p>
        <p className="text-xs">Share the join code to invite students.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {students.map((s: any) => (
        <div
          key={s.id}
          onClick={() => onStudentClick({ id: s.id, name: s.name || null, email: s.email })}
          className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
            isDark ? "border-white/[0.06] bg-white/[0.02]" : "border-black/[0.06] bg-black/[0.02]"
          } ${isTeacher ? "cursor-pointer transition-colors hover:border-yellow-500/30 hover:bg-yellow-500/5" : ""}`}
        >
          {s.avatar ? (
            <img src={s.avatar} alt="" className="h-8 w-8 rounded-full" />
          ) : (
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
              isDark ? "bg-white/10 text-white" : "bg-black/10 text-black"
            }`}>
              {(s.name || s.email || "?")[0].toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-sm font-medium">{s.name || "Unnamed"}</p>
            <p className={`text-[10px] ${isDark ? "text-zinc-600" : "text-zinc-400"}`}>{s.email}</p>
          </div>
          <span className={`ml-auto text-[10px] ${isDark ? "text-zinc-600" : "text-zinc-400"}`}>
            Joined {new Date(s.joinedAt).toLocaleDateString()}
          </span>
        </div>
      ))}
    </div>
  );
}
