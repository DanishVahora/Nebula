import { useState, useCallback, useRef, useEffect } from "react";
import { aiAPI, workspaceAPI } from "@/lib/api";
import {
    AlertTriangle,
    Loader2,
    Clipboard,
    Sparkles,
    X,
    FileCode,
    Lightbulb,
    Code,
    ChevronDown,
    ChevronRight,
    Upload,
    Eye,
    Trash2,
    CheckCircle2,
    Circle,
} from "lucide-react";

interface AIErrorResolverPanelProps {
    workspaceId: string;
    activeFile: string | null;
    onOpenFile?: (filePath: string) => void;
}

interface AIResult {
    explanation: string;
    suggestedFix: string;
    correctedCode: string;
}

interface AttachedFile {
    path: string;
    content: string | null;
    loading: boolean;
    expanded: boolean;
}

type StepStatus = "pending" | "active" | "done" | "error";

interface ProgressStep {
    label: string;
    status: StepStatus;
}

/**
 * Extract a file path and line number from an error/stack trace string.
 */
function parseErrorTrace(text: string): { filePath: string | null; line: number | null } {
    const jsMatch = text.match(/\(?([^\s()]+\.[a-z]{1,5}):(\d+)(?::\d+)?\)?/i);
    if (jsMatch) return { filePath: jsMatch[1], line: parseInt(jsMatch[2], 10) };

    const pyMatch = text.match(/File\s+"([^"]+)",\s+line\s+(\d+)/i);
    if (pyMatch) return { filePath: pyMatch[1], line: parseInt(pyMatch[2], 10) };

    return { filePath: null, line: null };
}

/** Extract just the first-line error message (before the stack trace). */
function extractErrorMessage(text: string): string {
    const lines = text.trim().split("\n");
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("at ")) return trimmed;
    }
    return lines[0]?.trim() || text.trim();
}

const INITIAL_STEPS: ProgressStep[] = [
    { label: "Building project context", status: "pending" },
    { label: "Generating AI prompt", status: "pending" },
    { label: "Sending to AI service", status: "pending" },
    { label: "Parsing response", status: "pending" },
];

