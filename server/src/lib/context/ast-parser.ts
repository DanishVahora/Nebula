import { parse } from "@babel/parser";
import type { File as BabelFile } from "@babel/types";
import traverse from "@babel/traverse";

// ── Types ──────────────────────────────────────────────

export interface ImportInfo {
    source: string; // e.g. "react", "./utils", "../components/Button"
    specifiers: {
        name: string; // local name
        imported: string; // original name (same as name for default)
        type: "default" | "named" | "namespace";
    }[];
    isTypeOnly: boolean;
}

export interface ExportInfo {
    name: string;
    type: "default" | "named";
    isTypeOnly: boolean;
}

export type SymbolKind =
    | "function"
    | "class"
    | "variable"
    | "interface"
    | "type"
    | "enum";

export interface SymbolInfo {
    name: string;
    kind: SymbolKind;
    line: number;
    exported: boolean;
}

export interface FileAnalysis {
    imports: ImportInfo[];
    exports: ExportInfo[];
    symbols: SymbolInfo[];
    errors: string[];
}

// ── Supported extensions ───────────────────────────────

const JS_TS_EXTENSIONS = new Set([
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
    ".mjs",
    ".mts",
    ".cjs",
    ".cts",
]);

export function isAnalyzable(filePath: string): boolean {
    const ext = filePath.slice(filePath.lastIndexOf(".")).toLowerCase();
    return JS_TS_EXTENSIONS.has(ext);
}

// ── Parser ─────────────────────────────────────────────

function parseSource(code: string, filePath: string): BabelFile | null {
    const isTS =
        filePath.endsWith(".ts") ||
        filePath.endsWith(".tsx") ||
        filePath.endsWith(".mts") ||
        filePath.endsWith(".cts");
    const isJSX =
        filePath.endsWith(".jsx") ||
        filePath.endsWith(".tsx");

    const plugins: any[] = [];
    if (isTS) plugins.push("typescript");
    if (isJSX || !isTS) plugins.push("jsx"); // enable JSX for JSX files and all JS files
    plugins.push("decorators-legacy", "classProperties", "optionalChaining", "nullishCoalescingOperator");

    try {
        return parse(code, {
            sourceType: "module",
            allowImportExportEverywhere: true,
            allowReturnOutsideFunction: true,
            plugins,
        });
    } catch {
        // Retry with sourceType "script" for CJS files
        try {
            return parse(code, {
                sourceType: "script",
                allowReturnOutsideFunction: true,
                plugins,
            });
        } catch {
            return null;
        }
    }
}

// ── Analyze ────────────────────────────────────────────

