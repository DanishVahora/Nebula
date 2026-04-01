import { useState, useEffect, useCallback } from "react";
import { classroomAPI } from "@/lib/api";
import { useTheme } from "@/contexts/ThemeContext";
import { ClassroomDetailView } from "./ClassroomDetailView";
import { motion, AnimatePresence } from "framer-motion";
import { School, Users, LogIn, X } from "lucide-react";

interface Classroom {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
  createdAt: string;
  teacher: { id: string; name: string | null; avatar: string | null };
}

export function StudentClassroomsPanel() {
  const { isDark } = useTheme();
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedClassroom, setSelectedClassroom] = useState<string | null>(null);

  const fetchClassrooms = useCallback(async () => {
    try {
      const { data } = await classroomAPI.getMy();
      setClassrooms(data.classrooms.filter((c: any) => c.myRole === "STUDENT"));
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClassrooms();
  }, [fetchClassrooms]);

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    setJoining(true);
    setError(null);
    setSuccess(null);
    try {
      const { data } = await classroomAPI.join(joinCode.trim());
      setSuccess(data.message);
      setJoinCode("");
      setShowJoin(false);
      await fetchClassrooms();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to join classroom");
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-700 border-t-green-500" />
      </div>
    );
  }

  if (selectedClassroom) {
    return (
      <ClassroomDetailView
        classroomId={selectedClassroom}
        onBack={() => setSelectedClassroom(null)}
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Action bar */}
      <div className="flex items-center justify-between">
        <p className={`text-sm ${isDark ? "text-zinc-500" : "text-zinc-500"}`}>
          {classrooms.length} classroom{classrooms.length !== 1 ? "s" : ""} joined
        </p>
        <button
          onClick={() => { setShowJoin(true); setError(null); setSuccess(null); }}
          className="flex items-center gap-2 rounded-lg bg-green-500/10 px-4 py-2 text-sm font-medium text-green-500 transition-colors hover:bg-green-500/20"
        >
          <LogIn className="h-4 w-4" />
          Join Classroom
        </button>
      </div>

      {/* Success banner */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="rounded-lg border border-green-500/20 bg-green-500/10 px-4 py-2.5 text-sm text-green-400"
          >
            {success}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Join form */}
      <AnimatePresence>
        {showJoin && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`rounded-xl border p-5 ${
              isDark ? "border-white/[0.08] bg-white/[0.03]" : "border-black/[0.08] bg-black/[0.02]"
            }`}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Join a Classroom</h3>
              <button onClick={() => setShowJoin(false)} className="text-zinc-500 hover:text-zinc-300">
                <X className="h-4 w-4" />
              </button>
            </div>

            {error && (
              <div className="mb-3 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Enter join code"
                maxLength={10}
                className={`h-9 flex-1 rounded-lg border px-3 font-mono text-sm uppercase tracking-widest outline-none transition-colors ${
                  isDark
                    ? "border-white/[0.08] bg-white/[0.04] text-white placeholder:text-zinc-600 focus:border-green-500/40"
                    : "border-black/[0.08] bg-black/[0.02] text-black placeholder:text-zinc-400 focus:border-green-500/40"
                }`}
                onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              />
              <button
                onClick={handleJoin}
                disabled={!joinCode.trim() || joining}
                className="flex h-9 items-center justify-center rounded-lg bg-green-500 px-5 text-sm font-medium text-black transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {joining ? "Joining…" : "Join"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Classroom list */}
      {classrooms.length === 0 && !showJoin ? (
        <div className={`flex flex-col items-center justify-center rounded-2xl border py-16 ${
          isDark ? "border-white/[0.06] bg-white/[0.02]" : "border-black/[0.06] bg-black/[0.02]"
        }`}>
          <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${isDark ? "bg-white/5" : "bg-black/5"}`}>
            <School className={`h-7 w-7 ${isDark ? "text-zinc-600" : "text-zinc-400"}`} />
          </div>
          <h3 className="text-base font-semibold">No classrooms yet</h3>
          <p className={`mt-1.5 max-w-sm text-center text-sm ${isDark ? "text-zinc-500" : "text-zinc-500"}`}>
            Join a classroom using an invite code from your teacher to access your class space.
          </p>
          <button
            onClick={() => setShowJoin(true)}
            className="mt-5 flex items-center gap-2 rounded-lg bg-green-500/10 px-4 py-2 text-sm font-medium text-green-500 transition-colors hover:bg-green-500/20"
          >
            <LogIn className="h-4 w-4" />
            Join Classroom
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {classrooms.map((c) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => setSelectedClassroom(c.id)}
              className={`group cursor-pointer rounded-xl border p-5 transition-colors ${
                isDark
                  ? "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]"
                  : "border-black/[0.06] bg-black/[0.02] hover:border-black/[0.12]"
              }`}
            >
              <div className="mb-3 flex items-center gap-2.5">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${isDark ? "bg-green-500/10" : "bg-green-50"}`}>
                  <School className="h-4.5 w-4.5 text-green-500" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold leading-tight">{c.name}</h4>
                  {c.description && (
                    <p className={`mt-0.5 text-xs leading-snug ${isDark ? "text-zinc-500" : "text-zinc-500"}`}>
                      {c.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs">
                <span className={`flex items-center gap-1.5 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                  <Users className="h-3.5 w-3.5" />
                  {c.memberCount} member{c.memberCount !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Teacher info */}
              <div className={`mt-3 flex items-center gap-2 rounded-lg border px-3 py-2 ${
                isDark ? "border-white/[0.06] bg-white/[0.03]" : "border-black/[0.06] bg-black/[0.02]"
              }`}>
                {c.teacher.avatar ? (
                  <img src={c.teacher.avatar} alt="" className="h-5 w-5 rounded-full" />
                ) : (
                  <div className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold ${
                    isDark ? "bg-white/10 text-zinc-400" : "bg-black/10 text-zinc-500"
                  }`}>
                    {c.teacher.name?.[0] || "T"}
                  </div>
                )}
                <span className={`text-xs ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                  {c.teacher.name || "Teacher"}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
