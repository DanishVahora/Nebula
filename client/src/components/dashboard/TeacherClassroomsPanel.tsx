import { useState, useEffect, useCallback } from "react";
import { classroomAPI } from "@/lib/api";
import { useTheme } from "@/contexts/ThemeContext";
import { ClassroomDetailView } from "./ClassroomDetailView";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  School,
  Users,
  Copy,
  Check,
  X,
} from "lucide-react";

interface Classroom {
  id: string;
  name: string;
  description: string | null;
  joinCode: string;
  memberCount: number;
  createdAt: string;
  teacher: { id: string; name: string | null; avatar: string | null };
}

export function TeacherClassroomsPanel() {
  const { isDark } = useTheme();
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedClassroom, setSelectedClassroom] = useState<string | null>(null);

  const fetchClassrooms = useCallback(async () => {
    try {
      const { data } = await classroomAPI.getMy();
      setClassrooms(data.classrooms.filter((c: any) => c.myRole === "TEACHER"));
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClassrooms();
  }, [fetchClassrooms]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    setError(null);
    try {
      await classroomAPI.create({ name: name.trim(), description: description.trim() || undefined });
      setName("");
      setDescription("");
      setShowCreate(false);
      await fetchClassrooms();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to create classroom");
    } finally {
      setCreating(false);
    }
  };

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-700 border-t-yellow-500" />
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
          {classrooms.length} classroom{classrooms.length !== 1 ? "s" : ""}
        </p>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-lg bg-yellow-500/10 px-4 py-2 text-sm font-medium text-yellow-500 transition-colors hover:bg-yellow-500/20"
        >
          <Plus className="h-4 w-4" />
          New Classroom
        </button>
      </div>

      {/* Create modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`rounded-xl border p-5 ${
              isDark ? "border-white/[0.08] bg-white/[0.03]" : "border-black/[0.08] bg-black/[0.02]"
            }`}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Create Classroom</h3>
              <button onClick={() => setShowCreate(false)} className="text-zinc-500 hover:text-zinc-300">
                <X className="h-4 w-4" />
              </button>
            </div>

            {error && (
              <div className="mb-3 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Classroom name"
                maxLength={100}
                className={`h-9 w-full rounded-lg border px-3 text-sm outline-none transition-colors ${
                  isDark
                    ? "border-white/[0.08] bg-white/[0.04] text-white placeholder:text-zinc-600 focus:border-yellow-500/40"
                    : "border-black/[0.08] bg-black/[0.02] text-black placeholder:text-zinc-400 focus:border-yellow-500/40"
                }`}
              />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description (optional)"
                rows={2}
                maxLength={500}
                className={`w-full resize-none rounded-lg border px-3 py-2 text-sm outline-none transition-colors ${
                  isDark
                    ? "border-white/[0.08] bg-white/[0.04] text-white placeholder:text-zinc-600 focus:border-yellow-500/40"
                    : "border-black/[0.08] bg-black/[0.02] text-black placeholder:text-zinc-400 focus:border-yellow-500/40"
                }`}
              />
              <button
                onClick={handleCreate}
                disabled={!name.trim() || creating}
                className="flex h-9 items-center justify-center rounded-lg bg-yellow-500 px-5 text-sm font-medium text-black transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {creating ? "Creating…" : "Create Classroom"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Classroom list */}
      {classrooms.length === 0 && !showCreate ? (
        <div className={`flex flex-col items-center justify-center rounded-2xl border py-16 ${
          isDark ? "border-white/[0.06] bg-white/[0.02]" : "border-black/[0.06] bg-black/[0.02]"
        }`}>
          <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${isDark ? "bg-white/5" : "bg-black/5"}`}>
            <School className={`h-7 w-7 ${isDark ? "text-zinc-600" : "text-zinc-400"}`} />
          </div>
          <h3 className="text-base font-semibold">No classrooms yet</h3>
          <p className={`mt-1.5 max-w-sm text-center text-sm ${isDark ? "text-zinc-500" : "text-zinc-500"}`}>
            Create a classroom to organize and manage your students in one place.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-5 flex items-center gap-2 rounded-lg bg-yellow-500/10 px-4 py-2 text-sm font-medium text-yellow-500 transition-colors hover:bg-yellow-500/20"
          >
            <Plus className="h-4 w-4" />
            Create Classroom
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
              <div className="mb-3 flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${isDark ? "bg-yellow-500/10" : "bg-yellow-50"}`}>
                    <School className="h-4.5 w-4.5 text-yellow-500" />
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
              </div>

              <div className="flex items-center gap-4 text-xs">
                <span className={`flex items-center gap-1.5 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                  <Users className="h-3.5 w-3.5" />
                  {c.memberCount} member{c.memberCount !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Join code */}
              <div className={`mt-3 flex items-center justify-between rounded-lg border px-3 py-2 ${
                isDark ? "border-white/[0.06] bg-white/[0.03]" : "border-black/[0.06] bg-black/[0.02]"
              }`}>
                <div>
                  <span className={`text-[10px] uppercase tracking-wider ${isDark ? "text-zinc-600" : "text-zinc-400"}`}>Join Code</span>
                  <p className="font-mono text-sm font-bold tracking-widest">{c.joinCode}</p>
                </div>
                <button
                  onClick={() => copyCode(c.joinCode, c.id)}
                  className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
                    isDark ? "hover:bg-white/[0.06]" : "hover:bg-black/[0.06]"
                  }`}
                >
                  {copiedId === c.id ? (
                    <Check className="h-3.5 w-3.5 text-green-400" />
                  ) : (
                    <Copy className={`h-3.5 w-3.5 ${isDark ? "text-zinc-500" : "text-zinc-400"}`} />
                  )}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
