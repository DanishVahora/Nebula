import { Router, Request, Response } from "express";
import { authenticate, requireRole } from "../middleware/auth";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../config/env";

const router = Router();

type Difficulty = "EASY" | "MEDIUM" | "HARD";
type Language = "cpp" | "python" | "java";

type GeneratedProblem = {
  title: string;
  description: string;
  constraints: string;
  examples: Array<{ input: string; output: string; explanation: string }>;
  starterCode: Record<Language, string>;
  testcases: Array<{
    input: string;
    expectedOutput: string;
    isHidden: boolean;
    weight: number;
  }>;
};

const MODEL_CHAIN = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-3.1-flash-lite",
];

const DIFFICULTY_VALUES: Difficulty[] = ["EASY", "MEDIUM", "HARD"];
const LANGUAGE_VALUES: Language[] = ["cpp", "python", "java"];

function buildPrompt(topic: string, difficulty: Difficulty, language: Language) {
  return [
    "You are generating a DSA coding assignment in strict JSON format.",
    "Return ONLY valid JSON. Do not include markdown code fences.",
    "The JSON must contain exactly these top-level keys:",
    "title, description, constraints, examples, starterCode, testcases",
    "",
    "Rules:",
    `- Topic focus: ${topic}`,
    `- Difficulty: ${difficulty}`,
    `- Preferred language for examples and style: ${language}`,
    "- description should be clear and LeetCode-style.",
    "- constraints should be concise (multi-line string allowed).",
    "- examples must be an array of objects with keys: input, output, explanation.",
    "- starterCode must be an object with keys: cpp, python, java.",
    "- testcases must be an array of at least 6 items.",
    "- Include both visible and hidden testcases.",
    "- Each testcase item must have keys: input, expectedOutput, isHidden, weight.",
    "- Ensure at least 2 hidden testcases.",
    "- weight must be positive integer.",
    "- expectedOutput must exactly match output format for the input.",
    "",
    "Schema reference:",
    JSON.stringify(
      {
        title: "Two Sum",
        description: "Given an array ...",
        constraints: "1 <= n <= 1e5\\n-1e9 <= arr[i] <= 1e9",
        examples: [{ input: "4\\n2 7 11 15\\n9", output: "0 1", explanation: "arr[0]+arr[1]=9" }],
        starterCode: {
          cpp: "#include <bits/stdc++.h>\\nusing namespace std;\\nint main(){return 0;}",
          python: "def solve():\\n    pass\\n\\nif __name__ == '__main__':\\n    solve()",
          java: "public class Main { public static void main(String[] args) {} }",
        },
        testcases: [
          { input: "sample input", expectedOutput: "sample output", isHidden: false, weight: 1 },
          { input: "hidden input", expectedOutput: "hidden output", isHidden: true, weight: 2 },
        ],
      },
      null,
      2
    ),
  ].join("\n");
}

function extractJsonBlock(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith("```")) {
    const withoutFence = trimmed.replace(/^```[a-zA-Z]*\s*/, "").replace(/```$/, "").trim();
    return withoutFence;
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return trimmed;
}

function normalizeProblem(raw: any): GeneratedProblem {
  const examples = Array.isArray(raw?.examples)
    ? raw.examples
        .filter((x: any) => x && typeof x === "object")
        .map((x: any) => ({
          input: String(x.input ?? "").trim(),
          output: String(x.output ?? "").trim(),
          explanation: String(x.explanation ?? "").trim(),
        }))
    : [];

  const starterCode: Record<Language, string> = {
    cpp: String(raw?.starterCode?.cpp ?? "").trim(),
    python: String(raw?.starterCode?.python ?? "").trim(),
    java: String(raw?.starterCode?.java ?? "").trim(),
  };

  const testcases = Array.isArray(raw?.testcases)
    ? raw.testcases
        .filter((x: any) => x && typeof x === "object")
        .map((x: any) => ({
          input: String(x.input ?? "").trim(),
          expectedOutput: String(x.expectedOutput ?? "").trim(),
          isHidden: Boolean(x.isHidden),
          weight: Math.max(1, Number.isFinite(Number(x.weight)) ? Math.round(Number(x.weight)) : 1),
        }))
    : [];

  const normalized: GeneratedProblem = {
    title: String(raw?.title ?? "").trim(),
    description: String(raw?.description ?? "").trim(),
    constraints: String(raw?.constraints ?? "").trim(),
    examples,
    starterCode,
    testcases,
  };

  if (!normalized.title || !normalized.description || !normalized.constraints) {
    throw new Error("Missing required text fields in model output");
  }

  if (!normalized.starterCode.cpp || !normalized.starterCode.python || !normalized.starterCode.java) {
    throw new Error("Missing starter code for one or more languages");
  }

  if (normalized.testcases.length < 6) {
    throw new Error("Generated testcases are insufficient");
  }

  if (normalized.testcases.filter((x) => x.isHidden).length < 2) {
    throw new Error("Generated hidden testcases are insufficient");
  }

  return normalized;
}

async function generateWithModel(
  genAI: GoogleGenerativeAI,
  modelName: string,
  prompt: string
): Promise<GeneratedProblem> {
  const model = genAI.getGenerativeModel({ model: modelName });
  const response = await model.generateContent(prompt);
  const text = response.response.text();
  const json = extractJsonBlock(text);
  const parsed = JSON.parse(json);
  return normalizeProblem(parsed);
}

router.post("/generate", authenticate, requireRole("TEACHER"), async (req: Request, res: Response) => {
  try {
    const topic = String(req.body?.topic ?? "").trim();
    const difficulty = String(req.body?.difficulty ?? "").trim().toUpperCase() as Difficulty;
    const language = String(req.body?.language ?? "").trim().toLowerCase() as Language;

    if (!topic) {
      res.status(400).json({ error: "topic is required" });
      return;
    }

    if (!DIFFICULTY_VALUES.includes(difficulty)) {
      res.status(400).json({ error: "difficulty must be EASY, MEDIUM or HARD" });
      return;
    }

    if (!LANGUAGE_VALUES.includes(language)) {
      res.status(400).json({ error: "language must be cpp, python or java" });
      return;
    }

    if (!env.GEMINI_API_KEY) {
      res.status(500).json({ error: "Gemini API key is not configured" });
      return;
    }

    const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    const prompt = buildPrompt(topic, difficulty, language);

    const parseErrors: string[] = [];
    for (const modelName of MODEL_CHAIN) {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          const generated = await generateWithModel(genAI, modelName, prompt);
          res.json({
            model: modelName,
            generated,
          });
          return;
        } catch (error: any) {
          const msg = error?.message || "Unknown generation error";
          parseErrors.push(`${modelName}#${attempt + 1}: ${msg}`);
        }
      }
    }

    res.status(502).json({
      error: "Failed to generate valid assignment JSON from Gemini",
      details: parseErrors,
    });
  } catch (error) {
    console.error("AI generate error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