export function analyzeFile(code: string, filePath: string): FileAnalysis {
    const result: FileAnalysis = {
        imports: [],
        exports: [],
        symbols: [],
        errors: [],
    };

    const ast = parseSource(code, filePath);
    if (!ast) {
        result.errors.push("Failed to parse file");
        return result;
    }

    const exportedNames = new Set<string>();

    // Use traverse default export (handles both ESM and CJS module shapes)
    const traverseFn =
        typeof traverse === "function"
            ? traverse
            : (traverse as any).default ?? traverse;

    traverseFn(ast, {
        // ── Imports ──────────────────────────────────────
        ImportDeclaration(path: any) {
            const node = path.node;
            const info: ImportInfo = {
                source: node.source.value,
                specifiers: [],
                isTypeOnly: node.importKind === "type",
            };

            for (const spec of node.specifiers) {
                if (spec.type === "ImportDefaultSpecifier") {
                    info.specifiers.push({
                        name: spec.local.name,
                        imported: "default",
                        type: "default",
                    });
                } else if (spec.type === "ImportNamespaceSpecifier") {
                    info.specifiers.push({
                        name: spec.local.name,
                        imported: "*",
                        type: "namespace",
                    });
                } else if (spec.type === "ImportSpecifier") {
                    info.specifiers.push({
                        name: spec.local.name,
                        imported:
                            spec.imported.type === "Identifier"
                                ? spec.imported.name
                                : spec.imported.value,
                        type: "named",
                    });
                }
            }

            result.imports.push(info);
        },

        // ── Exports ─────────────────────────────────────
        ExportDefaultDeclaration(path: any) {
            const decl = path.node.declaration;
            const name =
                decl.type === "Identifier"
                    ? decl.name
                    : decl.id?.name ?? "<anonymous>";
            result.exports.push({
                name,
                type: "default",
                isTypeOnly: false,
            });
            exportedNames.add(name);
        },

        ExportNamedDeclaration(path: any) {
            const node = path.node;
            const isTypeExport = node.exportKind === "type";

            // export { foo, bar }
            if (node.specifiers?.length) {
                for (const spec of node.specifiers) {
                    const name =
                        spec.exported.type === "Identifier"
                            ? spec.exported.name
                            : spec.exported.value;
                    result.exports.push({
                        name,
                        type: "named",
                        isTypeOnly: isTypeExport || spec.exportKind === "type",
                    });
                    exportedNames.add(name);
                }
            }

            // export const/function/class/etc
            if (node.declaration) {
                const decl = node.declaration;
                if (decl.id?.name) {
                    result.exports.push({
                        name: decl.id.name,
                        type: "named",
                        isTypeOnly: isTypeExport,
                    });
                    exportedNames.add(decl.id.name);
                }
                // export const a = ..., b = ...
                if (decl.declarations) {
                    for (const d of decl.declarations) {
                        if (d.id?.name) {
                            result.exports.push({
                                name: d.id.name,
                                type: "named",
                                isTypeOnly: isTypeExport,
                            });
                            exportedNames.add(d.id.name);
                        }
                    }
                }
            }
        },

        // ── Symbols ─────────────────────────────────────
        FunctionDeclaration(path: any) {
            if (path.node.id?.name) {
                result.symbols.push({
                    name: path.node.id.name,
                    kind: "function",
                    line: path.node.loc?.start?.line ?? 0,
                    exported: false, // resolved later
                });
            }
        },

        ClassDeclaration(path: any) {
            if (path.node.id?.name) {
                result.symbols.push({
                    name: path.node.id.name,
                    kind: "class",
                    line: path.node.loc?.start?.line ?? 0,
                    exported: false,
                });
            }
        },

        VariableDeclaration(path: any) {
            // Only collect top-level variables (not nested in functions)
            if (path.parent.type !== "Program" && path.parent.type !== "ExportNamedDeclaration") return;
            for (const decl of path.node.declarations) {
                if (decl.id?.name) {
                    // Detect arrow functions / function expressions
                    const init = decl.init;
                    const kind: SymbolKind =
                        init &&
                            (init.type === "ArrowFunctionExpression" ||
                                init.type === "FunctionExpression")
                            ? "function"
                            : "variable";
                    result.symbols.push({
                        name: decl.id.name,
                        kind,
                        line: decl.loc?.start?.line ?? 0,
                        exported: false,
                    });
                }
            }
        },

        TSInterfaceDeclaration(path: any) {
            if (path.node.id?.name) {
                result.symbols.push({
                    name: path.node.id.name,
                    kind: "interface",
                    line: path.node.loc?.start?.line ?? 0,
                    exported: false,
                });
            }
        },

        TSTypeAliasDeclaration(path: any) {
            if (path.node.id?.name) {
                result.symbols.push({
                    name: path.node.id.name,
                    kind: "type",
                    line: path.node.loc?.start?.line ?? 0,
                    exported: false,
                });
            }
        },

        TSEnumDeclaration(path: any) {
            if (path.node.id?.name) {
                result.symbols.push({
                    name: path.node.id.name,
                    kind: "enum",
                    line: path.node.loc?.start?.line ?? 0,
                    exported: false,
                });
            }
        },
    });

    // Mark exported symbols
    for (const sym of result.symbols) {
        if (exportedNames.has(sym.name)) {
            sym.exported = true;
        }
    }

    return result;
}
