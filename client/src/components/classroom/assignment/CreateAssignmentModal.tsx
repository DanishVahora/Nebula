import { useState } from "react";
import { assignmentAPI } from "@/lib/api";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Sparkles, X } from "lucide-react";
import {
  AIGenerateAssignmentModal,
} from "@/components/classroom/assignment/ai/AIGenerateAssignmentModal";
import type { GeneratedProblem } from "@/components/classroom/assignment/ai/AIProblemPreview";

interface Props {
  open: boolean;
  classroomId: string;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateAssignmentModal({ open, classroomId, onClose, onCreated }: Props) {
  const { isDark } = useTheme();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"WEB_DEV" | "DSA">("WEB_DEV");
  const [language, setLanguage] = useState<"cpp" | "python" | "java">("cpp");
  const [starterCodeMap, setStarterCodeMap] = useState<{ cpp: string; python: string; java: string }>({
    cpp: "",
    python: "",
    java: "",
  });
  const [testCases, setTestCases] = useState<Array<{ input: string; expectedOutput: string; weight: number; isHidden: boolean }>>([]);
  const [difficulty, setDifficulty] = useState<"EASY" | "MEDIUM" | "HARD">("MEDIUM");
  const [deadline, setDeadline] = useState("");
  const [maxMarks, setMaxMarks] = useState(100);
  const [aiAllowed, setAiAllowed] = useState(false);
  const [template, setTemplate] = useState("vite-react-ts");
  const [instructions, setInstructions] = useState("");
  const [lockedFiles, setLockedFiles] = useState("");
  const [editableFiles, setEditableFiles] = useState("");
  const [referenceImages, setReferenceImages] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAIModal, setShowAIModal] = useState(false);

