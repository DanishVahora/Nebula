import fs from "fs/promises";
import path from "path";
import { getWorkspacePath, getAllFiles } from "../workspace";
import {
    analyzeFile,
    isAnalyzable,
    type FileAnalysis,
    type ImportInfo,
    type SymbolInfo,
} from "./ast-parser";

// ── Types ──────────────────────────────────────────────

export interface FileIndex {
    /** Path relative to project root */
    path: string;
    language: string;
    size: number;
    analysis: FileAnalysis | null;
}

export interface DependencyInfo {
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
}

export interface ImportEdge {
    from: string; // relative path of importing file
    to: string; // relative path of imported file (resolved)
    specifiers: string[];
}

export interface WorkspaceIndex {
    workspaceId: string;
    indexedAt: number;
    files: Map<string, FileIndex>;
    folderStructure: string[];
    importGraph: ImportEdge[];
    symbolTable: Map<string, SymbolInfo & { file: string }>;
    dependencies: DependencyInfo;
}

// ── In-memory store ────────────────────────────────────

const indexStore = new Map<string, WorkspaceIndex>();

// ── Language detection ─────────────────────────────────

const EXTENSION_LANG: Record<string, string> = {
    ".js": "javascript",
    ".jsx": "javascript",
    ".mjs": "javascript",
    ".cjs": "javascript",
    ".ts": "typescript",
    ".tsx": "typescript",
    ".mts": "typescript",
    ".cts": "typescript",
    ".json": "json",
    ".html": "html",
    ".htm": "html",
    ".css": "css",
    ".scss": "scss",
    ".less": "less",
    ".md": "markdown",
    ".py": "python",
    ".java": "java",
    ".cpp": "cpp",
    ".c": "c",
    ".h": "c",
    ".hpp": "cpp",
    ".rs": "rust",
    ".go": "go",
    ".yaml": "yaml",
    ".yml": "yaml",
    ".xml": "xml",
    ".svg": "svg",
    ".sh": "shell",
    ".bash": "shell",
};

function detectLanguage(filePath: string): string {
    const ext = filePath.slice(filePath.lastIndexOf(".")).toLowerCase();
    return EXTENSION_LANG[ext] || "unknown";
}

// ── Import resolution ──────────────────────────────────

const RESOLVE_EXTENSIONS = [
    "",
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".mjs",
    ".mts",
    "/index.ts",
    "/index.tsx",
    "/index.js",
    "/index.jsx",
];

/**
 * Attempt to resolve a relative import to an actual file path.
 * Returns the relative path from project root, or null if unresolvable.
 */
function resolveImport(
    importSource: string,
    importerPath: string,
    allFiles: Set<string>
): string | null {
    // Skip package/node_modules imports
    if (!importSource.startsWith(".") && !importSource.startsWith("/")) {
        return null;
    }

    const importerDir = path.dirname(importerPath);
    const base = path.posix.normalize(
        path.posix.join(importerDir, importSource)
    );

    for (const ext of RESOLVE_EXTENSIONS) {
        const candidate = base + ext;
        if (allFiles.has(candidate)) {
            return candidate;
        }
    }

    return null;
}

// ── Read package.json ──────────────────────────────────

async function readDependencies(
    projectDir: string
): Promise<DependencyInfo> {
    const result: DependencyInfo = {
        dependencies: {},
        devDependencies: {},
    };

    try {
        const raw = await fs.readFile(
            path.join(projectDir, "package.json"),
            "utf-8"
        );
        const pkg = JSON.parse(raw);
        result.dependencies = pkg.dependencies || {};
        result.devDependencies = pkg.devDependencies || {};
    } catch {
        // No package.json or invalid JSON
    }

    return result;
}

// ── Max file size for analysis (skip large/generated files) ──
const MAX_FILE_SIZE = 256 * 1024; // 256 KB

// ── Index a workspace ──────────────────────────────────

