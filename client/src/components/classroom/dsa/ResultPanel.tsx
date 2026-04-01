import { CheckCircle2, XCircle } from "lucide-react";

interface ResultItem {
  input: string;
  expectedOutput: string;
  actualOutput: string;
  passed: boolean;
  executionTime: number;
  error?: string;
}

interface Props {
  results: ResultItem[];
  loading?: boolean;
}

export function ResultPanel({ results, loading }: Props) {
  const passedCount = results.filter((r) => r.passed).length;

  return (
    <div className="h-full overflow-y-auto rounded-xl border border-white/8 bg-white/3 p-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Results</h4>
        <span className="text-xs text-zinc-400">
          {results.length > 0 ? `${passedCount}/${results.length} passed` : "No runs yet"}
        </span>
      </div>

      {loading && <p className="mt-3 text-xs text-zinc-500">Running testcases...</p>}

      {!loading && results.length === 0 && (
        <p className="mt-3 text-xs text-zinc-500">Press Run to evaluate your code.</p>
      )}

      <div className="mt-3 space-y-2">
        {results.map((result, index) => (
          <div key={index} className="rounded-lg border border-white/8 bg-zinc-900/60 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-200">Case {index + 1}</span>
              <span className={`inline-flex items-center gap-1 text-xs ${result.passed ? "text-emerald-400" : "text-red-400"}`}>
                {result.passed ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                {result.passed ? "Passed" : "Failed"}
              </span>
            </div>

            <p className="mt-2 text-[11px] text-zinc-400">Input</p>
            <pre className="mt-1 overflow-x-auto rounded bg-zinc-950 p-2 text-xs text-zinc-200">{result.input || "-"}</pre>

            <p className="mt-2 text-[11px] text-zinc-400">Expected</p>
            <pre className="mt-1 overflow-x-auto rounded bg-zinc-950 p-2 text-xs text-zinc-200">{result.expectedOutput || "-"}</pre>

            <p className="mt-2 text-[11px] text-zinc-400">Actual</p>
            <pre className="mt-1 overflow-x-auto rounded bg-zinc-950 p-2 text-xs text-zinc-200">{result.actualOutput || "-"}</pre>

            <p className="mt-2 text-[11px] text-zinc-500">Execution: {result.executionTime} ms</p>
            {result.error && <p className="mt-1 text-xs text-red-400">{result.error}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
