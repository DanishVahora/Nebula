// ── Workspace Provisioner ────────────────────────────────
// Initializes workspace projects using real CLI commands
// and streams logs back via a callback.

import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";
import { getWorkspaceRoot, getWorkspacePath } from "./workspace";

export type ProvisionLog = (message: string) => void;

interface WorkspaceMeta {
  templateId: string;
  templateName: string;
  createdAt: string;
  workspaceId: string;
  github?: {
    repoUrl?: string;
    repoName?: string;
  };
}

// ── Shell helper ─────────────────────────────────────────

function runCommand(
  command: string,
  cwd: string,
  log: ProvisionLog
): Promise<number> {
  return new Promise((resolve, reject) => {
    log(`$ ${command}`);

    const child = spawn(command, {
      cwd,
      shell: true,
      stdio: ["pipe", "pipe", "pipe"],
      env: {
        ...process.env,
        FORCE_COLOR: "0",
        CI: "true",
        npm_config_yes: "true",
      },
    });

    child.stdout?.on("data", (data: Buffer) => {
      data
        .toString()
        .split("\n")
        .filter((l) => l.trim())
        .forEach((line) => log(line));
    });

    child.stderr?.on("data", (data: Buffer) => {
      data
        .toString()
        .split("\n")
        .filter((l) => l.trim())
        .forEach((line) => log(line));
    });

    child.on("error", (err) => {
      log(`Error: ${err.message}`);
      reject(err);
    });

    child.on("close", (code) => {
      resolve(code ?? 0);
    });
  });
}

// ── File writer helper ───────────────────────────────────

async function writeFiles(
  dir: string,
  files: Record<string, string>,
  log: ProvisionLog
) {
  for (const [relPath, content] of Object.entries(files)) {
    const fullPath = path.join(dir, relPath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content, "utf-8");
    log(`  Created ${relPath}`);
  }
}

// ── Template display names ───────────────────────────────

const TEMPLATE_NAMES: Record<string, string> = {
  blank: "Blank Workspace",
  dsa: "DSA Playground",
  "static-web": "Static Web Project",
  react: "React App (Vite)",
  nextjs: "Next.js App",
  nodejs: "Node.js API",
  fullstack: "Fullstack App",
  static: "Static Website",
  node: "Node.js",
  "react-ts": "React TypeScript",
  "vite-react-ts": "Vite + React + TS",
  vue: "Vue.js",
  angular: "Angular",
  express: "Express.js",
  typescript: "TypeScript",
};

// ── Individual template provisioners ─────────────────────

async function provisionBlank(projectDir: string, log: ProvisionLog) {
  log("Initializing blank workspace...");
  await writeFiles(
    projectDir,
    {
      "README.md":
        "# My Workspace\n\nStart building your project here.\n",
    },
    log
  );
}

async function provisionDSA(projectDir: string, log: ProvisionLog) {
  log("Setting up DSA Playground...");
  await writeFiles(
    projectDir,
    {
      "README.md": `# DSA Playground

Competitive programming workspace with starter files for multiple languages.

## Files
- \`main.cpp\` — C++ starter
- \`main.py\` — Python starter
- \`Main.java\` — Java starter
- \`index.js\` — JavaScript (Node.js) starter

## Running
\`\`\`bash
# C++
g++ -o main main.cpp && ./main

# Python
python main.py

# Java
javac Main.java && java Main

# JavaScript
node index.js
\`\`\`
`,
      "main.cpp": `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    // Your solution here
    cout << "Hello, World!" << endl;

    return 0;
}
`,
      "main.py": `import sys
from collections import defaultdict, deque


def solve():
    # Your solution here
    print("Hello, World!")


if __name__ == "__main__":
    solve()
`,
      "Main.java": `import java.util.*;
import java.io.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);

        // Your solution here
        System.out.println("Hello, World!");
    }
}
`,
      "index.js": `const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function solve(lines) {
  // Your solution here
  console.log("Hello, World!");
}

const inputLines = [];
rl.on("line", (line) => inputLines.push(line));
rl.on("close", () => solve(inputLines));
`,
    },
    log
  );
}