export function AIErrorResolverPanel({ workspaceId, activeFile, onOpenFile }: AIErrorResolverPanelProps) {
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<AIResult | null>(null);
    const [showCode, setShowCode] = useState(true);
    const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
    const [steps, setSteps] = useState<ProgressStep[]>(INITIAL_STEPS);
    const [showSteps, setShowSteps] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const dropZoneRef = useRef<HTMLDivElement>(null);

    // ── Progress step helpers ──────────────────────────
    const advanceStep = useCallback((index: number, status: StepStatus = "done") => {
        setSteps((prev) => prev.map((s, i) => {
            if (i === index) return { ...s, status };
            if (i === index + 1 && status === "done") return { ...s, status: "active" };
            return s;
        }));
    }, []);

    const resetSteps = useCallback(() => {
        setSteps(INITIAL_STEPS.map((s) => ({ ...s, status: "pending" })));
    }, []);

    // ── File drag & drop ───────────────────────────────
    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);

        // Accept text/plain with file path (from file explorer drag)
        const filePath = e.dataTransfer.getData("text/plain")?.trim();
        if (filePath && filePath.includes(".") && !filePath.includes("\n")) {
            addFile(filePath);
        }
    }, []);

    const addFile = useCallback((filePath: string) => {
        setAttachedFiles((prev) => {
            if (prev.some((f) => f.path === filePath)) return prev;
            return [...prev, { path: filePath, content: null, loading: false, expanded: false }];
        });
    }, []);

    const removeFile = useCallback((filePath: string) => {
        setAttachedFiles((prev) => prev.filter((f) => f.path !== filePath));
    }, []);

    const toggleFileView = useCallback(async (filePath: string) => {
        setAttachedFiles((prev) =>
            prev.map((f) => {
                if (f.path !== filePath) return f;
                // If already loaded, just toggle
                if (f.content !== null) return { ...f, expanded: !f.expanded };
                // Need to load
                return { ...f, loading: true, expanded: true };
            })
        );

        // Load content if not loaded yet
        const existing = attachedFiles.find((f) => f.path === filePath);
        if (existing?.content !== null) return;

        try {
            const res = await workspaceAPI.readFile(workspaceId, filePath);
            setAttachedFiles((prev) =>
                prev.map((f) => f.path === filePath ? { ...f, content: res.data.content, loading: false } : f)
            );
        } catch {
            setAttachedFiles((prev) =>
                prev.map((f) => f.path === filePath ? { ...f, content: "// Failed to load file", loading: false } : f)
            );
        }
    }, [workspaceId, attachedFiles]);

    // ── Add active file button ─────────────────────────
    const handleAddActiveFile = useCallback(() => {
        if (activeFile) addFile(activeFile);
    }, [activeFile, addFile]);

    // ── Analyze ────────────────────────────────────────
    const handleAnalyze = useCallback(async () => {
        const trimmed = input.trim();
        if (!trimmed) {
            setError("Paste an error message or stack trace first");
            return;
        }

        setLoading(true);
        setError(null);
        setResult(null);
        resetSteps();
        setShowSteps(true);

        try {
            // Step 1: Building context
            setSteps((prev) => prev.map((s, i) => i === 0 ? { ...s, status: "active" } : s));

            const { filePath: parsedPath, line: parsedLine } = parseErrorTrace(trimmed);
            const filePath = parsedPath || (attachedFiles.length > 0 ? attachedFiles[0].path : null) || activeFile || "";
            const errorLine = parsedLine || 1;
            const errorMessage = extractErrorMessage(trimmed);

            if (!filePath) {
                setError("Could not detect file path. Open a file or drag one into this panel.");
                setLoading(false);
                advanceStep(0, "error");
                return;
            }

            // Simulate brief delay so user sees the step
            await new Promise((r) => setTimeout(r, 300));
            advanceStep(0, "done");

            // Step 2: Generating prompt
            await new Promise((r) => setTimeout(r, 200));
            advanceStep(1, "done");

            // Step 3: Sending to AI
            const res = await aiAPI.errorFix({
                workspaceId,
                filePath,
                errorLine,
                errorMessage,
            });

            advanceStep(2, "done");

            // Step 4: Parsing response
            await new Promise((r) => setTimeout(r, 200));
            advanceStep(3, "done");

            setResult(res.data);
            // Collapse steps after a short delay
            setTimeout(() => setShowSteps(false), 1000);
        } catch (err: any) {
            const errMsg = err.response?.data?.error || "Failed to analyze error";
            setError(errMsg);
            // Mark current active step as error
            setSteps((prev) => prev.map((s) => s.status === "active" ? { ...s, status: "error" } : s));
        } finally {
            setLoading(false);
        }
    }, [input, workspaceId, activeFile, attachedFiles, advanceStep, resetSteps]);

    const handlePaste = useCallback(async () => {
        try {
            const text = await navigator.clipboard.readText();
            setInput(text);
        } catch {
            // Clipboard API may be blocked
        }
    }, []);

    return (
        <div
            ref={dropZoneRef}
            className={`flex flex-col h-full transition-colors ${isDragOver ? "bg-[#007acc15]" : ""}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {/* Header */}
            <div className="px-4 py-3 flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#858585]">
                    AI Error Resolver
                </span>
                <Sparkles className="w-4 h-4 text-[#858585]" />
            </div>

            {/* Input area */}
            <div className="px-3 pb-3 space-y-2">
                {/* Active file hint */}
                <div className="text-[11px] text-[#858585] truncate">
                    {activeFile ? (
                        <span className="flex items-center gap-1">
                            <FileCode className="w-3 h-3 shrink-0" />
                            {activeFile}
                        </span>
                    ) : (
                        "No file open — open a file for better results"
                    )}
                </div>

                {/* Attached files */}
                {attachedFiles.length > 0 && (
                    <div className="space-y-1">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-[#858585]">
                            Attached Files
                        </div>
                        {attachedFiles.map((af) => (
                            <div key={af.path}>
                                <div className="flex items-center gap-1 group">
                                    <button
                                        className="flex-1 flex items-center gap-1 px-1.5 py-1 text-[11px] text-[#9cdcfe] hover:bg-[#2a2a2a] rounded transition-colors text-left truncate"
                                        onClick={() => toggleFileView(af.path)}
                                        title="Toggle file preview"
                                    >
                                        {af.expanded ? (
                                            <ChevronDown className="w-3 h-3 shrink-0 text-[#858585]" />
                                        ) : (
                                            <ChevronRight className="w-3 h-3 shrink-0 text-[#858585]" />
                                        )}
                                        <FileCode className="w-3 h-3 shrink-0 text-[#4ec9b0]" />
                                        <span className="truncate">{af.path}</span>
                                    </button>
                                    {onOpenFile && (
                                        <button
                                            onClick={() => onOpenFile(af.path)}
                                            className="p-0.5 rounded hover:bg-[#3c3c3c] text-[#858585] hover:text-[#d4d4d4] opacity-0 group-hover:opacity-100 transition-all"
                                            title="Open in editor"
                                        >
                                            <Eye className="w-3 h-3" />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => removeFile(af.path)}
                                        className="p-0.5 rounded hover:bg-[#3c3c3c] text-[#858585] hover:text-[#f44747] opacity-0 group-hover:opacity-100 transition-all"
                                        title="Remove"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                                {af.expanded && (
                                    <div className="ml-4 mt-0.5">
                                        {af.loading ? (
                                            <div className="flex items-center gap-1 text-[10px] text-[#858585] py-1">
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                                Loading...
                                            </div>
                                        ) : (
                                            <pre className="text-[10px] leading-[1.4] text-[#d4d4d4] bg-[#0f0f0f] rounded p-2 overflow-x-auto max-h-[150px] overflow-y-auto whitespace-pre font-mono border border-[#3c3c3c]">
                                                {af.content}
                                            </pre>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Drop zone hint / add file button */}
                <div
                    className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded border border-dashed transition-colors cursor-pointer ${isDragOver
                            ? "border-[#007acc] bg-[#007acc15] text-[#007acc]"
                            : "border-[#3c3c3c] text-[#6e7681] hover:border-[#858585] hover:text-[#858585]"
                        }`}
                    onClick={handleAddActiveFile}
                    title={activeFile ? `Add ${activeFile}` : "Open a file first"}
                >
                    <Upload className="w-3 h-3" />
                    <span className="text-[10px]">
                        {isDragOver ? "Drop file here" : "Drag file here or click to add current file"}
                    </span>
                </div>

                {/* Textarea */}
                <div className="relative">
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={"Paste error message, stack trace, or terminal output...\n\nExample:\nTypeError: Cannot read properties of undefined\n    at login (src/auth.ts:25)"}
                        rows={5}
                        className="w-full px-2.5 py-2 text-[12px] font-mono bg-[#2d2d2d] border border-[#3c3c3c] rounded text-[#d4d4d4] outline-none focus:border-[#007acc] placeholder-[#6e7681] resize-none leading-[1.5]"
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                                e.preventDefault();
                                handleAnalyze();
                            }
                        }}
                    />
                    <button
                        onClick={handlePaste}
                        className="absolute top-1.5 right-1.5 p-1 rounded hover:bg-[#3c3c3c] text-[#858585] hover:text-[#d4d4d4] transition-colors"
                        title="Paste from clipboard"
                    >
                        <Clipboard className="w-3.5 h-3.5" />
                    </button>
                </div>

                {/* Analyze button */}
                <button
                    onClick={handleAnalyze}
                    disabled={loading || !input.trim()}
                    className="w-full px-3 py-1.5 text-[12px] font-medium bg-[#007acc] text-white rounded hover:bg-[#1177bb] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1.5"
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Analyzing...
                        </>
                    ) : (
                        <>
                            <Sparkles className="w-3.5 h-3.5" />
                            Analyze Error
                        </>
                    )}
                </button>

                <p className="text-[10px] text-[#6e7681] text-center">
                    Ctrl+Enter to analyze
                </p>

                {/* Error display */}
                {error && (
                    <div className="flex items-start gap-1.5 px-2 py-1.5 rounded bg-[#f4474720] text-[#f44747] text-[11px]">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>{error}</span>
                    </div>
                )}
            </div>

            {/* Progress steps */}
            {showSteps && (
                <div className="px-3 pb-3">
                    <button
                        className="flex items-center gap-1 text-[10px] text-[#858585] hover:text-[#d4d4d4] transition-colors mb-1.5"
                        onClick={() => setShowSteps(false)}
                    >
                        <ChevronDown className="w-3 h-3" />
                        <span className="uppercase tracking-wider font-semibold">Progress</span>
                    </button>
                    <div className="space-y-1 pl-1">
                        {steps.map((step, i) => (
                            <div key={i} className="flex items-center gap-1.5">
                                <StepIcon status={step.status} />
                                <span
                                    className={`text-[11px] transition-colors ${step.status === "active"
                                            ? "text-[#007acc] font-medium"
                                            : step.status === "done"
                                                ? "text-[#4ec9b0]"
                                                : step.status === "error"
                                                    ? "text-[#f44747]"
                                                    : "text-[#6e7681]"
                                        }`}
                                >
                                    {step.label}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Results */}
            {result && (
                <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-3 scrollbar-thin">
                    {/* Explanation */}
                    {result.explanation && (
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#4ec9b0] uppercase tracking-wider">
                                <Lightbulb className="w-3.5 h-3.5" />
                                Explanation
                            </div>
                            <div className="text-[12px] text-[#d4d4d4] leading-[1.6] bg-[#1a1a2e] rounded p-2.5 border border-[#2d2d5e] whitespace-pre-wrap">
                                {result.explanation}
                            </div>
                        </div>
                    )}

                    {/* Suggested Fix */}
                    {result.suggestedFix && (
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#dcdcaa] uppercase tracking-wider">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                Suggested Fix
                            </div>
                            <div className="text-[12px] text-[#d4d4d4] leading-[1.6] bg-[#1a2e1a] rounded p-2.5 border border-[#2d5e2d] whitespace-pre-wrap">
                                {result.suggestedFix}
                            </div>
                        </div>
                    )}

                    {/* Corrected Code */}
                    {result.correctedCode && (
                        <div className="space-y-1.5">
                            <button
                                className="flex items-center gap-1.5 text-[11px] font-semibold text-[#9cdcfe] uppercase tracking-wider hover:text-[#d4d4d4] transition-colors"
                                onClick={() => setShowCode((p) => !p)}
                            >
                                {showCode ? (
                                    <ChevronDown className="w-3 h-3" />
                                ) : (
                                    <ChevronRight className="w-3 h-3" />
                                )}
                                <Code className="w-3.5 h-3.5" />
                                Corrected Code
                            </button>
                            {showCode && (
                                <pre className="text-[11px] leading-[1.5] text-[#d4d4d4] bg-[#0f0f0f] rounded p-2.5 overflow-x-auto max-h-[300px] overflow-y-auto whitespace-pre font-mono border border-[#3c3c3c]">
                                    {result.correctedCode}
                                </pre>
                            )}
                        </div>
                    )}

                    {/* Clear */}
                    <button
                        onClick={() => {
                            setResult(null);
                            setInput("");
                            setAttachedFiles([]);
                            resetSteps();
                            setShowSteps(false);
                        }}
                        className="w-full px-3 py-1 text-[11px] text-[#858585] border border-[#3c3c3c] rounded hover:bg-[#2d2d2d] transition-colors flex items-center justify-center gap-1"
                    >
                        <X className="w-3 h-3" />
                        Clear
                    </button>
                </div>
            )}

            {/* Empty state */}
            {!result && !loading && !error && (
                <div className="flex-1 flex items-center justify-center px-4">
                    <p className="text-[12px] text-[#6e7681] text-center leading-relaxed">
                        Paste an error message or stack trace, drag files for context, and click{" "}
                        <strong>Analyze Error</strong> to get an AI-powered explanation and fix.
                    </p>
                </div>
            )}
        </div>
    );
}

// ── Step icon component ────────────────────────────────

function StepIcon({ status }: { status: StepStatus }) {
    switch (status) {
        case "active":
            return <Loader2 className="w-3 h-3 text-[#007acc] animate-spin" />;
        case "done":
            return <CheckCircle2 className="w-3 h-3 text-[#4ec9b0]" />;
        case "error":
            return <AlertTriangle className="w-3 h-3 text-[#f44747]" />;
        default:
            return <Circle className="w-3 h-3 text-[#3c3c3c]" />;
    }
}