export async function indexWorkspace(
    workspaceId: string
): Promise<WorkspaceIndex> {
    const projectDir = getWorkspacePath(workspaceId);
    const filePaths = await getAllFiles(workspaceId);
    const fileSet = new Set(filePaths);

    const files = new Map<string, FileIndex>();
    const importGraph: ImportEdge[] = [];
    const symbolTable = new Map<string, SymbolInfo & { file: string }>();
    const folders = new Set<string>();

    // Read dependencies
    const dependencies = await readDependencies(projectDir);

    // Process each file
    const analyzePromises = filePaths.map(async (relPath) => {
        const fullPath = path.join(projectDir, relPath);

        // Collect folder structure
        const dir = path.dirname(relPath);
        if (dir !== ".") {
            const parts = dir.split("/");
            let current = "";
            for (const part of parts) {
                current = current ? `${current}/${part}` : part;
                folders.add(current);
            }
        }

        let size = 0;
        try {
            const stat = await fs.stat(fullPath);
            size = stat.size;
        } catch {
            return;
        }

        const language = detectLanguage(relPath);
        let analysis: FileAnalysis | null = null;

        // Only analyze JS/TS files under size limit
        if (isAnalyzable(relPath) && size <= MAX_FILE_SIZE) {
            try {
                const code = await fs.readFile(fullPath, "utf-8");
                analysis = analyzeFile(code, relPath);
            } catch {
                // File read error, skip analysis
            }
        }

        return { relPath, size, language, analysis };
    });

    const results = await Promise.all(analyzePromises);

    for (const entry of results) {
        if (!entry) continue;

        const { relPath, size, language, analysis } = entry;

        files.set(relPath, { path: relPath, size, language, analysis });

        if (analysis) {
            // Build import graph
            for (const imp of analysis.imports) {
                const resolved = resolveImport(imp.source, relPath, fileSet);
                if (resolved) {
                    importGraph.push({
                        from: relPath,
                        to: resolved,
                        specifiers: imp.specifiers.map((s) => s.name),
                    });
                }
            }

            // Build symbol table
            for (const sym of analysis.symbols) {
                const key = `${relPath}:${sym.name}`;
                symbolTable.set(key, { ...sym, file: relPath });
            }
        }
    }

    const index: WorkspaceIndex = {
        workspaceId,
        indexedAt: Date.now(),
        files,
        folderStructure: [...folders].sort(),
        importGraph,
        symbolTable,
        dependencies,
    };

    indexStore.set(workspaceId, index);
    return index;
}

// ── Get cached index ───────────────────────────────────

export function getCachedIndex(
    workspaceId: string
): WorkspaceIndex | undefined {
    return indexStore.get(workspaceId);
}

// ── Invalidate index ───────────────────────────────────

export function invalidateIndex(workspaceId: string): void {
    indexStore.delete(workspaceId);
}

// ── Get or build index ─────────────────────────────────

export async function getOrBuildIndex(
    workspaceId: string,
    maxAge: number = 5 * 60 * 1000 // 5 minutes
): Promise<WorkspaceIndex> {
    const cached = indexStore.get(workspaceId);
    if (cached && Date.now() - cached.indexedAt < maxAge) {
        return cached;
    }
    return indexWorkspace(workspaceId);
}

// ── Get index summary (serializable) ───────────────────

export interface IndexSummary {
    workspaceId: string;
    indexedAt: number;
    totalFiles: number;
    analyzedFiles: number;
    folders: string[];
    fileList: {
        path: string;
        language: string;
        size: number;
        symbolCount: number;
        importCount: number;
    }[];
    importGraph: ImportEdge[];
    symbols: (SymbolInfo & { file: string })[];
    dependencies: DependencyInfo;
}

export function getIndexSummary(index: WorkspaceIndex): IndexSummary {
    const fileList = [...index.files.values()].map((f) => ({
        path: f.path,
        language: f.language,
        size: f.size,
        symbolCount: f.analysis?.symbols.length ?? 0,
        importCount: f.analysis?.imports.length ?? 0,
    }));

    return {
        workspaceId: index.workspaceId,
        indexedAt: index.indexedAt,
        totalFiles: index.files.size,
        analyzedFiles: [...index.files.values()].filter((f) => f.analysis).length,
        folders: index.folderStructure,
        fileList,
        importGraph: index.importGraph,
        symbols: [...index.symbolTable.values()],
        dependencies: index.dependencies,
    };
}
