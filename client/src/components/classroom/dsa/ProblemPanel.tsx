import { motion } from "framer-motion";

interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  isHidden?: boolean;
}

interface Props {
  title: string;
  description?: string | null;
  difficulty?: string;
  examples: TestCase[];
}

export function ProblemPanel({ title, description, difficulty, examples }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className="h-full overflow-y-auto rounded-xl border border-white/8 bg-white/3 p-4"
    >
      <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
      <p className="mt-1 text-xs text-zinc-400">Difficulty: {difficulty || "MEDIUM"}</p>

      <div className="mt-4">
        <h4 className="text-sm font-semibold">Problem</h4>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-300">
          {description?.trim() || "No description provided."}
        </p>
      </div>

      <div className="mt-5 space-y-3">
        <h4 className="text-sm font-semibold">Examples</h4>
        {examples.length === 0 && <p className="text-xs text-zinc-500">No sample testcases configured.</p>}
        {examples.map((tc, index) => (
          <div key={tc.id || index} className="rounded-lg border border-white/8 bg-zinc-900/50 p-3">
            <p className="text-xs font-semibold text-zinc-200">Example {index + 1}</p>
            <p className="mt-1 text-xs text-zinc-400">Input</p>
            <pre className="mt-1 overflow-x-auto rounded bg-zinc-950 p-2 text-xs text-zinc-200">{tc.input}</pre>
            <p className="mt-2 text-xs text-zinc-400">Output</p>
            <pre className="mt-1 overflow-x-auto rounded bg-zinc-950 p-2 text-xs text-zinc-200">{tc.expectedOutput}</pre>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
