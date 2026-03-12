import fs from "fs/promises";
import path from "path";
import { getWorkspacePath } from "../workspace";
import {
    getOrBuildIndex,
    type WorkspaceIndex,
    type ImportEdge,
} from "./workspace-indexer";
import type { SymbolInfo } from "./ast-parser";

// ── Types ──────────────────────────────────────────────

export interface ErrorContext {
    /** The file where the error occurred */
    errorFile: string;
    /** The error message / stack trace */
    errorMessage: string;
    /** Line number of the error (optional) */
    errorLine?: number;
}

export interface FileContext {
    path: string;
    content: string;
    language: string;
    symbols: SymbolInfo[];
    relevance: string; // why this file is included
}

export interface ProjectContext {
    /** Summary of the project structure */
    projectSummary: string;
    /** The primary file with the error */
    errorFileContext: FileContext | null;
    /** Related files (imported by / importing the error file) */
    relatedFiles: FileContext[];
    /** Relevant symbols across the project */
    relevantSymbols: {
        name: string;
        kind: string;
        file: string;
        line: number;
    }[];
    /** Dependencies */
    dependencies: string[];
    /** Pre-formatted prompt context for LLM consumption */
    formattedContext: string;
}

// ── Max content size to include per file ───────────────
const MAX_FILE_CONTENT = 8000; // characters

// ── Helpers ────────────────────────────────────────────

function truncateContent(content: string): string {
    if (content.length <= MAX_FILE_CONTENT) return content;
    return (
        content.slice(0, MAX_FILE_CONTENT) +
        "\n... [truncated, file continues]"
    );
}

/**
 * Extract a focused snippet around a specific line.
 * ±25 lines by default to give enough context.
 */
function extractSnippet(
    content: string,
    line: number,
    radius: number = 25
): string {
    const lines = content.split("\n");
    const start = Math.max(0, line - 1 - radius);
    const end = Math.min(lines.length, line + radius);
    const snippet = lines.slice(start, end);

    const prefix = start > 0 ? `... (lines 1-${start} omitted)\n` : "";
    const suffix = end < lines.length ? `\n... (lines ${end + 1}-${lines.length} omitted)` : "";

    return (
        prefix +
        snippet
            .map((l, i) => {
                const lineNum = start + i + 1;
                const marker = lineNum === line ? " >> " : "    ";
                return `${marker}${lineNum} | ${l}`;
            })
            .join("\n") +
        suffix
    );
}

/**
 * Find all files connected to a given file via imports (both directions).
 * Returns up to `maxDepth` levels of connections.
 */
function findConnectedFiles(
    filePath: string,
    importGraph: ImportEdge[],
    maxDepth: number = 2
): Set<string> {
    const connected = new Set<string>();
    const queue: { file: string; depth: number }[] = [
        { file: filePath, depth: 0 },
    ];

    while (queue.length > 0) {
        const { file, depth } = queue.shift()!;
        if (depth >= maxDepth) continue;

        // Files imported by this file
        for (const edge of importGraph) {
            if (edge.from === file && !connected.has(edge.to)) {
                connected.add(edge.to);
                queue.push({ file: edge.to, depth: depth + 1 });
            }
            // Files that import this file
            if (edge.to === file && !connected.has(edge.from)) {
                connected.add(edge.from);
                queue.push({ file: edge.from, depth: depth + 1 });
            }
        }
    }

    return connected;
}

// ── Build project summary ──────────────────────────────

function buildProjectSummary(index: WorkspaceIndex): string {
    const lines: string[] = [];
    const { files, dependencies, folderStructure } = index;

    lines.push(`Project has ${files.size} files across ${folderStructure.length} folders.`);

    // Language breakdown
    const langCounts = new Map<string, number>();
    for (const f of files.values()) {
        const count = langCounts.get(f.language) ?? 0;
        langCounts.set(f.language, count + 1);
    }
    const langBreakdown = [...langCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([lang, count]) => `${lang}: ${count}`)
        .join(", ");
    lines.push(`Languages: ${langBreakdown}`);

    // Key dependencies
    const deps = Object.keys(dependencies.dependencies);
    if (deps.length > 0) {
        lines.push(`Key dependencies: ${deps.slice(0, 15).join(", ")}${deps.length > 15 ? ` (+${deps.length - 15} more)` : ""}`);
    }

    // Folder structure (top 2 levels)
    const topFolders = folderStructure.filter(
        (f) => !f.includes("/") || f.split("/").length <= 2
    );
    if (topFolders.length > 0) {
        lines.push(`Folders: ${topFolders.join(", ")}`);
    }

    return lines.join("\n");
}

// ── Build error context ────────────────────────────────

