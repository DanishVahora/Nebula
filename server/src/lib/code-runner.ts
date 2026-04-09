// ── DSA Code Runner ──────────────────────────────────────
// Executes student code against test cases in isolated temp dirs.

import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";
import os from "os";
import crypto from "crypto";

export interface TestCaseInput {
  id: string;
  input: string;
  expectedOutput: string;
  weight: number;
}

export interface TestResult {
  testCaseId: string;
  passed: boolean;
  actualOutput: string;
  expectedOutput: string;
  error?: string;
  executionTime: number; // ms
}

export interface RunDSAOptions {
  assignmentTitle?: string;
  preferFunctionMode?: boolean;
}

const EXEC_TIMEOUT = 10_000; // 10 seconds per test case

function makeTempDir(): string {
  return path.join(os.tmpdir(), `nebula-run-${crypto.randomBytes(8).toString("hex")}`);
}

async function cleanup(dir: string) {
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch {
    // Best effort cleanup
  }
}

function execWithTimeout(
  command: string,
  args: string[],
  cwd: string,
  stdin: string,
  timeout: number
): Promise<{ stdout: string; stderr: string; exitCode: number; time: number }> {
  return new Promise((resolve) => {
    const start = Date.now();
    const child = spawn(command, args, {
      cwd,
      stdio: ["pipe", "pipe", "pipe"],
      timeout,
      env: { ...process.env, FORCE_COLOR: "0" },
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (d: Buffer) => { stdout += d.toString(); });
    child.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });

    child.stdin.write(stdin);
    child.stdin.end();

    child.on("close", (code) => {
      resolve({ stdout, stderr, exitCode: code ?? 1, time: Date.now() - start });
    });

    child.on("error", (err) => {
      resolve({ stdout, stderr: err.message, exitCode: 1, time: Date.now() - start });
    });
  });
}

async function runCpp(code: string, input: string, tmpDir: string) {
  const srcFile = path.join(tmpDir, "main.cpp");
  const outFile = path.join(tmpDir, "main");
  await fs.writeFile(srcFile, code, "utf-8");

  // Compile
  const compile = await execWithTimeout("g++", ["-o", outFile, srcFile, "-std=c++17"], tmpDir, "", EXEC_TIMEOUT);
  if (compile.exitCode !== 0) {
    return { stdout: "", stderr: `Compilation Error:\n${compile.stderr}`, exitCode: 1, time: compile.time };
  }

  // Run
  return execWithTimeout(outFile, [], tmpDir, input, EXEC_TIMEOUT);
}

type CppParam = { type: string; name: string };
type CppFunctionSignature = { returnType: string; name: string; params: CppParam[] };

