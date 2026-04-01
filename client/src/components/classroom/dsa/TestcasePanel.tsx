interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  isHidden?: boolean;
}

interface Props {
  testCases: TestCase[];
  customInput: string;
  customExpectedOutput: string;
  onCustomInputChange: (value: string) => void;
  onCustomExpectedOutputChange: (value: string) => void;
}

export function TestcasePanel({
  testCases,
  customInput,
  customExpectedOutput,
  onCustomInputChange,
  onCustomExpectedOutputChange,
}: Props) {
  return (
    <div className="h-full space-y-3 overflow-y-auto rounded-xl border border-white/8 bg-white/3 p-3">
      <h4 className="text-sm font-semibold">Sample Testcases</h4>

      {testCases.length === 0 && <p className="text-xs text-zinc-500">No visible testcases.</p>}

      {testCases.map((tc, index) => (
        <div key={tc.id || index} className="rounded-lg border border-white/8 bg-zinc-900/60 p-3">
          <p className="text-xs font-semibold text-zinc-200">Case {index + 1}</p>
          <p className="mt-2 text-[11px] text-zinc-400">Input</p>
          <pre className="mt-1 overflow-x-auto rounded bg-zinc-950 p-2 text-xs text-zinc-200">{tc.input}</pre>
          <p className="mt-2 text-[11px] text-zinc-400">Expected</p>
          <pre className="mt-1 overflow-x-auto rounded bg-zinc-950 p-2 text-xs text-zinc-200">{tc.expectedOutput}</pre>
        </div>
      ))}

      <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3">
        <h5 className="text-xs font-semibold text-yellow-300">Custom Input</h5>
        <textarea
          value={customInput}
          onChange={(e) => onCustomInputChange(e.target.value)}
          placeholder="Enter custom stdin"
          rows={3}
          className="mt-2 w-full rounded-md border border-white/10 bg-zinc-900 p-2 text-xs text-zinc-200 outline-none focus:border-yellow-500/50"
        />
        <textarea
          value={customExpectedOutput}
          onChange={(e) => onCustomExpectedOutputChange(e.target.value)}
          placeholder="Optional expected output"
          rows={2}
          className="mt-2 w-full rounded-md border border-white/10 bg-zinc-900 p-2 text-xs text-zinc-200 outline-none focus:border-yellow-500/50"
        />
      </div>
    </div>
  );
}
