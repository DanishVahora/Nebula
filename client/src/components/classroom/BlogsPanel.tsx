import { useCallback, useEffect, useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { blogAPI } from "@/lib/api";
import { BlogCard } from "./BlogCard";
import type { BlogItem } from "./BlogCard";
import { CreateBlogModal } from "./CreateBlogModal";
import { motion, AnimatePresence } from "framer-motion";
import { Newspaper, Plus } from "lucide-react";

interface Props {
  classroomId: string;
  isTeacher: boolean;
}

export function BlogsPanel({ classroomId, isTeacher }: Props) {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const [blogs, setBlogs] = useState<BlogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingBlog, setEditingBlog] = useState<BlogItem | null>(null);

  const fetchBlogs = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await blogAPI.getForClassroom(classroomId);
      setBlogs(data.blogs || []);
    } catch {
      setBlogs([]);
    } finally {
      setLoading(false);
    }
  }, [classroomId]);

  useEffect(() => {
    fetchBlogs();
  }, [fetchBlogs]);

  const handleDelete = async (blogId: string) => {
    if (!window.confirm("Delete this post?")) return;
    try {
      await blogAPI.delete(blogId);
      fetchBlogs();
    } catch {
      // noop
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-transparent border-t-yellow-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className={`text-sm ${isDark ? "text-zinc-500" : "text-zinc-600"}`}>
          {blogs.length} post{blogs.length !== 1 ? "s" : ""}
        </p>

        {isTeacher && (
          <button
            onClick={() => {
              setEditingBlog(null);
              setShowCreate(true);
            }}
            className="flex items-center gap-2 rounded-lg bg-yellow-500/10 px-4 py-2 text-sm font-medium text-yellow-500 transition-colors hover:bg-yellow-500/20"
          >
            <Plus className="h-4 w-4" />
            Create Post
          </button>
        )}
      </div>

      <AnimatePresence>
        {showCreate && (
          <CreateBlogModal
            open={showCreate}
            classroomId={classroomId}
            existing={editingBlog}
            onClose={() => {
              setShowCreate(false);
              setEditingBlog(null);
            }}
            onSaved={fetchBlogs}
          />
        )}
      </AnimatePresence>

      {blogs.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex flex-col items-center justify-center rounded-2xl border py-16 ${
            isDark ? "border-white/8 bg-white/3" : "border-black/8 bg-black/2"
          }`}
        >
          <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-xl ${
            isDark ? "bg-white/5" : "bg-black/5"
          }`}>
            <Newspaper className={`h-6 w-6 ${isDark ? "text-zinc-600" : "text-zinc-500"}`} />
          </div>
          <h3 className="text-base font-semibold">No announcements yet</h3>
          <p className={`mt-1.5 max-w-md text-center text-sm ${isDark ? "text-zinc-500" : "text-zinc-600"}`}>
            {isTeacher
              ? "Create your first classroom post to share updates and resources."
              : "Your teacher has not posted any announcements yet."}
          </p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {blogs.map((blog) => (
            <BlogCard
              key={blog.id}
              blog={blog}
              canManage={isTeacher && blog.author.id === user?.id}
              onEdit={(item) => {
                setEditingBlog(item);
                setShowCreate(true);
              }}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
