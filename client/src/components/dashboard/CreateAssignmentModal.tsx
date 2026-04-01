import { useState } from "react";
import { assignmentAPI } from "@/lib/api";
import { useTheme } from "@/contexts/ThemeContext";
import { motion } from "framer-motion";
import {
  X,
  Plus,
  Code2,
  Globe,
  Sparkles,
  Clock,
  Calendar,
  ChevronRight,
  Trash2,
  Eye,
  EyeOff,
} from "lucide-react";

interface Props {
  classroomId: string;
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

type AssignmentType = "WEB_DEV" | "DSA";
type Difficulty = "EASY" | "MEDIUM" | "HARD";
type DSALanguage = "cpp" | "python" | "java";

interface TestCaseEntry {
  input: string;
  expectedOutput: string;
  weight: number;
  isHidden: boolean;
}

const TEMPLATES = [
  { id: "react", label: "React (Vite)" },
  { id: "vite-react-ts", label: "Vite + React + TS" },
  { id: "nextjs", label: "Next.js" },
  { id: "vue", label: "Vue.js" },
  { id: "angular", label: "Angular" },
  { id: "express", label: "Express.js" },
  { id: "node", label: "Node.js" },
  { id: "typescript", label: "TypeScript" },
  { id: "static", label: "Static Web" },
];

const DSA_LANGUAGES: Array<{ id: DSALanguage; label: string }> = [
  { id: "cpp", label: "C++" },
  { id: "python", label: "Python" },
  { id: "java", label: "Java" },
];

const DIFFICULTIES: Array<{ id: Difficulty; label: string; color: string }> = [
  { id: "EASY", label: "Easy", color: "text-green-400" },
  { id: "MEDIUM", label: "Medium", color: "text-yellow-400" },
  { id: "HARD", label: "Hard", color: "text-red-400" },
];

export function CreateAssignmentModal({ classroomId, open, onClose, onCreated }: Props) {
  const { isDark } = useTheme();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  // Step 1: Type
  const [type, setType] = useState<AssignmentType>("WEB_DEV");

  // Step 2: Details
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("MEDIUM");
  const [template, setTemplate] = useState("react");
  const [language, setLanguage] = useState<DSALanguage>("cpp");
  const [timeLimit, setTimeLimit] = useState("");
  const [deadline, setDeadline] = useState("");
  const [maxMarks, setMaxMarks] = useState("100");
  const [aiAllowed, setAiAllowed] = useState(false);

  // Step 3: Test cases (DSA only)
  const [testCases, setTestCases] = useState<TestCaseEntry[]>([
    { input: "", expectedOutput: "", weight: 1, isHidden: false },
  ]);

  const addTestCase = () => {
    setTestCases([...testCases, { input: "", expectedOutput: "", weight: 1, isHidden: false }]);
  };

  const removeTestCase = (index: number) => {
    setTestCases(testCases.filter((_, i) => i !== index));
  };

  const updateTestCase = (index: number, field: keyof TestCaseEntry, value: any) => {
    const updated = [...testCases];
    (updated[index] as any)[field] = value;
    setTestCases(updated);
  };

  const handleAIGenerate = async () => {
    if (!title.trim()) return;
    if (type !== "DSA") return;
    setGenerating(true);
    try {
      const { data } = await assignmentAPI.aiGenerate({
        topic: title.trim(),
        difficulty,
        language,
      });
      if (data.generated?.description) setDescription(data.generated.description);
      if (data.generated?.testcases?.length) {
        setTestCases(data.generated.testcases);
      }
    } catch {
      // Silently fail
    } finally {
      setGenerating(false);
    }
  };

  const handleCreate = async () => {
    if (!title.trim()) return;
    setCreating(true);
    setError(null);

    try {
      const payload: any = {
        classroomId,
        title: title.trim(),
        description: description.trim() || undefined,
        type,
        difficulty,
        maxMarks: parseInt(maxMarks, 10) || 100,
        aiAllowed,
        timeLimit: timeLimit ? parseInt(timeLimit, 10) : undefined,
        deadline: deadline || undefined,
      };

      if (type === "WEB_DEV") {
        payload.template = template;
      } else {
        payload.language = language;
        payload.testCases = testCases
          .filter((tc) => tc.input.trim() || tc.expectedOutput.trim())
          .map((tc) => ({
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            weight: tc.weight,
            isHidden: tc.isHidden,
          }));
      }

      await assignmentAPI.create(payload);
      onCreated();
      resetAndClose();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to create assignment");
    } finally {
      setCreating(false);
    }
  };

  const resetAndClose = () => {
    setStep(1);
    setTitle("");
    setDescription("");
    setType("WEB_DEV");
    setDifficulty("MEDIUM");
    setTemplate("react");
    setLanguage("cpp");
    setTimeLimit("");
    setDeadline("");
    setMaxMarks("100");
    setAiAllowed(false);
    setTestCases([{ input: "", expectedOutput: "", weight: 1, isHidden: false }]);
    setError(null);
    onClose();
  };

  if (!open) return null;

  const inputClass = `w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors ${
    isDark
      ? "border-white/[0.08] bg-white/[0.04] text-white placeholder:text-zinc-600 focus:border-yellow-500/40"
      : "border-black/[0.08] bg-black/[0.02] text-black placeholder:text-zinc-400 focus:border-yellow-500/40"
  }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={resetAndClose} />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className={`relative z-10 w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border p-6 shadow-2xl ${
          isDark ? "border-white/[0.08] bg-zinc-950" : "border-black/[0.08] bg-white"
        }`}
      >
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Create Assignment</h2>
            <p className={`text-xs ${isDark ? "text-zinc-500" : "text-zinc-500"}`}>
              Step {step} of {type === "DSA" ? 3 : 2}
            </p>
          </div>
          <button onClick={resetAndClose} className={`rounded-lg p-1.5 transition-colors ${isDark ? "hover:bg-white/10" : "hover:bg-black/10"}`}>
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
            {error}
          </div>
        )}

        {/* Step 1: Choose type */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm font-medium">Choose assignment type</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setType("WEB_DEV")}
                className={`flex flex-col items-center gap-3 rounded-xl border p-5 transition-all ${
                  type === "WEB_DEV"
                    ? isDark
                      ? "border-yellow-500/30 bg-yellow-500/10"
                      : "border-yellow-500/40 bg-yellow-50"
                    : isDark
                    ? "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]"
                    : "border-black/[0.06] bg-black/[0.02] hover:border-black/[0.12]"
                }`}
              >
                <Globe className={`h-8 w-8 ${type === "WEB_DEV" ? "text-yellow-500" : isDark ? "text-zinc-500" : "text-zinc-400"}`} />
                <div className="text-center">
                  <p className="text-sm font-semibold">Web Development</p>
                  <p className={`text-xs ${isDark ? "text-zinc-500" : "text-zinc-500"}`}>
                    Build apps with React, Next.js, Node.js
                  </p>
                </div>
              </button>

              <button
                onClick={() => setType("DSA")}
                className={`flex flex-col items-center gap-3 rounded-xl border p-5 transition-all ${
                  type === "DSA"
                    ? isDark
                      ? "border-yellow-500/30 bg-yellow-500/10"
                      : "border-yellow-500/40 bg-yellow-50"
                    : isDark
                    ? "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]"
                    : "border-black/[0.06] bg-black/[0.02] hover:border-black/[0.12]"
                }`}
              >
                <Code2 className={`h-8 w-8 ${type === "DSA" ? "text-yellow-500" : isDark ? "text-zinc-500" : "text-zinc-400"}`} />
                <div className="text-center">
                  <p className="text-sm font-semibold">DSA / Algorithms</p>
                  <p className={`text-xs ${isDark ? "text-zinc-500" : "text-zinc-500"}`}>
                    Solve problems in C++, Python, Java
                  </p>
                </div>
              </button>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setStep(2)}
                className="flex items-center gap-2 rounded-lg bg-yellow-500 px-5 py-2 text-sm font-medium text-black transition-opacity hover:opacity-90"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Details */}
        {step === 2 && (
          <div className="space-y-4">
            {/* Title + AI generate */}
            <div>
              <label className="mb-1.5 block text-xs font-medium">Title</label>
              <div className="flex gap-2">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={type === "DSA" ? "e.g. Two Sum" : "e.g. Build a Todo App"}
                  maxLength={200}
                  className={inputClass}
                />
                <button
                  onClick={handleAIGenerate}
                  disabled={!title.trim() || generating}
                  className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                    isDark
                      ? "bg-purple-500/10 text-purple-400 hover:bg-purple-500/20"
                      : "bg-purple-50 text-purple-600 hover:bg-purple-100"
                  } disabled:opacity-40`}
                  title="Generate description with AI"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {generating ? "..." : "AI"}
                </button>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="mb-1.5 block text-xs font-medium">Description (Markdown)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
                placeholder="Assignment description, requirements, examples..."
                className={`${inputClass} resize-y font-mono text-xs`}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Difficulty */}
              <div>
                <label className="mb-1.5 block text-xs font-medium">Difficulty</label>
                <div className="flex gap-2">
                  {DIFFICULTIES.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => setDifficulty(d.id)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                        difficulty === d.id
                          ? isDark
                            ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-400"
                            : "border-yellow-500/40 bg-yellow-50 text-yellow-600"
                          : isDark
                          ? "border-white/[0.06] text-zinc-400 hover:border-white/[0.12]"
                          : "border-black/[0.06] text-zinc-500 hover:border-black/[0.12]"
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Max marks */}
              <div>
                <label className="mb-1.5 block text-xs font-medium">Max Marks</label>
                <input
                  type="number"
                  value={maxMarks}
                  onChange={(e) => setMaxMarks(e.target.value)}
                  min={1}
                  className={inputClass}
                />
              </div>
            </div>

            {/* Template or Language */}
            {type === "WEB_DEV" ? (
              <div>
                <label className="mb-1.5 block text-xs font-medium">Template</label>
                <div className="flex flex-wrap gap-2">
                  {TEMPLATES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTemplate(t.id)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                        template === t.id
                          ? isDark
                            ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-400"
                            : "border-yellow-500/40 bg-yellow-50 text-yellow-600"
                          : isDark
                          ? "border-white/[0.06] text-zinc-400 hover:border-white/[0.12]"
                          : "border-black/[0.06] text-zinc-500 hover:border-black/[0.12]"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <label className="mb-1.5 block text-xs font-medium">Language</label>
                <div className="flex gap-2">
                  {DSA_LANGUAGES.map((l) => (
                    <button
                      key={l.id}
                      onClick={() => setLanguage(l.id)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                        language === l.id
                          ? isDark
                            ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-400"
                            : "border-yellow-500/40 bg-yellow-50 text-yellow-600"
                          : isDark
                          ? "border-white/[0.06] text-zinc-400 hover:border-white/[0.12]"
                          : "border-black/[0.06] text-zinc-500 hover:border-black/[0.12]"
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {/* Time limit */}
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium">
                  <Clock className="h-3 w-3" /> Time Limit (minutes)
                </label>
                <input
                  type="number"
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(e.target.value)}
                  min={1}
                  placeholder="No limit"
                  className={inputClass}
                />
              </div>

              {/* Deadline */}
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium">
                  <Calendar className="h-3 w-3" /> Deadline
                </label>
                <input
                  type="datetime-local"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            {/* AI allowed */}
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={aiAllowed}
                onChange={(e) => setAiAllowed(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-600 accent-yellow-500"
              />
              <span className="text-xs font-medium">Allow students to use AI assistance</span>
            </label>

            <div className="flex justify-between pt-2">
              <button
                onClick={() => setStep(1)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  isDark ? "text-zinc-400 hover:text-white" : "text-zinc-500 hover:text-black"
                }`}
              >
                Back
              </button>
              <button
                onClick={() => (type === "DSA" ? setStep(3) : handleCreate())}
                disabled={!title.trim() || creating}
                className="flex items-center gap-2 rounded-lg bg-yellow-500 px-5 py-2 text-sm font-medium text-black transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {type === "DSA" ? (
                  <>Next <ChevronRight className="h-4 w-4" /></>
                ) : creating ? (
                  "Creating..."
                ) : (
                  "Create Assignment"
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Test cases (DSA) */}
        {step === 3 && type === "DSA" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Test Cases</p>
              <button
                onClick={addTestCase}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  isDark ? "bg-white/5 text-zinc-300 hover:bg-white/10" : "bg-black/5 text-zinc-600 hover:bg-black/10"
                }`}
              >
                <Plus className="h-3 w-3" /> Add Test Case
              </button>
            </div>

            <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
              {testCases.map((tc, i) => (
                <div
                  key={i}
                  className={`rounded-xl border p-4 ${
                    isDark ? "border-white/[0.06] bg-white/[0.02]" : "border-black/[0.06] bg-black/[0.01]"
                  }`}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-semibold">Test Case {i + 1}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateTestCase(i, "isHidden", !tc.isHidden)}
                        className={`flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium ${
                          tc.isHidden
                            ? isDark ? "bg-red-500/10 text-red-400" : "bg-red-50 text-red-600"
                            : isDark ? "bg-green-500/10 text-green-400" : "bg-green-50 text-green-600"
                        }`}
                      >
                        {tc.isHidden ? <EyeOff className="h-2.5 w-2.5" /> : <Eye className="h-2.5 w-2.5" />}
                        {tc.isHidden ? "Hidden" : "Visible"}
                      </button>
                      {testCases.length > 1 && (
                        <button
                          onClick={() => removeTestCase(i)}
                          className="rounded p-1 text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-zinc-500">Input</label>
                      <textarea
                        value={tc.input}
                        onChange={(e) => updateTestCase(i, "input", e.target.value)}
                        rows={3}
                        className={`${inputClass} font-mono text-xs`}
                        placeholder="5&#10;1 2 3 4 5"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-zinc-500">Expected Output</label>
                      <textarea
                        value={tc.expectedOutput}
                        onChange={(e) => updateTestCase(i, "expectedOutput", e.target.value)}
                        rows={3}
                        className={`${inputClass} font-mono text-xs`}
                        placeholder="15"
                      />
                    </div>
                  </div>
                  <div className="mt-2">
                    <label className="text-[10px] font-medium text-zinc-500">
                      Weight: {tc.weight}
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={10}
                      value={tc.weight}
                      onChange={(e) => updateTestCase(i, "weight", parseInt(e.target.value, 10))}
                      className="mt-1 w-full accent-yellow-500"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between pt-2">
              <button
                onClick={() => setStep(2)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  isDark ? "text-zinc-400 hover:text-white" : "text-zinc-500 hover:text-black"
                }`}
              >
                Back
              </button>
              <button
                onClick={handleCreate}
                disabled={!title.trim() || creating}
                className="flex items-center gap-2 rounded-lg bg-yellow-500 px-5 py-2 text-sm font-medium text-black transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {creating ? "Creating..." : "Create Assignment"}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
