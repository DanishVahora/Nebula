import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/contexts/ThemeContext";
import { ChevronDown, Pencil, Trash2 } from "lucide-react";

export interface BlogItem {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: { id: string; name: string | null; avatar: string | null; email?: string };
}

interface Props {
  blog: BlogItem;
  canManage: boolean;
  onEdit: (blog: BlogItem) => void;
  onDelete: (blogId: string) => void;
}

export function BlogCard({ blog, canManage, onEdit, onDelete }: Props) {
  const { isDark } = useTheme();
  const [expanded, setExpanded] = useState(false);

  const preview = useMemo(() => {
    const stripped = blog.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    return stripped.length > 140 ? `${stripped.slice(0, 140)}...` : stripped;
  }, [blog.content]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border p-5 ${
        isDark ? "border-white/8 bg-white/3" : "border-black/8 bg-black/2"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold tracking-tight">{blog.title}</h3>
          <p className={`mt-1 text-xs ${isDark ? "text-zinc-500" : "text-zinc-600"}`}>
            By {blog.author.name || blog.author.email || "Teacher"} • {new Date(blog.createdAt).toLocaleString()}
          </p>
        </div>

        <div className="flex items-center gap-1">
          {canManage && (
            <>
              <button
                onClick={() => onEdit(blog)}
                className={`rounded-md p-2 ${isDark ? "text-zinc-500 hover:bg-white/6" : "text-zinc-600 hover:bg-black/6"}`}
                title="Edit post"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => onDelete(blog.id)}
                className="rounded-md p-2 text-red-400 hover:bg-red-500/10"
                title="Delete post"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
          <button
            onClick={() => setExpanded((v) => !v)}
            className={`rounded-md p-2 transition-transform ${
              isDark ? "text-zinc-500 hover:bg-white/6" : "text-zinc-600 hover:bg-black/6"
            } ${expanded ? "rotate-180" : ""}`}
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      </div>

      {!expanded && (
        <p className={`mt-3 text-sm leading-6 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>{preview}</p>
      )}

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <article
              className={`prose mt-4 max-w-none text-sm ${isDark ? "prose-invert" : ""}`}
              dangerouslySetInnerHTML={{ __html: blog.content }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
