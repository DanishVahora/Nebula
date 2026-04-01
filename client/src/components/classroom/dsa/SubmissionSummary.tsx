interface Props {
  summary: {
    passed: number;
    total: number;
    score: number;
    maxMarks?: number;
  } | null;
}

export function SubmissionSummary({ summary }: Props) {
  if (!summary) return null;

  return (
    <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3">
      <h4 className="text-sm font-semibold text-emerald-300">Submission Summary</h4>
      <p className="mt-1 text-xs text-emerald-200">
        Passed {summary.passed} of {summary.total} testcases
      </p>
      <p className="mt-1 text-xs text-emerald-200">
        Score: {summary.score}{typeof summary.maxMarks === "number" ? ` / ${summary.maxMarks}` : ""}
      </p>
    </div>
  );
}