async function provisionStaticWeb(projectDir: string, log: ProvisionLog) {
  log("Creating static web project...");
  await writeFiles(
    projectDir,
    {
      "index.html": `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Website</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="container">
        <h1>Hello, World!</h1>
        <p>Welcome to your static web project.</p>
        <button id="btn">Click me</button>
    </div>
    <script src="script.js"></script>
</body>
</html>
`,
      "style.css": `* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    min-height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: #fff;
}

.container {
    text-align: center;
    padding: 2rem;
}

h1 {
    font-size: 3rem;
    margin-bottom: 1rem;
}

p {
    font-size: 1.2rem;
    opacity: 0.9;
    margin-bottom: 2rem;
}

button {
    padding: 0.75rem 2rem;
    font-size: 1rem;
    border: 2px solid #fff;
    background: transparent;
    color: #fff;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s ease;
}

button:hover {
    background: #fff;
    color: #764ba2;
}
`,
      "script.js": `document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("btn");
    let count = 0;

    btn.addEventListener("click", () => {
        count++;
        btn.textContent = \`Clicked \${count} time\${count !== 1 ? "s" : ""}\`;
    });

    console.log("Static web project loaded!");
});
`,
    },
    log
  );
}

async function provisionReact(projectDir: string, log: ProvisionLog) {
  log("Scaffolding React + Vite + TypeScript project...");

  let code = await runCommand(
    "npm create vite@latest . -- --template react-ts",
    projectDir,
    log
  );

  if (code !== 0) {
    throw new Error(`Vite scaffolding failed with exit code ${code}`);
  }

  log("");
  log("Installing dependencies...");

  code = await runCommand("npm install", projectDir, log);

  if (code !== 0) {
    throw new Error(`npm install failed with exit code ${code}`);
  }
}

async function provisionNextJS(projectDir: string, log: ProvisionLog) {
  log("Scaffolding Next.js project...");

  const code = await runCommand(
    'npx create-next-app@latest . --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --no-git --use-npm',
    projectDir,
    log
  );

  if (code !== 0) {
    throw new Error(`Next.js scaffolding failed with exit code ${code}`);
  }
}

async function provisionNodeAPI(projectDir: string, log: ProvisionLog) {
  log("Setting up Node.js API project...");

  // Initialise package.json
  let code = await runCommand("npm init -y", projectDir, log);
  if (code !== 0) {
    throw new Error(`npm init failed with exit code ${code}`);
  }

  // Write server source
  await writeFiles(
    projectDir,
    {
      "server.js": `const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get("/", (req, res) => {
  res.json({
    message: "Welcome to the API",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Example CRUD routes
const items = [];

app.get("/api/items", (req, res) => {
  res.json(items);
});

app.post("/api/items", (req, res) => {
  const item = { id: Date.now(), ...req.body };
  items.push(item);
  res.status(201).json(item);
});

// Start server
app.listen(PORT, () => {
  console.log(\`Server running on http://localhost:\${PORT}\`);
});
`,
      ".gitignore": `node_modules/
.env
`,
    },
    log
  );

  // Patch scripts in package.json
  log("  Updating package.json scripts...");
  const pkgPath = path.join(projectDir, "package.json");
  const pkg = JSON.parse(await fs.readFile(pkgPath, "utf-8"));
  pkg.scripts = {
    ...pkg.scripts,
    start: "node server.js",
    dev: "node --watch server.js",
  };
  pkg.name = pkg.name || "node-api";
  await fs.writeFile(pkgPath, JSON.stringify(pkg, null, 2), "utf-8");

  // Install dependencies
  log("");
  log("Installing dependencies...");
  code = await runCommand("npm install express cors", projectDir, log);
  if (code !== 0) {
    throw new Error(`npm install failed with exit code ${code}`);
  }
}