  const parseCsv = (value: string) =>
    value
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);

  const handleCreate = async () => {
    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload: any = {
        classroomId,
        title: title.trim(),
        description: description.trim() || undefined,
        type,
        difficulty,
        deadline: deadline || undefined,
        maxMarks,
        aiAllowed,
      };

      if (type === "WEB_DEV") {
        payload.template = template;
        payload.assignmentConfig = {
          template,
          lockedFiles: parseCsv(lockedFiles),
          editableFiles: parseCsv(editableFiles),
          referenceImages: parseCsv(referenceImages),
          instructions: instructions.trim() || description.trim() || "",
        };
      }

      if (type === "DSA") {
        payload.language = language;
        payload.starterCode = starterCodeMap;
        payload.testCases = testCases
          .filter((tc) => tc.input.trim() && tc.expectedOutput.trim())
          .map((tc) => ({
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            weight: Math.max(1, Number(tc.weight) || 1),
            isHidden: !!tc.isHidden,
          }));
      }

      await assignmentAPI.create(payload);
      onCreated();
      onClose();
      setTitle("");
      setDescription("");
      setType("WEB_DEV");
      setLanguage("cpp");
      setStarterCodeMap({ cpp: "", python: "", java: "" });
      setTestCases([]);
      setDifficulty("MEDIUM");
      setDeadline("");
      setMaxMarks(100);
      setAiAllowed(false);
      setTemplate("vite-react-ts");
      setInstructions("");
      setLockedFiles("");
      setEditableFiles("");
      setReferenceImages("");
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to create assignment");
    } finally {
      setSaving(false);
    }
  };

  const applyAIProblem = (problem: GeneratedProblem, preferredLanguage: "cpp" | "python" | "java") => {
    const examplesMarkdown = (problem.examples || [])
      .map(
        (example, idx) =>
          `### Example ${idx + 1}\nInput:\n${example.input}\n\nOutput:\n${example.output}\n\nExplanation:\n${example.explanation}`
      )
      .join("\n\n");

    const fullDescription = [
      problem.description,
      "",
      "## Constraints",
      problem.constraints,
      "",
      "## Examples",
      examplesMarkdown,
    ]
      .filter(Boolean)
      .join("\n");

    setType("DSA");
    setLanguage(preferredLanguage);
    setTitle(problem.title || "");
    setDescription(fullDescription);
    setStarterCodeMap(problem.starterCode || { cpp: "", python: "", java: "" });
    setTestCases(
      (problem.testcases || []).map((tc) => ({
        input: tc.input || "",
        expectedOutput: tc.expectedOutput || "",
        isHidden: !!tc.isHidden,
        weight: Math.max(1, Number(tc.weight) || 1),
      }))
    );
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 overflow-y-auto bg-black/70 p-4"
        >
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={`mx-auto my-4 flex max-h-[calc(100vh-2rem)] w-full max-w-xl flex-col overflow-hidden rounded-2xl border p-6 ${
              isDark ? "border-white/8 bg-zinc-950" : "border-black/8 bg-white"
            }`}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Create Assignment</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAIModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-yellow-400 px-3 py-1.5 text-xs font-semibold text-black"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Generate with AI
                </button>
                <button onClick={onClose} className="rounded-md p-2 text-zinc-500 hover:bg-white/5">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {error && (
              <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                {error}
              </div>
            )}

            <div className="space-y-3 overflow-y-auto pr-1">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Assignment title"
                className={`h-10 w-full rounded-lg border px-3 text-sm outline-none ${
                  isDark ? "border-white/8 bg-white/4" : "border-black/8 bg-black/2"
                }`}
              />

              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description"
                rows={3}
                className={`w-full rounded-lg border px-3 py-2 text-sm outline-none ${
                  isDark ? "border-white/8 bg-white/4" : "border-black/8 bg-black/2"
                }`}
              />

              <div className="grid grid-cols-2 gap-3">
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as "WEB_DEV" | "DSA")}
                  className={`h-10 rounded-lg border px-3 text-sm outline-none ${
                    isDark ? "border-white/8 bg-white/4" : "border-black/8 bg-black/2"
                  }`}
                >
                  <option value="WEB_DEV">WEB_DEV</option>
                  <option value="DSA">DSA</option>
                </select>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as "EASY" | "MEDIUM" | "HARD")}
                  className={`h-10 rounded-lg border px-3 text-sm outline-none ${
                    isDark ? "border-white/8 bg-white/4" : "border-black/8 bg-black/2"
                  }`}
                >
                  <option value="EASY">EASY</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HARD">HARD</option>
                </select>
                <input
                  type="datetime-local"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className={`h-10 rounded-lg border px-3 text-sm outline-none ${
                    isDark ? "border-white/8 bg-white/4" : "border-black/8 bg-black/2"
                  }`}
                />
                <input
                  type="number"
                  min={1}
                  value={maxMarks}
                  onChange={(e) => setMaxMarks(Number(e.target.value))}
                  className={`h-10 rounded-lg border px-3 text-sm outline-none ${
                    isDark ? "border-white/8 bg-white/4" : "border-black/8 bg-black/2"
                  }`}
                />
              </div>

              {type === "WEB_DEV" && (
                <div className="space-y-3 rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <input
                      value={template}
                      onChange={(e) => setTemplate(e.target.value)}
                      placeholder="Template (e.g. vite-react-ts)"
                      className={`h-10 rounded-lg border px-3 text-sm outline-none ${
                        isDark ? "border-white/8 bg-white/4" : "border-black/8 bg-black/2"
                      }`}
                    />
                    <input
                      value={referenceImages}
                      onChange={(e) => setReferenceImages(e.target.value)}
                      placeholder="Reference image URLs (comma-separated)"
                      className={`h-10 rounded-lg border px-3 text-sm outline-none ${
                        isDark ? "border-white/8 bg-white/4" : "border-black/8 bg-black/2"
                      }`}
                    />
                  </div>

                  <textarea
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="Detailed assignment instructions"
                    rows={3}
                    className={`w-full rounded-lg border px-3 py-2 text-sm outline-none ${
                      isDark ? "border-white/8 bg-white/4" : "border-black/8 bg-black/2"
                    }`}
                  />

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <input
                      value={lockedFiles}
                      onChange={(e) => setLockedFiles(e.target.value)}
                      placeholder="Locked files (comma-separated paths)"
                      className={`h-10 rounded-lg border px-3 text-sm outline-none ${
                        isDark ? "border-white/8 bg-white/4" : "border-black/8 bg-black/2"
                      }`}
                    />
                    <input
                      value={editableFiles}
                      onChange={(e) => setEditableFiles(e.target.value)}
                      placeholder="Editable files (comma-separated paths)"
                      className={`h-10 rounded-lg border px-3 text-sm outline-none ${
                        isDark ? "border-white/8 bg-white/4" : "border-black/8 bg-black/2"
                      }`}
                    />
                  </div>
                </div>
              )}

              {type === "DSA" && (
                <div className="space-y-3 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value as "cpp" | "python" | "java")}
                      className={`h-10 rounded-lg border px-3 text-sm outline-none ${
                        isDark ? "border-white/8 bg-white/4" : "border-black/8 bg-black/2"
                      }`}
                    >
                      <option value="cpp">C++</option>
                      <option value="python">Python</option>
                      <option value="java">Java</option>
                    </select>
                  </div>

                  <textarea
                    value={starterCodeMap[language]}
                    onChange={(e) => setStarterCodeMap((prev) => ({ ...prev, [language]: e.target.value }))}
                    placeholder="Starter code for selected language"
                    rows={8}
                    className={`w-full rounded-lg border px-3 py-2 font-mono text-xs outline-none ${
                      isDark ? "border-white/8 bg-white/4" : "border-black/8 bg-black/2"
                    }`}
                  />

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-zinc-300">Testcases</p>
                      <button
                        type="button"
                        onClick={() =>
                          setTestCases((prev) => [
                            ...prev,
                            { input: "", expectedOutput: "", weight: 1, isHidden: false },
                          ])
                        }
                        className="rounded-md bg-white/10 px-2 py-1 text-xs text-zinc-200"
                      >
                        Add testcase
                      </button>
                    </div>

                    {testCases.length === 0 && <p className="text-xs text-zinc-500">No testcases added yet.</p>}

                    {testCases.map((tc, idx) => (
                      <div key={idx} className="rounded-md border border-white/8 bg-zinc-900/50 p-3">
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <textarea
                            value={tc.input}
                            onChange={(e) =>
                              setTestCases((prev) =>
                                prev.map((item, i) => (i === idx ? { ...item, input: e.target.value } : item))
                              )
                            }
                            rows={2}
                            placeholder="Input"
                            className="rounded border border-white/10 bg-zinc-950 p-2 text-xs text-zinc-200 outline-none"
                          />
                          <textarea
                            value={tc.expectedOutput}
                            onChange={(e) =>
                              setTestCases((prev) =>
                                prev.map((item, i) => (i === idx ? { ...item, expectedOutput: e.target.value } : item))
                              )
                            }
                            rows={2}
                            placeholder="Expected output"
                            className="rounded border border-white/10 bg-zinc-950 p-2 text-xs text-zinc-200 outline-none"
                          />
                        </div>

                        <div className="mt-2 flex items-center gap-3">
                          <label className="flex items-center gap-1 text-xs text-zinc-300">
                            <input
                              type="checkbox"
                              checked={tc.isHidden}
                              onChange={(e) =>
                                setTestCases((prev) =>
                                  prev.map((item, i) => (i === idx ? { ...item, isHidden: e.target.checked } : item))
                                )
                              }
                            />
                            Hidden
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={tc.weight}
                            onChange={(e) =>
                              setTestCases((prev) =>
                                prev.map((item, i) =>
                                  i === idx ? { ...item, weight: Math.max(1, Number(e.target.value) || 1) } : item
                                )
                              )
                            }
                            className="h-8 w-20 rounded border border-white/10 bg-zinc-950 px-2 text-xs text-zinc-200 outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setTestCases((prev) => prev.filter((_, i) => i !== idx))}
                            className="text-xs text-red-400"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <label className="flex items-center gap-2 text-sm text-zinc-400">
                <input type="checkbox" checked={aiAllowed} onChange={(e) => setAiAllowed(e.target.checked)} />
                Allow AI assistance
              </label>
            </div>

            <div className="mt-4 flex justify-end border-t border-white/8 pt-4">
              <button
                onClick={handleCreate}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-yellow-400 px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {saving ? "Creating" : "Create Assignment"}
              </button>
            </div>
          </motion.div>

          <AIGenerateAssignmentModal
            open={showAIModal}
            onClose={() => setShowAIModal(false)}
            onUseProblem={applyAIProblem}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
