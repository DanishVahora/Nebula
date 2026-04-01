import { useMemo, useState } from "react";

export interface GeneratedProblem {
  title: string;
  description: string;
  constraints: string;
  examples: Array<{ input: string; output: string; explanation: string }>;
  starterCode: { cpp: string; python: string; java: string };
  testcases: Array<{ input: string; expectedOutput: string; isHidden: boolean; weight: number }>;
}

interface Props {
  value: GeneratedProblem;
  onChange: (next: GeneratedProblem) => void;
}

export function AIProblemPreview({ value, onChange }: Props) {
  const [langTab, setLangTab] = useState<"cpp" | "python" | "java">("cpp");

  const visibleCount = useMemo(() => value.testcases.filter((tc) => !tc.isHidden).length, [value.testcases]);
  const hiddenCount = useMemo(() => value.testcases.filter((tc) => tc.isHidden).length, [value.testcases]);

  const update = <K extends keyof GeneratedProblem>(key: K, fieldValue: GeneratedProblem[K]) => {
    onChange({ ...value, [key]: fieldValue });
  };

  const updateStarterCode = (lang: "cpp" | "python" | "java", code: string) => {
    update("starterCode", { ...value.starterCode, [lang]: code });
  };

  const updateTestcase = (idx: number, patch: Partial<GeneratedProblem["testcases"][number]>) => {
    const next = [...value.testcases];
    next[idx] = { ...next[idx], ...patch };
    update("testcases", next);
  };

  const addTestcase = () => {
    update("testcases", [...value.testcases, { input: "", expectedOutput: "", isHidden: false, weight: 1 }]);
  };

  const removeTestcase = (idx: number) => {
    update("testcases", value.testcases.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-4 rounded-xl border border-white/8 bg-zinc-950 p-4">
      <div className="rounded-lg border border-white/8 bg-white/3 p-3">
        <h4 className="text-sm font-semibold">Problem</h4>
        <input
          value={value.title}
          onChange={(e) => update("title", e.target.value)}
          placeholder="Title"
          className="mt-2 h-10 w-full rounded-md border border-white/10 bg-zinc-900 px-3 text-sm text-zinc-200 outline-none"
        />
        <textarea
          value={value.description}
          onChange={(e) => update("description", e.target.value)}
          placeholder="Description"
          rows={6}
          className="mt-2 w-full rounded-md border border-white/10 bg-zinc-900 p-3 text-sm text-zinc-200 outline-none"
        />
        <textarea
          value={value.constraints}
          onChange={(e) => update("constraints", e.target.value)}
          placeholder="Constraints"
          rows={3}
          className="mt-2 w-full rounded-md border border-white/10 bg-zinc-900 p-3 text-sm text-zinc-200 outline-none"
        />
      </div>

      <div className="rounded-lg border border-white/8 bg-white/3 p-3">
        <h4 className="text-sm font-semibold">Examples</h4>
        <div className="mt-2 space-y-2">
          {value.examples.map((ex, idx) => (
            <div key={idx} className="rounded-md border border-white/8 bg-zinc-900/60 p-3 text-xs">
              <p className="font-semibold text-zinc-200">Example {idx + 1}</p>
              <p className="mt-1 text-zinc-400">Input</p>
              <pre className="mt-1 whitespace-pre-wrap text-zinc-200">{ex.input}</pre>
              <p className="mt-1 text-zinc-400">Output</p>
              <pre className="mt-1 whitespace-pre-wrap text-zinc-200">{ex.output}</pre>
              <p className="mt-1 text-zinc-400">Explanation</p>
              <pre className="mt-1 whitespace-pre-wrap text-zinc-200">{ex.explanation}</pre>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-white/8 bg-white/3 p-3">
        <h4 className="text-sm font-semibold">Starter Code</h4>
        <div className="mt-2 flex gap-2">
          {(["cpp", "python", "java"] as const).map((lang) => (
            <button
              key={lang}
              onClick={() => setLangTab(lang)}
              className={`rounded-md px-3 py-1 text-xs font-medium ${
                langTab === lang ? "bg-yellow-400 text-black" : "bg-white/10 text-zinc-300"
              }`}
            >
              {lang.toUpperCase()}
            </button>
          ))}
        </div>
        <textarea
          value={value.starterCode[langTab]}
          onChange={(e) => updateStarterCode(langTab, e.target.value)}
          rows={10}
          className="mt-2 w-full rounded-md border border-white/10 bg-zinc-900 p-3 font-mono text-xs text-zinc-200 outline-none"
        />
      </div>

      <div className="rounded-lg border border-white/8 bg-white/3 p-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold">Testcases</h4>
          <p className="text-xs text-zinc-400">{visibleCount} visible • {hiddenCount} hidden</p>
        </div>

        <div className="mt-2 space-y-2">
          {value.testcases.map((tc, idx) => (
            <div key={idx} className="rounded-md border border-white/8 bg-zinc-900/60 p-3">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <textarea
                  value={tc.input}
                  onChange={(e) => updateTestcase(idx, { input: e.target.value })}
                  rows={2}
                  placeholder="Input"
                  className="rounded border border-white/10 bg-zinc-950 p-2 text-xs text-zinc-200 outline-none"
                />
                <textarea
                  value={tc.expectedOutput}
                  onChange={(e) => updateTestcase(idx, { expectedOutput: e.target.value })}
                  rows={2}
                  placeholder="Expected Output"
                  className="rounded border border-white/10 bg-zinc-950 p-2 text-xs text-zinc-200 outline-none"
                />
              </div>
              <div className="mt-2 flex items-center gap-3">
                <label className="flex items-center gap-1 text-xs text-zinc-300">
                  <input
                    type="checkbox"
                    checked={tc.isHidden}
                    onChange={(e) => updateTestcase(idx, { isHidden: e.target.checked })}
                  />
                  Hidden
                </label>
                <input
                  type="number"
                  min={1}
                  value={tc.weight}
                  onChange={(e) => updateTestcase(idx, { weight: Math.max(1, Number(e.target.value) || 1) })}
                  className="h-8 w-20 rounded border border-white/10 bg-zinc-950 px-2 text-xs text-zinc-200 outline-none"
                />
                <button onClick={() => removeTestcase(idx)} className="text-xs text-red-400">Remove</button>
              </div>
            </div>
          ))}
        </div>

        <button onClick={addTestcase} className="mt-2 rounded-md bg-white/10 px-3 py-1 text-xs text-zinc-200">
          Add Testcase
        </button>
      </div>
    </div>
  );
}
