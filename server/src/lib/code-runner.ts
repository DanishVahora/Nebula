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
  testCases: TestCaseInput[]
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
            result = await runCpp(code, tc.input, tmpDir);
            break;
          case "python":
            result = await runPython(code, tc.input, tmpDir);
            break;
          case "java":
            result = await runJava(code, tc.input, tmpDir);
            break;
          default:
            result = { stdout: "", stderr: `Unsupported language: ${language}`, exitCode: 1, time: 0 };
        }

        const actual = result.stdout.trim();
        const expected = tc.expectedOutput.trim();

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
