import { Router, Request, Response } from "express";
import { authenticate, requireRole } from "../middleware/auth";

const router = Router();

// ── DSA starter code templates ─────────────────────────
const DSA_STARTERS: Record<string, (fnName: string) => string> = {
  cpp: (fn) => `#include <bits/stdc++.h>
using namespace std;

// TODO: Implement ${fn}
int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    // Read input and call your solution
    
    return 0;
}
`,
  python: (fn) => `import sys
from collections import defaultdict, deque

def ${fn}():
    # TODO: Implement your solution
    pass

if __name__ == "__main__":
    ${fn}()
`,
  java: (fn) => `import java.util.*;
import java.io.*;

public class Main {
    // TODO: Implement ${fn}
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        
    }
}
`,
};

// ── WEB_DEV description templates ──────────────────────
const WEBDEV_DESCRIPTIONS: Record<string, string> = {
  react: `## Requirements

### Features
- [ ] Feature 1: Description
- [ ] Feature 2: Description
- [ ] Feature 3: Description

### Technical Requirements
- Use React functional components with hooks
- Implement proper state management
- Ensure responsive design with CSS/Tailwind
- Handle loading and error states

### Bonus Points
- Clean code with meaningful variable names
- Component reusability
- Proper TypeScript types`,

  nextjs: `## Requirements

### Features
- [ ] Feature 1: Description
- [ ] Feature 2: Description
- [ ] Feature 3: Description

### Technical Requirements
- Use Next.js App Router
- Implement server and client components appropriately
- Add API routes where needed
- Ensure responsive design

### Bonus Points
- SSR/SSG optimization
- Error boundaries
- TypeScript throughout`,
};

// ── Generate assignment description & starter code ─────
router.post(
  "/generate",
  authenticate,
  requireRole("TEACHER"),
  async (req: Request, res: Response) => {
    try {
      const { type, topic, difficulty, language, template } = req.body;

      if (!type || !topic?.trim()) {
        res.status(400).json({ error: "type and topic are required" });
        return;
      }

      if (type === "DSA") {
        const lang = language || "cpp";
        const fnName = topic.trim().replace(/\s+/g, "_").toLowerCase();
        const starterCode = DSA_STARTERS[lang]?.(fnName) || DSA_STARTERS.cpp(fnName);

        const description = generateDSADescription(topic.trim(), difficulty || "MEDIUM");

        const sampleTestCases = [
          { input: "// Add sample input", expectedOutput: "// Add expected output", weight: 1, isHidden: false },
          { input: "// Add hidden test input", expectedOutput: "// Add expected output", weight: 2, isHidden: true },
        ];

        res.json({
          title: topic.trim(),
          description,
          starterCode: { [`main.${getExtension(lang)}`]: starterCode },
          testCases: sampleTestCases,
        });
        return;
      }

      if (type === "WEB_DEV") {
        const tmpl = template || "react";
        const description = WEBDEV_DESCRIPTIONS[tmpl] || WEBDEV_DESCRIPTIONS.react;

        const fullDesc = `# ${topic.trim()}\n\n${description}`;

        res.json({
          title: topic.trim(),
          description: fullDesc,
          starterCode: null, // Will use template defaults
          testCases: [],
        });
        return;
      }

      res.status(400).json({ error: "Invalid type" });
    } catch (error) {
      console.error("AI generate error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

function getExtension(lang: string): string {
  switch (lang) {
    case "cpp": return "cpp";
    case "python": return "py";
    case "java": return "java";
    default: return "txt";
  }
}

function generateDSADescription(topic: string, difficulty: string): string {
  const diffLabel = difficulty === "EASY" ? "Easy" : difficulty === "HARD" ? "Hard" : "Medium";
  return `# ${topic}

**Difficulty:** ${diffLabel}

## Problem Statement
Implement a solution for: **${topic}**

## Input Format
Describe the input format here.

## Output Format
Describe the expected output format here.

## Constraints
- Add constraints here

## Examples

### Example 1
\`\`\`
Input: 
Output: 
Explanation: 
\`\`\`

### Example 2
\`\`\`
Input: 
Output: 
Explanation: 
\`\`\`

## Notes
- Consider edge cases
- Optimize for time and space complexity
`;
}

export default router;
