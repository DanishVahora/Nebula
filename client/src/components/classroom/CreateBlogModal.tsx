import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTheme } from "@/contexts/ThemeContext";
import { blogAPI } from "@/lib/api";
import { BlogEditor } from "./BlogEditor";
import { Loader2, X } from "lucide-react";

interface ExistingBlog {
  id: string;
  title: string;
  content: string;
}

interface Props {
  open: boolean;
  classroomId: string;
  onClose: () => void;
  onSaved: () => void;
  existing?: ExistingBlog | null;
}

export function CreateBlogModal({ open, classroomId, onClose, onSaved, existing }: Props) {
  const { isDark } = useTheme();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!existing;

  useEffect(() => {
    if (!open) return;
    setTitle(existing?.title || "");
    setContent(existing?.content || "<p></p>");
    setError(null);
  }, [open, existing]);

  const handleSave = async () => {
    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    if (!content || content === "<p></p>") {
      setError("Content is required");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (isEditing && existing) {
        await blogAPI.update(existing.id, { title: title.trim(), content });
      } else {
        await blogAPI.create(classroomId, { title: title.trim(), content });
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to save blog post");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
        >
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className={`w-full max-w-3xl rounded-2xl border p-6 ${
              isDark ? "border-white/8 bg-zinc-950" : "border-black/8 bg-white"
            }`}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold tracking-tight">
                  {isEditing ? "Edit Post" : "Create New Post"}
                </h3>
                <p className={`text-sm ${isDark ? "text-zinc-500" : "text-zinc-600"}`}>
                  Share announcements in a rich post format.
                </p>
              </div>
              <button
                onClick={onClose}
                className={`rounded-md p-2 ${
                  isDark ? "text-zinc-500 hover:bg-white/5" : "text-zinc-500 hover:bg-black/5"
                }`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {error && (
              <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Post title"
                className={`h-10 w-full rounded-lg border px-3 text-sm outline-none ${
                  isDark
                    ? "border-white/8 bg-white/4 text-white placeholder:text-zinc-600"
                    : "border-black/8 bg-black/2 text-black placeholder:text-zinc-500"
                }`}
              />
              <BlogEditor value={content} onChange={setContent} />
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={onClose}
                className={`h-10 rounded-lg px-4 text-sm font-medium ${
                  isDark ? "text-zinc-400 hover:text-white" : "text-zinc-600 hover:text-black"
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex h-10 items-center gap-2 rounded-lg bg-yellow-400 px-4 text-sm font-semibold text-black disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {saving ? "Saving" : isEditing ? "Save Changes" : "Post"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
