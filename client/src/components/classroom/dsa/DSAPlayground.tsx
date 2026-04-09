import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { RotateCcw, Play, Send } from "lucide-react";
import { dsaAPI } from "@/lib/api";
import { ProblemPanel } from "./ProblemPanel";
import { CodeEditorPanel } from "./CodeEditorPanel";
import { TestcasePanel } from "./TestcasePanel";
import { ResultPanel } from "./ResultPanel";
import { LanguageSelector } from "./LanguageSelector";
import { SubmissionSummary } from "./SubmissionSummary";

interface Props {
  assignment: any;
  mySubmission: any;
  onRefresh: () => Promise<void>;
}

function toCamelCaseTitle(title: string): string {
  const words = String(title || "")
    .replace(/[^a-zA-Z0-9\s]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return "solve";
  return words
    .map((w, i) => (i === 0 ? w.toLowerCase() : `${w[0].toUpperCase()}${w.slice(1).toLowerCase()}`))
    .join("");
}

function toSnakeCaseTitle(title: string): string {
  const words = String(title || "")
    .replace(/[^a-zA-Z0-9\s]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.toLowerCase());
  return words.length ? words.join("_") : "solve";
}

function defaultStarter(language: "cpp" | "python" | "java", title: string): string {
  const fnCamel = toCamelCaseTitle(title);
  const fnSnake = toSnakeCaseTitle(title);

  if (language === "cpp") {
    return `#include <bits/stdc++.h>
using namespace std;

// Return type and parameter types can be adjusted for your problem.
vector<int> ${fnCamel}(vector<int>& nums, int target) {
    // Write your solution
    return {};
}

function looksLikeLegacyMainStarter(code: string, language: "cpp" | "python" | "java"): boolean {
  const normalized = String(code || "");
  if (!normalized.trim()) return true;

  if (language === "cpp") {
    return /\bint\s+main\s*\(/.test(normalized) && !/\b[a-zA-Z_]\w*\s*\([^)]*\)\s*\{/.test(normalized.replace(/\bint\s+main\s*\([^)]*\)\s*\{/g, ""));
  }

  if (language === "python") {
    return /def\s+solve\s*\(/.test(normalized);
  }

  return /public\s+static\s+void\s+main\s*\(/.test(normalized) && !/public\s+static\s+[A-Za-z0-9_<>,\[\]]+\s+[a-zA-Z_]\w*\s*\(/.test(normalized.replace(/public\s+static\s+void\s+main\s*\([^)]*\)\s*\{/g, ""));
}
`;
  }

  if (language === "python") {
    return `# Return type and parameter types can be adjusted for your problem.
def ${fnSnake}(nums, target):
    # Write your solution
    return []
`;
  }

  return `import java.util.*;

public class Main {
    // Return type and parameter types can be adjusted for your problem.
    public static List<Integer> ${fnCamel}(List<Integer> nums, int target) {
        // Write your solution
        return new ArrayList<>();
    }
}
`;
}

function getStarterByLanguage(starterCode: unknown, language: "cpp" | "python" | "java", title: string) {
  if (starterCode && typeof starterCode === "object") {
    const map = starterCode as Record<string, string>;
    if (typeof map[language] === "string") {
      if (looksLikeLegacyMainStarter(map[language], language)) return defaultStarter(language, title);
      return map[language];
    }
    if (typeof map.default === "string") {
      if (looksLikeLegacyMainStarter(map.default, language)) return defaultStarter(language, title);
      return map.default;
    }
  }
  return defaultStarter(language, title);
}

export function DSAPlayground({ assignment, mySubmission, onRefresh }: Props) {
  const [language, setLanguage] = useState<"cpp" | "python" | "java">("cpp");
  const [codeByLanguage, setCodeByLanguage] = useState<Record<"cpp" | "python" | "java", string>>(() => ({
    cpp: getStarterByLanguage(assignment.starterCode, "cpp", assignment.title),
    python: getStarterByLanguage(assignment.starterCode, "python", assignment.title),
    java: getStarterByLanguage(assignment.starterCode, "java", assignment.title),
  }));

  const [customInput, setCustomInput] = useState("");
  const [customExpectedOutput, setCustomExpectedOutput] = useState("");
  const [runResults, setRunResults] = useState<any[]>([]);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submissionSummary, setSubmissionSummary] = useState<{
    passed: number;
    total: number;
    score: number;
    maxMarks?: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const code = codeByLanguage[language];

  const visibleTestCases = useMemo(
    () => (assignment.testCases || []).filter((tc: any) => !tc.isHidden),
    [assignment.testCases]
  );

  const updateCode = (next: string) => {
    setCodeByLanguage((prev) => ({ ...prev, [language]: next }));
  };

  const handleRun = async () => {
    setRunning(true);
    setError(null);
    try {
      const { data } = await dsaAPI.run({
        assignmentId: assignment.id,
        code,
        language,
        customInput: customInput.trim() || undefined,
        customExpectedOutput: customExpectedOutput.trim() || undefined,
      });
      setRunResults(data.results || []);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to run testcases");
    } finally {
      setRunning(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const { data } = await dsaAPI.submit({
        assignmentId: assignment.id,
        code,
        language,
      });
      setSubmissionSummary(data.summary || null);
      setRunResults(data.results || []);
      await onRefresh();
    } catch (err: any) {
      setError(err?.response?.data?.error || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setCodeByLanguage((prev) => ({
      ...prev,
      [language]: getStarterByLanguage(assignment.starterCode, language, assignment.title),
    }));
    setRunResults([]);
    setError(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/8 bg-white/3 p-3">
        <LanguageSelector value={language} onChange={setLanguage} />

        <div className="flex items-center gap-2">
          <button
            onClick={handleRun}
            disabled={running || submitting}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-semibold text-black disabled:opacity-50"
          >
            <Play className="h-3.5 w-3.5" />
            {running ? "Running..." : "Run"}
          </button>
          <button
            onClick={handleSubmit}
            disabled={running || submitting}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-black disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
            {submitting ? "Submitting..." : "Submit"}
          </button>
          <button
            onClick={handleReset}
            disabled={running || submitting}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-zinc-200 disabled:opacity-50"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-300">{error}</div>
      )}

      <SubmissionSummary
        summary={
          submissionSummary ||
          (mySubmission?.status === "SUBMITTED" && typeof mySubmission?.score === "number"
            ? {
              passed: 0,
              total: assignment.testCases?.length || 0,
              score: mySubmission.score,
              maxMarks: assignment.maxMarks,
            }
            : null)
        }
      />

      <div className="grid h-160 grid-cols-1 gap-3 lg:grid-cols-2">
        <ProblemPanel
          title={assignment.title}
          description={assignment.description}
          difficulty={assignment.difficulty}
          examples={visibleTestCases}
        />
        <CodeEditorPanel code={code} language={language} onChange={updateCode} />
      </div>

      <div className="grid h-80 grid-cols-1 gap-3 lg:grid-cols-2">
        <TestcasePanel
          testCases={visibleTestCases}
          customInput={customInput}
          customExpectedOutput={customExpectedOutput}
          onCustomInputChange={setCustomInput}
          onCustomExpectedOutputChange={setCustomExpectedOutput}
        />
        <ResultPanel results={runResults} loading={running || submitting} />
      </div>
    </motion.div>
  );
}
