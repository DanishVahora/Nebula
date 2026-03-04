import { useState, useEffect, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ArrowLeft,
  ArrowRight,
  Check,
  Lock,
  Globe,
  Sparkles,
  FileCode2,
  Layout,
  Server,
  Layers,
  Code2,
  Braces,
  Github,
  Eye,
  EyeOff,
  GitBranch,
  ExternalLink,
  Rocket,
  AlertCircle,
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { userAPI, githubAPI } from "@/lib/api";

/* ─── Template definitions ──────────────────────────────── */

interface Template {
  id: string;
  name: string;
  description: string;
  icon: ReactNode;
  language: string;
  tags: string[];
  accent: string; // tailwind color class for the icon bg
  accentText: string;
}

const templates: Template[] = [
  {
    id: "blank",
    name: "Blank Workspace",
    description: "Start from scratch with an empty project.",
    icon: <Code2 className="h-5 w-5" />,
    language: "",
    tags: ["Empty", "Custom"],
    accent: "bg-zinc-500/10",
    accentText: "text-zinc-500",
  },
  {
    id: "dsa",
    name: "DSA Playground",
    description: "Competitive programming with C++, Python, Java & JS.",
    icon: <Braces className="h-5 w-5" />,
    language: "C++",
    tags: ["C++", "Python", "Java", "JS"],
    accent: "bg-blue-500/10",
    accentText: "text-blue-500",
  },
  {
    id: "static-web",
    name: "Static Web Project",
    description: "Classic HTML, CSS & JavaScript website.",
    icon: <Layout className="h-5 w-5" />,
    language: "HTML",
    tags: ["HTML", "CSS", "JS"],
    accent: "bg-orange-500/10",
    accentText: "text-orange-500",
  },
  {
    id: "react",
    name: "React App",
    description: "Modern React project powered by Vite + TypeScript.",
    icon: <Sparkles className="h-5 w-5" />,
    language: "TypeScript",
    tags: ["React", "Vite", "TypeScript"],
    accent: "bg-cyan-500/10",
    accentText: "text-cyan-500",
  },
  {
    id: "nextjs",
    name: "Next.js App",
    description: "Full-stack React framework with SSR & API routes.",
    icon: <FileCode2 className="h-5 w-5" />,
    language: "TypeScript",
    tags: ["Next.js", "React", "SSR"],
    accent: "bg-purple-500/10",
    accentText: "text-purple-500",
  },
  {
    id: "nodejs",
    name: "Node.js API",
    description: "Express.js REST API with TypeScript setup.",
    icon: <Server className="h-5 w-5" />,
    language: "TypeScript",
    tags: ["Node.js", "Express", "REST"],
    accent: "bg-green-500/10",
    accentText: "text-green-500",
  },
  {
    id: "fullstack",
    name: "Fullstack",
    description: "React frontend + Node.js backend in one workspace.",
    icon: <Layers className="h-5 w-5" />,
    language: "TypeScript",
    tags: ["React", "Node.js", "Monorepo"],
    accent: "bg-yellow-500/10",
    accentText: "text-yellow-500",
  },
];

/* ─── Template descriptions for config panel ────────────── */

const templateDescriptions: Record<string, string> = {
  blank: "An empty workspace with no preconfigured files. Perfect for custom setups.",
  static: "A classic web project with index.html, styles.css, and script.js ready to go.",
  react: "A React project with Create React App and JavaScript.",
  "react-ts": "A React + TypeScript project with Create React App.",
  "vite-react-ts": "A Vite-powered React + TypeScript app with Tailwind CSS and modern tooling.",
  nextjs: "A Next.js app with App Router, TypeScript, and Tailwind CSS preconfigured.",
  vue: "A Vue 3 app with Vue CLI, ready to develop.",
  angular: "An Angular framework project with TypeScript.",
  node: "A simple Node.js project to start building.",
  express: "An Express.js REST API server, ready for routes.",
  typescript: "A TypeScript starter project with ts-node.",
};

/* ─── Props ─────────────────────────────────────────────── */

interface CreateWorkspaceModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

/* ─── Component ─────────────────────────────────────────── */

export function CreateWorkspaceModal({
  open,
  onClose,
  onCreated,
}: CreateWorkspaceModalProps) {
  const { isDark } = useTheme();
  const { hasGitHubConnected } = useAuth();

  // Steps
  type Step = "template" | "config" | "creating";
  const [step, setStep] = useState<Step>("template");

  // Template selection
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(
    null
  );

  // Configuration
  const [workspaceName, setWorkspaceName] = useState("");
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [createGithubRepo, setCreateGithubRepo] = useState(false);

  // Creation state
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState(false);

  // Reset on open/close
  useEffect(() => {
    if (open) {
      setStep("template");
      setSelectedTemplate(null);
      setWorkspaceName("");
      setVisibility("private");
      setCreateGithubRepo(false);
      setCreating(false);
      setError(null);
      setCreated(false);
    }
  }, [open]);

  // Keyboard: Escape to close
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open && !creating) onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, creating, onClose]);

  const handleSelectTemplate = (t: Template) => {
    setSelectedTemplate(t);
    // Auto-generate a workspace name from template
    if (!workspaceName) {
      const nameMap: Record<string, string> = {
        blank: "my-workspace",
        static: "static-site",
        react: "react-app",
        "react-ts": "react-ts-app",
        "vite-react-ts": "vite-react-app",
        nextjs: "nextjs-app",
        vue: "vue-app",
        angular: "angular-app",
        node: "node-project",
        express: "express-api",
        typescript: "ts-project",
      };
      setWorkspaceName(nameMap[t.id] || "my-workspace");
    }
    setStep("config");
  };

  const handleBack = () => {
    setStep("template");
    setError(null);
  };

  const handleCreate = async () => {
    if (!workspaceName.trim() || !selectedTemplate) return;

    setCreating(true);
    setError(null);
    setStep("creating");

    try {
      // Step 1: Create the workspace
      const { data } = await userAPI.createWorkspace({
        name: workspaceName.trim(),
        description: templateDescriptions[selectedTemplate.id] || undefined,
        language: selectedTemplate.language || undefined,
        template: selectedTemplate.id,
        visibility,
      });

      // Step 2: If GitHub repo creation is enabled and user has GitHub connected
      if (createGithubRepo && hasGitHubConnected && data.workspace) {
        try {
          await githubAPI.createRepo({
            name: workspaceName.trim(),
            description: `${selectedTemplate.name} workspace created with Orbit`,
            isPrivate: visibility === "private",
            workspaceId: data.workspace.id,
          });
        } catch (ghErr: any) {
          // Show GitHub-specific error but don't fail the whole flow
          const ghError = ghErr.response?.data?.error || "GitHub repo creation failed";
          setError(ghError);
          // Workspace was still created, so let it succeed after showing error briefly
        }
      }

      setCreated(true);

      // Wait a beat so the success state is visible
      setTimeout(() => {
        onCreated?.();
        onClose();
      }, 1200);
    } catch (err: any) {
      const msg = err.response?.data?.error || "Failed to create workspace. Please try again.";
      setError(msg);
      setStep("config");
      setCreating(false);
    }
  };

  const canCreate = workspaceName.trim().length > 0 && selectedTemplate;

  /* ─── Render ────────────────────────────────────────── */

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`absolute inset-0 ${
              isDark ? "bg-black/60" : "bg-black/20"
            } backdrop-blur-sm`}
            onClick={creating ? undefined : onClose}
          />

          {/* Modal card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className={`relative z-10 w-full overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-xl ${
              isDark
                ? "border-white/10 bg-zinc-950/90 shadow-black/40"
                : "border-black/8 bg-white/95 shadow-black/10"
            } ${step === "template" ? "max-w-3xl" : "max-w-lg"}`}
            style={{ transition: "max-width 0.3s ease" }}
          >
            {/* Header */}
            <div
              className={`flex items-center justify-between border-b px-6 py-4 ${
                isDark ? "border-white/6" : "border-black/6"
              }`}
            >
              <div className="flex items-center gap-3">
                {step === "config" && (
                  <button
                    onClick={handleBack}
                    className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
                      isDark
                        ? "text-zinc-500 hover:bg-white/5 hover:text-white"
                        : "text-zinc-400 hover:bg-black/5 hover:text-black"
                    }`}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                )}
                <div>
                  <h2 className="text-sm font-semibold tracking-tight">
                    {step === "template"
                      ? "Create Workspace"
                      : step === "config"
                        ? "Configure Workspace"
                        : created
                          ? "Workspace Created!"
                          : "Creating Workspace..."}
                  </h2>
                  <p
                    className={`text-[11px] ${isDark ? "text-zinc-500" : "text-zinc-400"}`}
                  >
                    {step === "template"
                      ? "Choose a template to get started"
                      : step === "config"
                        ? selectedTemplate?.name
                        : created
                          ? workspaceName
                          : "Setting up your environment..."}
                  </p>
                </div>
              </div>
              {!creating && (
                <button
                  onClick={onClose}
                  className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
                    isDark
                      ? "text-zinc-600 hover:bg-white/5 hover:text-white"
                      : "text-zinc-400 hover:bg-black/5 hover:text-black"
                  }`}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Body */}
            <AnimatePresence mode="wait">
              {/* ─── Step 1: Template selection ─── */}
              {step === "template" && (
                <motion.div
                  key="template"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="p-6"
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    {templates.map((t, i) => (
                      <motion.button
                        key={t.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        onClick={() => handleSelectTemplate(t)}
                        className={`group relative flex items-start gap-4 rounded-xl border p-4 text-left transition-all duration-300 ${
                          isDark
                            ? "border-white/6 bg-white/2 hover:border-green-500/20 hover:bg-white/4 hover:shadow-[0_0_30px_rgba(34,197,94,0.05)]"
                            : "border-black/6 bg-black/1 hover:border-green-500/25 hover:bg-green-50/30 hover:shadow-[0_4px_24px_rgba(34,197,94,0.06)]"
                        }`}
                      >
                        {/* Icon */}
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors duration-300 ${t.accent} ${t.accentText} group-hover:scale-105`}
                        >
                          {t.icon}
                        </div>

                        {/* Content */}
                        <div className="min-w-0 flex-1">
                          <h3 className="text-[13px] font-semibold tracking-tight">
                            {t.name}
                          </h3>
                          <p
                            className={`mt-0.5 text-[11px] leading-relaxed ${isDark ? "text-zinc-500" : "text-zinc-400"}`}
                          >
                            {t.description}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {t.tags.map((tag) => (
                              <span
                                key={tag}
                                className={`rounded-md px-1.5 py-0.5 text-[9px] font-medium ${
                                  isDark
                                    ? "bg-white/5 text-zinc-500"
                                    : "bg-black/4 text-zinc-500"
                                }`}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Hover arrow */}
                        <ArrowRight
                          className={`h-4 w-4 shrink-0 opacity-0 transition-all duration-200 group-hover:opacity-100 ${
                            isDark ? "text-green-400" : "text-green-600"
                          }`}
                        />
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* ─── Step 2: Configuration ─── */}
              {step === "config" && selectedTemplate && (
                <motion.div
                  key="config"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                  className="p-6"
                >
                  {/* Template preview */}
                  <div
                    className={`flex items-center gap-3 rounded-xl border p-3 ${
                      isDark
                        ? "border-white/6 bg-white/2"
                        : "border-black/6 bg-black/2"
                    }`}
                  >
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-lg ${selectedTemplate.accent} ${selectedTemplate.accentText}`}
                    >
                      {selectedTemplate.icon}
                    </div>
                    <div>
                      <p className="text-xs font-semibold">
                        {selectedTemplate.name}
                      </p>
                      <p
                        className={`text-[10px] ${isDark ? "text-zinc-600" : "text-zinc-400"}`}
                      >
                        {templateDescriptions[selectedTemplate.id]}
                      </p>
                    </div>
                  </div>

                  {/* Form fields */}
                  <div className="mt-5 space-y-4">
                    {/* Workspace name */}
                    <div>
                      <label
                        className={`mb-1.5 block text-[11px] font-semibold uppercase tracking-wider ${
                          isDark ? "text-zinc-400" : "text-zinc-500"
                        }`}
                      >
                        Workspace Name
                      </label>
                      <input
                        type="text"
                        value={workspaceName}
                        onChange={(e) => setWorkspaceName(e.target.value)}
                        placeholder="my-awesome-project"
                        autoFocus
                        className={`h-10 w-full rounded-xl border px-4 text-sm outline-none transition-all duration-200 ${
                          isDark
                            ? "border-white/8 bg-white/3 text-white placeholder-zinc-600 focus:border-green-500/30 focus:bg-white/5"
                            : "border-black/8 bg-black/2 text-black placeholder-zinc-400 focus:border-green-500/40 focus:bg-white"
                        }`}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && canCreate) handleCreate();
                        }}
                      />
                    </div>

                    {/* Visibility */}
                    <div>
                      <label
                        className={`mb-1.5 block text-[11px] font-semibold uppercase tracking-wider ${
                          isDark ? "text-zinc-400" : "text-zinc-500"
                        }`}
                      >
                        Visibility
                      </label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setVisibility("private")}
                          className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-medium transition-all duration-200 ${
                            visibility === "private"
                              ? isDark
                                ? "border-green-500/20 bg-green-500/10 text-green-400"
                                : "border-green-500/30 bg-green-50 text-green-600"
                              : isDark
                                ? "border-white/6 bg-white/2 text-zinc-500 hover:border-white/10"
                                : "border-black/6 bg-black/1 text-zinc-400 hover:border-black/10"
                          }`}
                        >
                          <Lock className="h-3.5 w-3.5" />
                          Private
                        </button>
                        <button
                          onClick={() => setVisibility("public")}
                          className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-medium transition-all duration-200 ${
                            visibility === "public"
                              ? isDark
                                ? "border-green-500/20 bg-green-500/10 text-green-400"
                                : "border-green-500/30 bg-green-50 text-green-600"
                              : isDark
                                ? "border-white/6 bg-white/2 text-zinc-500 hover:border-white/10"
                                : "border-black/6 bg-black/1 text-zinc-400 hover:border-black/10"
                          }`}
                        >
                          <Globe className="h-3.5 w-3.5" />
                          Public
                        </button>
                      </div>
                    </div>

                    {/* GitHub repo toggle */}
                    <div
                      className={`rounded-xl border p-4 transition-all duration-200 ${
                        isDark
                          ? "border-white/6 bg-white/2"
                          : "border-black/6 bg-black/1"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                              isDark
                                ? "bg-white/5 text-zinc-400"
                                : "bg-black/5 text-zinc-500"
                            }`}
                          >
                            <Github className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold">
                              Create GitHub Repository
                            </p>
                            <p
                              className={`text-[10px] ${isDark ? "text-zinc-600" : "text-zinc-400"}`}
                            >
                              {hasGitHubConnected
                                ? "Auto-create a linked GitHub repo"
                                : "Connect GitHub in Settings first"}
                            </p>
                          </div>
                        </div>

                        {/* Toggle switch */}
                        <button
                          onClick={() =>
                            hasGitHubConnected &&
                            setCreateGithubRepo(!createGithubRepo)
                          }
                          disabled={!hasGitHubConnected}
                          className={`relative h-6 w-11 rounded-full transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-30 ${
                            createGithubRepo
                              ? "bg-green-500"
                              : isDark
                                ? "bg-zinc-700"
                                : "bg-zinc-300"
                          }`}
                        >
                          <motion.div
                            animate={{ x: createGithubRepo ? 20 : 2 }}
                            transition={{
                              type: "spring",
                              stiffness: 500,
                              damping: 30,
                            }}
                            className="absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm"
                          />
                        </button>
                      </div>

                      {/* GitHub repo details when toggled on */}
                      <AnimatePresence>
                        {createGithubRepo && hasGitHubConnected && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div
                              className={`mt-3 flex items-center gap-2 rounded-lg border px-3 py-2 ${
                                isDark
                                  ? "border-white/6 bg-white/2"
                                  : "border-black/6 bg-black/1"
                              }`}
                            >
                              <GitBranch
                                className={`h-3 w-3 ${isDark ? "text-zinc-600" : "text-zinc-400"}`}
                              />
                              <span
                                className={`text-[10px] ${isDark ? "text-zinc-500" : "text-zinc-400"}`}
                              >
                                github.com/you/
                              </span>
                              <span className="text-[10px] font-semibold">
                                {workspaceName || "workspace-name"}
                              </span>
                              <span
                                className={`ml-auto flex items-center gap-1 text-[9px] ${
                                  visibility === "private"
                                    ? isDark
                                      ? "text-yellow-500/60"
                                      : "text-yellow-600"
                                    : isDark
                                      ? "text-green-500/60"
                                      : "text-green-600"
                                }`}
                              >
                                {visibility === "private" ? (
                                  <EyeOff className="h-2.5 w-2.5" />
                                ) : (
                                  <Eye className="h-2.5 w-2.5" />
                                )}
                                {visibility}
                              </span>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Error message */}
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${
                          isDark
                            ? "border-red-500/20 bg-red-500/5 text-red-400"
                            : "border-red-200 bg-red-50 text-red-500"
                        }`}
                      >
                        <AlertCircle className="h-3.5 w-3.5" />
                        {error}
                      </motion.div>
                    )}
                  </div>

                  {/* Create button */}
                  <div className="mt-6 flex items-center justify-end gap-3">
                    <button
                      onClick={handleBack}
                      className={`h-9 rounded-xl border px-4 text-xs font-medium transition-all duration-200 ${
                        isDark
                          ? "border-white/6 text-zinc-400 hover:bg-white/5 hover:text-white"
                          : "border-black/6 text-zinc-500 hover:bg-black/5 hover:text-black"
                      }`}
                    >
                      Back
                    </button>
                    <button
                      onClick={handleCreate}
                      disabled={!canCreate || creating}
                      className={`flex h-9 items-center gap-2 rounded-xl px-5 text-xs font-semibold transition-all duration-300 disabled:opacity-30 ${
                        isDark
                          ? "bg-green-500 text-black hover:bg-green-400"
                          : "bg-green-600 text-white hover:bg-green-500"
                      }`}
                    >
                      <Rocket className="h-3.5 w-3.5" />
                      Create Workspace
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ─── Step 3: Creating / Success ─── */}
              {step === "creating" && (
                <motion.div
                  key="creating"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col items-center justify-center px-6 py-16"
                >
                  <AnimatePresence mode="wait">
                    {!created ? (
                      <motion.div
                        key="spinner"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="flex flex-col items-center gap-4"
                      >
                        {/* Animated spinner ring */}
                        <div className="relative">
                          <div className="h-12 w-12 animate-spin rounded-full border-2 border-transparent border-t-green-500" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div
                              className={`h-8 w-8 rounded-full ${selectedTemplate?.accent}`}
                            >
                              <div className="flex h-full w-full items-center justify-center">
                                <span className={selectedTemplate?.accentText}>
                                  {selectedTemplate?.icon}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-semibold">
                            Setting up {workspaceName}
                          </p>
                          <p
                            className={`mt-1 text-[11px] ${isDark ? "text-zinc-500" : "text-zinc-400"}`}
                          >
                            {createGithubRepo
                              ? "Creating workspace and GitHub repository..."
                              : "Creating your workspace..."}
                          </p>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="success"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{
                          type: "spring",
                          stiffness: 300,
                          damping: 20,
                        }}
                        className="flex flex-col items-center gap-4"
                      >
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green-500/10">
                          <Check className="h-7 w-7 text-green-500" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-semibold">
                            Workspace Created!
                          </p>
                          <p
                            className={`mt-1 text-[11px] ${isDark ? "text-zinc-500" : "text-zinc-400"}`}
                          >
                            {workspaceName} is ready to go
                          </p>
                        </div>
                        {createGithubRepo && hasGitHubConnected && (
                          <motion.div
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[10px] ${
                              isDark
                                ? "border-white/6 text-zinc-500"
                                : "border-black/6 text-zinc-400"
                            }`}
                          >
                            <ExternalLink className="h-3 w-3" />
                            GitHub repo linked
                          </motion.div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
