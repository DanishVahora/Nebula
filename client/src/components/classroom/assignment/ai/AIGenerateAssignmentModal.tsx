import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { assignmentAPI } from "@/lib/api";
import { AIGenerateForm } from "./AIGenerateForm";
import { AIProblemPreview, type GeneratedProblem } from "./AIProblemPreview";

interface Props {
  open: boolean;
  onClose: () => void;
  onUseProblem: (problem: GeneratedProblem, preferredLanguage: "cpp" | "python" | "java") => void;
}

const EMPTY_PROBLEM: GeneratedProblem = {
  title: "",
  description: "",
  constraints: "",
  examples: [],
  starterCode: { cpp: "", python: "", java: "" },
  testcases: [],
};

export function AIGenerateAssignmentModal({ open, onClose, onUseProblem }: Props) {
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<"EASY" | "MEDIUM" | "HARD">("MEDIUM");
  const [language, setLanguage] = useState<"cpp" | "python" | "java">("cpp");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [problem, setProblem] = useState<GeneratedProblem>(EMPTY_PROBLEM);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await assignmentAPI.aiGenerate({ topic, difficulty, language });
      setProblem(data.generated || EMPTY_PROBLEM);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to generate assignment");
    } finally {
      setLoading(false);
    }
  };

  const handleUse = () => {
    if (!problem.title.trim()) {
      setError("Generate a problem first");
      return;
    }
    onUseProblem(problem, language);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
            className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 p-4"
        >
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex h-[90vh] w-full max-w-6xl flex-col rounded-2xl border border-white/8 bg-zinc-950 p-5"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-yellow-400" />
                <h3 className="text-lg font-semibold">Generate DSA Assignment with AI</h3>
              </div>
              <button onClick={onClose} className="rounded-md p-2 text-zinc-500 hover:bg-white/5">
                <X className="h-4 w-4" />
              </button>
            </div>

            {error && <div className="mb-3 rounded-md border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-300">{error}</div>}

            <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[360px_1fr]">
              <AIGenerateForm
                topic={topic}
                difficulty={difficulty}
                language={language}
                loading={loading}
                onTopicChange={setTopic}
                onDifficultyChange={setDifficulty}
                onLanguageChange={setLanguage}
                onGenerate={handleGenerate}
              />

              <div className="min-h-0 overflow-y-auto">
                <AIProblemPreview value={problem} onChange={setProblem} />
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200">Cancel</button>
              <button onClick={handleUse} className="rounded-lg bg-yellow-400 px-4 py-2 text-sm font-semibold text-black">
                Use This Problem
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