function hasCppMain(code: string): boolean {
  return /\bint\s+main\s*\(/.test(code);
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

function splitTopLevelCsv(value: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let current = "";

  for (const ch of value) {
    if (ch === "<") depth += 1;
    if (ch === ">") depth = Math.max(0, depth - 1);

    if (ch === "," && depth === 0) {
      out.push(current.trim());
      current = "";
      continue;
    }

    current += ch;
  }

  if (current.trim()) out.push(current.trim());
  return out;
}

function normalizeCppType(type: string): string {
  return type
    .replace(/\bconst\b/g, "")
    .replace(/[&*]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\s*<\s*/g, "<")
    .replace(/\s*>\s*/g, ">")
    .replace(/\s*,\s*/g, ",");
}

function parseCppSignature(code: string, assignmentTitle?: string): CppFunctionSignature | null {
  const regex = /([A-Za-z_][\w:<>,\s&*]*?)\s+([A-Za-z_][\w]*)\s*\(([^)]*)\)\s*\{/g;
  const candidates: CppFunctionSignature[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(code)) !== null) {
    const returnType = normalizeCppType(match[1] || "");
    const name = String(match[2] || "").trim();
    const paramsRaw = String(match[3] || "").trim();

    if (!returnType || !name) continue;
    if (name === "main") continue;
    if (["if", "for", "while", "switch", "catch"].includes(name)) continue;

    const params = paramsRaw
      ? splitTopLevelCsv(paramsRaw)
        .map((entry) => {
          const cleaned = entry.replace(/=[^,]+$/, "").trim();
          const m = cleaned.match(/^(.*\S)\s+([A-Za-z_][\w]*)$/);
          if (!m) return null;
          return { type: normalizeCppType(m[1]), name: m[2] } as CppParam;
        })
        .filter((x): x is CppParam => !!x)
      : [];

    candidates.push({ returnType, name, params });
  }

  if (candidates.length === 0) return null;

  const preferred = toCamelCaseTitle(assignmentTitle || "");
  const preferredNorm = preferred.replace(/_/g, "").toLowerCase();
  const exact = candidates.find((c) => c.name.replace(/_/g, "").toLowerCase() === preferredNorm);
  return exact || candidates[0];
}

function jsonToCppLiteral(value: any, type: string): string | null {
  const t = normalizeCppType(type);

  if (t === "int" || t === "long" || t === "long long") {
    if (typeof value !== "number" || !Number.isFinite(value)) return null;
    return Number.isInteger(value) ? String(value) : String(Math.trunc(value));
  }

  if (t === "double" || t === "float") {
    if (typeof value !== "number" || !Number.isFinite(value)) return null;
    return String(value);
  }

  if (t === "bool") {
    if (typeof value !== "boolean") return null;
    return value ? "true" : "false";
  }

  if (t === "string" || t === "std::string") {
    if (typeof value !== "string") return null;
    return JSON.stringify(value);
  }

  if (t === "vector<int>" || t === "std::vector<int>") {
    if (!Array.isArray(value) || value.some((x) => typeof x !== "number" || !Number.isFinite(x))) return null;
    return `{${value.map((x) => String(Math.trunc(x))).join(",")}}`;
  }

  if (t === "vector<long long>" || t === "std::vector<long long>") {
    if (!Array.isArray(value) || value.some((x) => typeof x !== "number" || !Number.isFinite(x))) return null;
    return `{${value.map((x) => String(Math.trunc(x))).join(",")}}`;
  }

  if (t === "vector<string>" || t === "std::vector<string>") {
    if (!Array.isArray(value) || value.some((x) => typeof x !== "string")) return null;
    return `{${value.map((x) => JSON.stringify(x)).join(",")}}`;
  }

  return null;
}

function stableJson(value: any): string {
  if (Array.isArray(value)) return `[${value.map((x) => stableJson(x)).join(",")}]`;
  if (value && typeof value === "object") {
    const keys = Object.keys(value).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${stableJson(value[k])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function normalizeExpectedValue(raw: string): string {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return "";

  try {
    return stableJson(JSON.parse(trimmed));
  } catch {
    return trimmed;
  }
}

function buildCppFunctionHarness(userCode: string, sig: CppFunctionSignature, argLiterals: string[]): string {
  const vars = sig.params.map((p, i) => `  ${normalizeCppType(p.type)} __arg${i} = ${argLiterals[i]};`).join("\n");
  const callArgs = sig.params.map((_, i) => `__arg${i}`).join(", ");

  return `${userCode}

static string __orbit_json_escape(const string& s) {
  string out = "\"";
  for (char c : s) {
    switch (c) {
      case '\\': out += "\\\\"; break;
      case '"': out += "\\\""; break;
      case '\n': out += "\\n"; break;
      case '\r': out += "\\r"; break;
      case '\t': out += "\\t"; break;
      default: out += c; break;
    }
  }
  out += "\"";
  return out;
}

template <typename T>
static string __orbit_to_json_value(const T& v) {
  return to_string(v);
}

static string __orbit_to_json_value(const bool& v) {
  return v ? "true" : "false";
}

static string __orbit_to_json_value(const string& v) {
  return __orbit_json_escape(v);
}

template <typename T>
static string __orbit_to_json_value(const vector<T>& v) {
  string out = "[";
  for (size_t i = 0; i < v.size(); ++i) {
    if (i) out += ",";
    out += __orbit_to_json_value(v[i]);
  }
  out += "]";
  return out;
}

int main() {
${vars}
  auto __orbit_result = ${sig.name}(${callArgs});
  cout << __orbit_to_json_value(__orbit_result);
  return 0;
}
`;
}

function parseFunctionInputArgs(rawInput: string): { positional: any[] } | { invalid: string } {
  const text = String(rawInput || "").trim();
  if (!text) return { invalid: "Input must be JSON array for function mode" };

  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return { positional: parsed };
    if (parsed && typeof parsed === "object" && Array.isArray((parsed as any).args)) {
      return { positional: (parsed as any).args };
    }
    return { invalid: "Input JSON must be an array of function arguments" };
  } catch {
    return { invalid: "Input must be valid JSON (array of function arguments)" };
  }
}

async function runCppFunctionMode(
  code: string,
  testCase: TestCaseInput,
  tmpDir: string,
  assignmentTitle?: string
) {
  const sig = parseCppSignature(code, assignmentTitle);
  if (!sig) {
    return {
      stdout: "",
      stderr:
        "Function mode could not find a valid C++ function signature. Define a function (not main) with supported types.",
      exitCode: 1,
      time: 0,
      expectedOutput: normalizeExpectedValue(testCase.expectedOutput),
    };
  }

  const parsed = parseFunctionInputArgs(testCase.input);
  if ("invalid" in parsed) {
    return {
      stdout: "",
      stderr: `Invalid testcase input for function mode: ${parsed.invalid}`,
      exitCode: 1,
      time: 0,
      expectedOutput: normalizeExpectedValue(testCase.expectedOutput),
    };
  }

  if (parsed.positional.length !== sig.params.length) {
    return {
      stdout: "",
      stderr: `Argument count mismatch. Function ${sig.name} expects ${sig.params.length}, testcase provides ${parsed.positional.length}.`,
      exitCode: 1,
      time: 0,
      expectedOutput: normalizeExpectedValue(testCase.expectedOutput),
    };
  }

  const argLiterals: string[] = [];
  for (let i = 0; i < sig.params.length; i += 1) {
    const lit = jsonToCppLiteral(parsed.positional[i], sig.params[i].type);
    if (lit == null) {
      return {
        stdout: "",
        stderr: `Unsupported or mismatched argument type for parameter '${sig.params[i].name}' (${sig.params[i].type}).`,
        exitCode: 1,
        time: 0,
        expectedOutput: normalizeExpectedValue(testCase.expectedOutput),
      };
    }
    argLiterals.push(lit);
  }

  const wrapped = buildCppFunctionHarness(code, sig, argLiterals);
  const run = await runCpp(wrapped, "", tmpDir);
  return {
    ...run,
    stdout: normalizeExpectedValue(run.stdout),
    expectedOutput: normalizeExpectedValue(testCase.expectedOutput),
  };
}

async function runPython(code: string, input: string, tmpDir: string) {
  const srcFile = path.join(tmpDir, "main.py");
  await fs.writeFile(srcFile, code, "utf-8");
  return execWithTimeout("python", [srcFile], tmpDir, input, EXEC_TIMEOUT);
}

async function runJava(code: string, input: string, tmpDir: string) {
  const srcFile = path.join(tmpDir, "Main.java");
  await fs.writeFile(srcFile, code, "utf-8");

  // Compile
  const compile = await execWithTimeout("javac", [srcFile], tmpDir, "", EXEC_TIMEOUT);
  if (compile.exitCode !== 0) {
    return { stdout: "", stderr: `Compilation Error:\n${compile.stderr}`, exitCode: 1, time: compile.time };
  }

  // Run
  return execWithTimeout("java", ["-cp", tmpDir, "Main"], tmpDir, input, EXEC_TIMEOUT);
}

export async function runDSATests(
  code: string,
  language: string,
  testCases: TestCaseInput[],
  options: RunDSAOptions = {}
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const tmpDir = makeTempDir();

  try {
    await fs.mkdir(tmpDir, { recursive: true });

    for (const tc of testCases) {
      let result;
      try {
        switch (language) {
          case "cpp":
            if (options.preferFunctionMode && !hasCppMain(code)) {
              result = await runCppFunctionMode(code, tc, tmpDir, options.assignmentTitle);
            } else {
              result = await runCpp(code, tc.input, tmpDir);
              result = {
                ...result,
                stdout: result.stdout.trim(),
                expectedOutput: tc.expectedOutput.trim(),
              };
            }
            break;
          case "python":
            result = await runPython(code, tc.input, tmpDir);
            result = {
              ...result,
              stdout: result.stdout.trim(),
              expectedOutput: tc.expectedOutput.trim(),
            };
            break;
          case "java":
            result = await runJava(code, tc.input, tmpDir);
            result = {
              ...result,
              stdout: result.stdout.trim(),
              expectedOutput: tc.expectedOutput.trim(),
            };
            break;
          default:
            result = {
              stdout: "",
              stderr: `Unsupported language: ${language}`,
              exitCode: 1,
              time: 0,
              expectedOutput: tc.expectedOutput.trim(),
            };
        }

        const actual = result.stdout;
        const expected = result.expectedOutput ?? tc.expectedOutput.trim();

        results.push({
          testCaseId: tc.id,
          passed: result.exitCode === 0 && actual === expected,
          actualOutput: actual,
          expectedOutput: expected,
          error: result.exitCode !== 0 ? result.stderr : undefined,
          executionTime: result.time,
        });
      } catch (err: any) {
        results.push({
          testCaseId: tc.id,
          passed: false,
          actualOutput: "",
          expectedOutput: tc.expectedOutput.trim(),
          error: err.message || "Execution error",
          executionTime: 0,
        });
      }
    }
  } finally {
    await cleanup(tmpDir);
  }

  return results;
}