async function provisionFullstack(projectDir: string, log: ProvisionLog) {
  log("Setting up fullstack project...");

  const clientDir = path.join(projectDir, "client");
  const serverDir = path.join(projectDir, "server");
  await fs.mkdir(clientDir, { recursive: true });
  await fs.mkdir(serverDir, { recursive: true });

  // ── Client: Vite + React ──────────────────────────────
  log("");
  log("Scaffolding React client...");
  let code = await runCommand(
    "npm create vite@latest . -- --template react-ts",
    clientDir,
    log
  );
  if (code !== 0) {
    throw new Error(`Client scaffolding failed with exit code ${code}`);
  }

  log("");
  log("Installing client dependencies...");
  code = await runCommand("npm install", clientDir, log);
  if (code !== 0) {
    throw new Error(`Client npm install failed with exit code ${code}`);
  }

  // ── Server: Express ───────────────────────────────────
  log("");
  log("Setting up Express server...");
  code = await runCommand("npm init -y", serverDir, log);
  if (code !== 0) {
    throw new Error(`Server npm init failed with exit code ${code}`);
  }

  await writeFiles(
    serverDir,
    {
      "server.js": `const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(\`API server running on http://localhost:\${PORT}\`);
});
`,
    },
    log
  );

  // Patch server package.json scripts
  const serverPkgPath = path.join(serverDir, "package.json");
  const serverPkg = JSON.parse(
    await fs.readFile(serverPkgPath, "utf-8")
  );
  serverPkg.scripts = {
    ...serverPkg.scripts,
    start: "node server.js",
    dev: "node --watch server.js",
  };
  await fs.writeFile(
    serverPkgPath,
    JSON.stringify(serverPkg, null, 2),
    "utf-8"
  );

  log("");
  log("Installing server dependencies...");
  code = await runCommand("npm install express cors", serverDir, log);
  if (code !== 0) {
    throw new Error(`Server npm install failed with exit code ${code}`);
  }

  // ── Root config ───────────────────────────────────────
  await writeFiles(
    projectDir,
    {
      "package.json": JSON.stringify(
        {
          name: "fullstack-app",
          private: true,
          scripts: {
            "dev:client": "cd client && npm run dev",
            "dev:server": "cd server && npm run dev",
          },
        },
        null,
        2
      ),
      "README.md": `# Fullstack App

React frontend + Express backend.

## Quick Start
\`\`\`bash
# Run client (port 5173)
npm run dev:client

# Run server (port 3001)
npm run dev:server
\`\`\`

## Structure
- \`client/\` — React + Vite + TypeScript frontend
- \`server/\` — Express.js API server
`,
    },
    log
  );
}

// ── Main entry point ─────────────────────────────────────

export async function provisionWorkspace(
  workspaceId: string,
  templateId: string,
  log: ProvisionLog,
  githubInfo?: { repoUrl?: string; repoName?: string }
): Promise<void> {
  const root = getWorkspaceRoot(workspaceId);
  const projectDir = getWorkspacePath(workspaceId);

  log("Creating workspace directories...");
  await fs.mkdir(projectDir, { recursive: true });

  switch (templateId) {
    case "blank":
      await provisionBlank(projectDir, log);
      break;
    case "dsa":
      await provisionDSA(projectDir, log);
      break;
    case "static-web":
    case "static":
      await provisionStaticWeb(projectDir, log);
      break;
    case "react":
    case "react-ts":
    case "vite-react-ts":
      await provisionReact(projectDir, log);
      break;
    case "nextjs":
      await provisionNextJS(projectDir, log);
      break;
    case "nodejs":
    case "node":
    case "express":
      await provisionNodeAPI(projectDir, log);
      break;
    case "fullstack":
      await provisionFullstack(projectDir, log);
      break;
    default:
      await provisionBlank(projectDir, log);
  }

  // Write workspace.json metadata to the workspace root (outside project/)
  log("");
  log("Writing workspace metadata...");
  const meta: WorkspaceMeta = {
    templateId,
    templateName: TEMPLATE_NAMES[templateId] || "Custom",
    createdAt: new Date().toISOString(),
    workspaceId,
    ...(githubInfo ? { github: githubInfo } : {}),
  };

  await fs.writeFile(
    path.join(root, "workspace.json"),
    JSON.stringify(meta, null, 2),
    "utf-8"
  );

  log("");
  log("Workspace setup complete!");
}
