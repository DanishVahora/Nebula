interface Props {
  topic: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  language: "cpp" | "python" | "java";
  loading: boolean;
  onTopicChange: (value: string) => void;
  onDifficultyChange: (value: "EASY" | "MEDIUM" | "HARD") => void;
  onLanguageChange: (value: "cpp" | "python" | "java") => void;
  onGenerate: () => void;
}

export function AIGenerateForm({
  topic,
  difficulty,
  language,
  loading,
  onTopicChange,
  onDifficultyChange,
  onLanguageChange,
  onGenerate,
}: Props) {
  return (
    <div className="space-y-3 rounded-xl border border-white/8 bg-white/3 p-4">
      <h4 className="text-sm font-semibold">AI Prompt</h4>

      <input
        value={topic}
        onChange={(e) => onTopicChange(e.target.value)}
        placeholder="Topic (e.g. Sliding Window, Binary Search on Answer)"
        className="h-10 w-full rounded-lg border border-white/10 bg-zinc-900 px-3 text-sm text-zinc-200 outline-none focus:border-yellow-500/60"
      />

      <div className="grid grid-cols-2 gap-3">
        <select
          value={difficulty}
          onChange={(e) => onDifficultyChange(e.target.value as "EASY" | "MEDIUM" | "HARD")}
          className="h-10 rounded-lg border border-white/10 bg-zinc-900 px-3 text-sm text-zinc-200 outline-none focus:border-yellow-500/60"
        >
          <option value="EASY">EASY</option>
          <option value="MEDIUM">MEDIUM</option>
          <option value="HARD">HARD</option>
        </select>

        <select
          value={language}
          onChange={(e) => onLanguageChange(e.target.value as "cpp" | "python" | "java")}
          className="h-10 rounded-lg border border-white/10 bg-zinc-900 px-3 text-sm text-zinc-200 outline-none focus:border-yellow-500/60"
        >
          <option value="cpp">C++</option>
          <option value="python">Python</option>
          <option value="java">Java</option>
        </select>
      </div>

      <button
        onClick={onGenerate}
        disabled={loading || !topic.trim()}
        className="inline-flex items-center gap-2 rounded-lg bg-yellow-400 px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
      >
        {loading ? "Generating..." : "Generate"}
      </button>
    </div>
  );
}
