// ── Workspace template definitions ──────────────────────
// Copies real starter files from starters-main directory

import fs from "fs/promises";
import path from "path";

export type TemplateId =
  | "blank"
  | "dsa"
  | "static"
  | "static-web"
  | "node"
  | "nodejs"
  | "react"
  | "react-ts"
  | "nextjs"
  | "vue"
  | "angular"
  | "express"
  | "typescript"
  | "vite-react-ts"
  | "fullstack";

export interface TemplateInfo {
  id: TemplateId;
  name: string;
  description: string;
  icon: string;
  runCommand: string | null;
  installCommand: string | null;
  language: string;
  starterDir: string;
}

export const TEMPLATE_META: Record<TemplateId, TemplateInfo> = {
  blank: {
    id: "blank",
    name: "Blank",
    description: "Empty workspace — start from scratch",
    icon: "file",
    runCommand: null,
    installCommand: null,
    language: "plaintext",
    starterDir: "",
  },
  static: {
    id: "static",
    name: "Static Website",
    description: "HTML, CSS & JavaScript",
    icon: "globe",
    runCommand: "npx servor --reload",
    installCommand: "npm install",
    language: "html",
    starterDir: "static",
  },
  node: {
    id: "node",
    name: "Node.js",
    description: "Node.js starter project",
    icon: "server",
    runCommand: "node index.js",
    installCommand: null,
    language: "javascript",
    starterDir: "node",
  },
  react: {
    id: "react",
    name: "React (Vite)",
    description: "React + TypeScript with Vite",
    icon: "atom",
    runCommand: "npm run dev",
    installCommand: "npm install",
    language: "typescript",
    starterDir: "react",
  },
  "react-ts": {
    id: "react-ts",
    name: "React TypeScript",
    description: "React + TypeScript with CRA",
    icon: "atom",
    runCommand: "npm start",
    installCommand: "npm install",
    language: "typescript",
    starterDir: "react-ts",
  },
  "vite-react-ts": {
    id: "vite-react-ts",
    name: "Vite + React + TS",
    description: "React + Vite + TypeScript + Tailwind",
    icon: "zap",
    runCommand: "npm run dev",
    installCommand: "npm install",
    language: "typescript",
    starterDir: "bolt-vite-react-ts",
  },
  nextjs: {
    id: "nextjs",
    name: "Next.js",
    description: "Next.js full-stack framework",
    icon: "layers",
    runCommand: "npm run dev",
    installCommand: "npm install",
    language: "typescript",
    starterDir: "nextjs",
  },
  vue: {
    id: "vue",
    name: "Vue.js",
    description: "Vue 3 with Vue CLI",
    icon: "triangle",
    runCommand: "npm run serve",
    installCommand: "npm install",
    language: "javascript",
    starterDir: "vue",
  },
  angular: {
    id: "angular",
    name: "Angular",
    description: "Angular framework starter",
    icon: "shield",
    runCommand: "npm start",
    installCommand: "npm install",
    language: "typescript",
    starterDir: "angular",
  },
  express: {
    id: "express",
    name: "Express.js",
    description: "Express.js REST API",
    icon: "server",
    runCommand: "node index.js",
    installCommand: "npm install",
    language: "javascript",
    starterDir: "express-simple",
  },
  typescript: {
    id: "typescript",
    name: "TypeScript",
    description: "TypeScript starter project",
    icon: "code",
    runCommand: "npx ts-node index.ts",
    installCommand: "npm install",
    language: "typescript",
    starterDir: "typescript",
  },
  dsa: {
    id: "dsa",
    name: "DSA Playground",
    description: "Competitive programming with C++, Python, Java & JS",
    icon: "code",
    runCommand: "node index.js",
    installCommand: null,
    language: "multi",
    starterDir: "",
  },
  "static-web": {
    id: "static-web",
    name: "Static Web Project",
    description: "Classic HTML, CSS & JavaScript website",
    icon: "globe",
    runCommand: "npx servor . --reload",
    installCommand: null,
    language: "html",
    starterDir: "",
  },
  nodejs: {
    id: "nodejs",
    name: "Node.js API",
    description: "Express.js REST API server",
    icon: "server",
    runCommand: "node server.js",
    installCommand: "npm install",
    language: "javascript",
    starterDir: "",
  },
  fullstack: {
    id: "fullstack",
    name: "Fullstack App",
    description: "React frontend + Express backend",
    icon: "layers",
    runCommand: "npm run dev:client",
    installCommand: "npm install",
    language: "typescript",
    starterDir: "",
  },
};

// ── Resolve the starters directory ──────────────────────
function getStartersRoot(): string {
  return path.resolve(process.cwd(), "..", "client", "starters-main");
}

// ── Recursively read all files from a directory ─────────
async function readDirRecursive(
  dirPath: string,
  basePath: string = ""
): Promise<Record<string, string>> {
  const files: Record<string, string> = {};

  let entries;
  try {
    entries = await fs.readdir(dirPath, { withFileTypes: true });
  } catch {
    return files;
  }

  for (const entry of entries) {
    const relPath = basePath ? `${basePath}/${entry.name}` : entry.name;
    const fullPath = path.join(dirPath, entry.name);

    // Skip node_modules, .git, lock files, .bolt
    if (
      entry.name === "node_modules" ||
      entry.name === ".git" ||
      entry.name === "package-lock.json" ||
      entry.name === ".bolt"
    ) {
      continue;
    }

    if (entry.isDirectory()) {
      const subFiles = await readDirRecursive(fullPath, relPath);
      Object.assign(files, subFiles);
    } else {
      try {
        const content = await fs.readFile(fullPath, "utf-8");
        files[relPath] = content;
      } catch {
        // Skip binary / unreadable files
      }
    }
  }

  return files;
}

// ── Get template files ──────────────────────────────────
export async function getTemplateFiles(
  templateId: TemplateId
): Promise<Record<string, string>> {
  const meta = TEMPLATE_META[templateId];

  // Blank template just gets a README
  if (!meta || !meta.starterDir) {
    return {
      "README.md": "# New Workspace\n\nStart building your project here.\n",
    };
  }

  const starterPath = path.join(getStartersRoot(), meta.starterDir);

  // Check if starter directory exists
  try {
    await fs.access(starterPath);
  } catch {
    // Fallback if starter dir doesn't exist
    return {
      "README.md": `# ${meta.name}\n\n${meta.description}\n`,
      ...(meta.language === "javascript"
        ? { "index.js": `// ${meta.name} starter\nconsole.log("Hello from ${meta.name}!");\n` }
        : {}),
      ...(meta.language === "typescript"
        ? { "index.ts": `// ${meta.name} starter\nconsole.log("Hello from ${meta.name}!");\n` }
        : {}),
    };
  }

  // Read all files from the starter directory
  return readDirRecursive(starterPath);
}