export async function buildErrorContext(
    workspaceId: string,
    error: ErrorContext
): Promise<ProjectContext> {
    const index = await getOrBuildIndex(workspaceId);
    const projectDir = getWorkspacePath(workspaceId);

    const projectSummary = buildProjectSummary(index);
    const deps = Object.keys(index.dependencies.dependencies);

    // Read the error file
    let errorFileContext: FileContext | null = null;
    const errorFileIndex = index.files.get(error.errorFile);

    if (errorFileIndex) {
        try {
            const fullPath = path.join(projectDir, error.errorFile);
            let content = await fs.readFile(fullPath, "utf-8");

            // If we have a line number, show a focused snippet
            if (error.errorLine) {
                content = extractSnippet(content, error.errorLine);
            } else {
                content = truncateContent(content);
            }

            errorFileContext = {
                path: error.errorFile,
                content,
                language: errorFileIndex.language,
                symbols: errorFileIndex.analysis?.symbols ?? [],
                relevance: "File where the error occurred",
            };
        } catch {
            // File not readable
        }
    }

    // Find related files via import graph
    const connectedPaths = findConnectedFiles(
        error.errorFile,
        index.importGraph
    );

    const relatedFiles: FileContext[] = [];

    // Limit to 5 most relevant related files
    const sortedConnected = [...connectedPaths].slice(0, 5);

    for (const relPath of sortedConnected) {
        const fileIndex = index.files.get(relPath);
        if (!fileIndex) continue;

        try {
            const fullPath = path.join(projectDir, relPath);
            const content = truncateContent(await fs.readFile(fullPath, "utf-8"));

            // Determine relevance
            const isImportedBy = index.importGraph.some(
                (e) => e.from === error.errorFile && e.to === relPath
            );
            const importsError = index.importGraph.some(
                (e) => e.from === relPath && e.to === error.errorFile
            );

            let relevance = "Connected file in import graph";
            if (isImportedBy) relevance = "Imported by the error file";
            if (importsError) relevance = "Imports the error file";

            relatedFiles.push({
                path: relPath,
                content,
                language: fileIndex.language,
                symbols: fileIndex.analysis?.symbols ?? [],
                relevance,
            });
        } catch {
            // Skip unreadable files
        }
    }

    // Collect relevant symbols (from error file and connected files)
    const relevantSymbols: { name: string; kind: string; file: string; line: number }[] = [];
    const targetFiles = new Set([error.errorFile, ...connectedPaths]);

    for (const [, sym] of index.symbolTable) {
        if (targetFiles.has(sym.file) && sym.exported) {
            relevantSymbols.push({
                name: sym.name,
                kind: sym.kind,
                file: sym.file,
                line: sym.line,
            });
        }
    }

    // Format context for LLM
    const formattedContext = formatForLLM({
        projectSummary,
        error,
        errorFileContext,
        relatedFiles,
        relevantSymbols,
        dependencies: deps,
    });

    return {
        projectSummary,
        errorFileContext,
        relatedFiles,
        relevantSymbols,
        dependencies: deps,
        formattedContext,
    };
}

// ── Build general query context ────────────────────────

export async function buildQueryContext(
    workspaceId: string,
    query: string,
    targetFile?: string
): Promise<ProjectContext> {
    const index = await getOrBuildIndex(workspaceId);
    const projectDir = getWorkspacePath(workspaceId);

    const projectSummary = buildProjectSummary(index);
    const deps = Object.keys(index.dependencies.dependencies);

    let errorFileContext: FileContext | null = null;
    const relatedFiles: FileContext[] = [];

    if (targetFile) {
        const fileIndex = index.files.get(targetFile);
        if (fileIndex) {
            try {
                const content = truncateContent(
                    await fs.readFile(path.join(projectDir, targetFile), "utf-8")
                );
                errorFileContext = {
                    path: targetFile,
                    content,
                    language: fileIndex.language,
                    symbols: fileIndex.analysis?.symbols ?? [],
                    relevance: "Target file for the query",
                };
            } catch { /* skip */ }

            // Get directly connected files
            const connected = findConnectedFiles(targetFile, index.importGraph, 1);
            for (const relPath of [...connected].slice(0, 3)) {
                const fi = index.files.get(relPath);
                if (!fi) continue;
                try {
                    const content = truncateContent(
                        await fs.readFile(path.join(projectDir, relPath), "utf-8")
                    );
                    relatedFiles.push({
                        path: relPath,
                        content,
                        language: fi.language,
                        symbols: fi.analysis?.symbols ?? [],
                        relevance: "Directly connected file",
                    });
                } catch { /* skip */ }
            }
        }
    }

    // Search for symbols matching query keywords
    const queryWords = query.toLowerCase().split(/\W+/).filter(Boolean);
    const relevantSymbols: { name: string; kind: string; file: string; line: number }[] = [];

    for (const [, sym] of index.symbolTable) {
        const nameL = sym.name.toLowerCase();
        if (queryWords.some((w) => nameL.includes(w))) {
            relevantSymbols.push({
                name: sym.name,
                kind: sym.kind,
                file: sym.file,
                line: sym.line,
            });
        }
    }

    const formattedContext = formatForLLM({
        projectSummary,
        error: null,
        errorFileContext,
        relatedFiles,
        relevantSymbols: relevantSymbols.slice(0, 20),
        dependencies: deps,
        query,
    });

    return {
        projectSummary,
        errorFileContext,
        relatedFiles,
        relevantSymbols: relevantSymbols.slice(0, 20),
        dependencies: deps,
        formattedContext,
    };
}

// ── Format for LLM ────────────────────────────────────

function formatForLLM(opts: {
    projectSummary: string;
    error: ErrorContext | null;
    errorFileContext: FileContext | null;
    relatedFiles: FileContext[];
    relevantSymbols: { name: string; kind: string; file: string; line: number }[];
    dependencies: string[];
    query?: string;
}): string {
    const sections: string[] = [];

    // Project summary
    sections.push(`## Project Overview\n${opts.projectSummary}`);

    // Dependencies
    if (opts.dependencies.length > 0) {
        sections.push(
            `## Dependencies\n${opts.dependencies.join(", ")}`
        );
    }

    // Error info
    if (opts.error) {
        let errorSection = `## Error\nFile: ${opts.error.errorFile}`;
        if (opts.error.errorLine) {
            errorSection += `\nLine: ${opts.error.errorLine}`;
        }
        errorSection += `\nMessage:\n\`\`\`\n${opts.error.errorMessage}\n\`\`\``;
        sections.push(errorSection);
    }

    // Query
    if (opts.query) {
        sections.push(`## Query\n${opts.query}`);
    }

    // Error file content
    if (opts.errorFileContext) {
        const fc = opts.errorFileContext;
        sections.push(
            `## ${fc.relevance}: ${fc.path}\n\`\`\`${fc.language}\n${fc.content}\n\`\`\``
        );
    }

    // Related files
    for (const rf of opts.relatedFiles) {
        sections.push(
            `## ${rf.relevance}: ${rf.path}\n\`\`\`${rf.language}\n${rf.content}\n\`\`\``
        );
    }

    // Symbol references
    if (opts.relevantSymbols.length > 0) {
        const symbolLines = opts.relevantSymbols
            .map((s) => `- ${s.kind} \`${s.name}\` in ${s.file}:${s.line}`)
            .join("\n");
        sections.push(`## Relevant Symbols\n${symbolLines}`);
    }

    return sections.join("\n\n");
}

// ── Lightweight context shape for AI debugging ─────────

export interface BuildContextResult {
    projectStructure: string[];
    dependencies: string[];
    currentFile: {
        path: string;
        code: string;
    } | null;
    relatedFiles: {
        path: string;
        code: string;
    }[];
    errorLine: number;
}

const MAX_LINES_PER_FILE = 150;
const MAX_RELATED_FILES = 5;
const MAX_PROJECT_FILES = 20;

/**
 * Build a lightweight context object for AI debugging.
 *
 * 1. Load the project index
 * 2. Read the file where the error occurred
 * 3. Extract ~150 lines around the error line
 * 4. Resolve imported files via the import graph
 * 5. Load up to 5 related files (truncated to ~150 lines each)
 * 6. Include project structure (up to 20 files)
 * 7. Read dependencies from package.json
 */
export async function buildContext(
    workspaceId: string,
    filePath: string,
    errorLine: number
): Promise<BuildContextResult> {
    const index = await getOrBuildIndex(workspaceId);
    const projectDir = getWorkspacePath(workspaceId);

    // 1. Project structure — up to MAX_PROJECT_FILES
    const projectStructure = [...index.files.keys()].slice(0, MAX_PROJECT_FILES);

    // 2. Dependencies
    const dependencies = Object.keys(index.dependencies.dependencies);

    // 3. Read and extract code around the error line
    let currentFile: BuildContextResult["currentFile"] = null;
    try {
        const raw = await fs.readFile(
            path.join(projectDir, filePath),
            "utf-8"
        );
        const lines = raw.split("\n");
        const radius = Math.floor(MAX_LINES_PER_FILE / 2);
        const start = Math.max(0, errorLine - 1 - radius);
        const end = Math.min(lines.length, errorLine - 1 + radius);
        currentFile = {
            path: filePath,
            code: lines.slice(start, end).join("\n"),
        };
    } catch {
        // File not found / unreadable
    }

    // 4 & 5. Resolve imports and load related files
    const connected = findConnectedFiles(filePath, index.importGraph, 1);

    const relatedFiles: BuildContextResult["relatedFiles"] = [];
    for (const relPath of [...connected].slice(0, MAX_RELATED_FILES)) {
        try {
            const raw = await fs.readFile(
                path.join(projectDir, relPath),
                "utf-8"
            );
            const lines = raw.split("\n");
            relatedFiles.push({
                path: relPath,
                code: lines.slice(0, MAX_LINES_PER_FILE).join("\n"),
            });
        } catch {
            // Skip unreadable files
        }
    }

    return {
        projectStructure,
        dependencies,
        currentFile,
        relatedFiles,
        errorLine,
    };
}
