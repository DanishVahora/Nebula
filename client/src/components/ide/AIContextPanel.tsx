import { useState } from "react";
import { workspaceAPI } from "@/lib/api";
import {
    BrainCircuit,
    Loader2,
    ChevronDown,
    ChevronRight,
    FileCode,
    Package,
    FolderTree,
    AlertTriangle,
    X,
} from "lucide-react";

interface AIContextPanelProps {
    workspaceId: string;
    activeFile: string | null;
}

interface ContextResult {
    projectStructure: string[];
    dependencies: string[];
    currentFile: { path: string; code: string } | null;
    relatedFiles: { path: string; code: string }[];
    errorLine: number;
}

export function AIContextPanel({ workspaceId, activeFile }: AIContextPanelProps) {
    const [errorLine, setErrorLine] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [context, setContext] = useState<ContextResult | null>(null);

    // Collapsible sections
    const [showStructure, setShowStructure] = useState(false);
    const [showDeps, setShowDeps] = useState(false);
    const [showCurrentFile, setShowCurrentFile] = useState(true);
    const [showRelated, setShowRelated] = useState(true);
    const [expandedRelated, setExpandedRelated] = useState<Set<number>>(new Set());

    const handleBuildContext = async () => {
        if (!activeFile) {
            setError("Open a file in the editor first");
            return;
        }
        const line = parseInt(errorLine, 10);
        if (!line || line < 1) {
            setError("Enter a valid error line number");
            return;
        }

        setLoading(true);
        setError(null);
        setContext(null);

        try {
            const res = await workspaceAPI.buildContext(workspaceId, activeFile, line);
            setContext(res.data);
        } catch (err: any) {
            setError(err.response?.data?.error || "Failed to build context");
        } finally {
            setLoading(false);
        }
    };

    const toggleRelated = (idx: number) => {
        setExpandedRelated((prev) => {
            const next = new Set(prev);
            if (next.has(idx)) next.delete(idx);
            else next.add(idx);
            return next;
        });
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="px-4 py-3 flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#858585]">
                    AI Context
                </span>
                <BrainCircuit className="w-4 h-4 text-[#858585]" />
            </div>

            {/* Input form */}
            <div className="px-3 pb-3 space-y-2">
                {/* Active file display */}
                <div className="text-[11px] text-[#858585] truncate">
                    {activeFile ? (
                        <span className="flex items-center gap-1">
                            <FileCode className="w-3 h-3 shrink-0" />
                            {activeFile}
                        </span>
                    ) : (
                        "No file open"
                    )}
                </div>

                {/* Error line input */}
                <input
                    type="number"
                    min={1}
                    value={errorLine}
                    onChange={(e) => setErrorLine(e.target.value)}
                    placeholder="Error line number"
                    className="w-full px-2.5 py-1.5 text-[13px] bg-[#2d2d2d] border border-[#3c3c3c] rounded text-[#d4d4d4] outline-none focus:border-[#007acc] placeholder-[#6e7681] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    onKeyDown={(e) => {
                        if (e.key === "Enter") handleBuildContext();
                    }}
                />

                {/* Build button */}
                <button
                    onClick={handleBuildContext}
                    disabled={loading || !activeFile}
                    className="w-full px-3 py-1.5 text-[12px] font-medium bg-[#007acc] text-white rounded hover:bg-[#1177bb] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1.5"
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Building...
                        </>
                    ) : (
                        <>
                            <BrainCircuit className="w-3.5 h-3.5" />
                            Build Context
                        </>
                    )}
                </button>

                {/* Error display */}
                {error && (
                    <div className="flex items-start gap-1.5 px-2 py-1.5 rounded bg-[#f4474720] text-[#f44747] text-[11px]">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>{error}</span>
                    </div>
                )}
            </div>

            {/* Results */}
            {context && (
                <div className="flex-1 overflow-y-auto px-1 pb-3 space-y-0.5 scrollbar-thin">
                    {/* Current file */}
                    {context.currentFile && (
                        <CollapsibleSection
                            title={`Current File (L${context.errorLine})`}
                            icon={<FileCode className="w-3.5 h-3.5 text-[#4ec9b0]" />}
                            open={showCurrentFile}
                            onToggle={() => setShowCurrentFile((p) => !p)}
                        >
                            <div className="text-[11px] text-[#9cdcfe] px-2 py-1 truncate">
                                {context.currentFile.path}
                            </div>
                            <pre className="text-[11px] leading-[1.5] text-[#d4d4d4] bg-[#0f0f0f] rounded mx-2 p-2 overflow-x-auto max-h-[300px] overflow-y-auto whitespace-pre font-mono">
                                {context.currentFile.code}
                            </pre>
                        </CollapsibleSection>
                    )}

                    {/* Related files */}
                    {context.relatedFiles.length > 0 && (
                        <CollapsibleSection
                            title={`Related Files (${context.relatedFiles.length})`}
                            icon={<FileCode className="w-3.5 h-3.5 text-[#dcdcaa]" />}
                            open={showRelated}
                            onToggle={() => setShowRelated((p) => !p)}
                        >
                            {context.relatedFiles.map((rf, i) => (
                                <div key={rf.path} className="mx-1">
                                    <button
                                        className="w-full flex items-center gap-1.5 px-2 py-1 text-[11px] text-[#9cdcfe] hover:bg-[#2a2a2a] rounded transition-colors text-left"
                                        onClick={() => toggleRelated(i)}
                                    >
                                        {expandedRelated.has(i) ? (
                                            <ChevronDown className="w-3 h-3 shrink-0 text-[#858585]" />
                                        ) : (
                                            <ChevronRight className="w-3 h-3 shrink-0 text-[#858585]" />
                                        )}
                                        <span className="truncate">{rf.path}</span>
                                    </button>
                                    {expandedRelated.has(i) && (
                                        <pre className="text-[11px] leading-[1.5] text-[#d4d4d4] bg-[#0f0f0f] rounded mx-2 p-2 overflow-x-auto max-h-[250px] overflow-y-auto whitespace-pre font-mono mb-1">
                                            {rf.code}
                                        </pre>
                                    )}
                                </div>
                            ))}
                        </CollapsibleSection>
                    )}

                    {/* Project structure */}
                    <CollapsibleSection
                        title={`Project (${context.projectStructure.length} files)`}
                        icon={<FolderTree className="w-3.5 h-3.5 text-[#c586c0]" />}
                        open={showStructure}
                        onToggle={() => setShowStructure((p) => !p)}
                    >
                        <div className="px-2 py-1 space-y-0.5">
                            {context.projectStructure.map((f) => (
                                <div key={f} className="text-[11px] text-[#bcbcbc] truncate">
                                    {f}
                                </div>
                            ))}
                        </div>
                    </CollapsibleSection>

                    {/* Dependencies */}
                    {context.dependencies.length > 0 && (
                        <CollapsibleSection
                            title={`Dependencies (${context.dependencies.length})`}
                            icon={<Package className="w-3.5 h-3.5 text-[#ce9178]" />}
                            open={showDeps}
                            onToggle={() => setShowDeps((p) => !p)}
                        >
                            <div className="px-2 py-1 flex flex-wrap gap-1">
                                {context.dependencies.map((dep) => (
                                    <span
                                        key={dep}
                                        className="text-[10px] px-1.5 py-0.5 bg-[#2d2d2d] border border-[#3c3c3c] rounded text-[#ce9178]"
                                    >
                                        {dep}
                                    </span>
                                ))}
                            </div>
                        </CollapsibleSection>
                    )}

                    {/* Reset */}
                    <div className="px-3 pt-2">
                        <button
                            onClick={() => setContext(null)}
                            className="w-full px-3 py-1 text-[11px] text-[#858585] border border-[#3c3c3c] rounded hover:bg-[#2d2d2d] transition-colors flex items-center justify-center gap-1"
                        >
                            <X className="w-3 h-3" />
                            Clear
                        </button>
                    </div>
                </div>
            )}

            {/* Empty state when no context built yet */}
            {!context && !loading && !error && (
                <div className="flex-1 flex items-center justify-center px-4">
                    <p className="text-[12px] text-[#6e7681] text-center leading-relaxed">
                        Enter an error line number and click <strong>Build Context</strong> to
                        see what the AI will receive for debugging.
                    </p>
                </div>
            )}
        </div>
    );
}

// ── Collapsible Section ────────────────────────────────────

function CollapsibleSection({
    title,
    icon,
    open,
    onToggle,
    children,
}: {
    title: string;
    icon: React.ReactNode;
    open: boolean;
    onToggle: () => void;
    children: React.ReactNode;
}) {
    return (
        <div>
            <button
                className="w-full flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-[#cccccc] hover:bg-[#2a2a2a] transition-colors text-left uppercase tracking-wider"
                onClick={onToggle}
            >
                {open ? (
                    <ChevronDown className="w-3 h-3 shrink-0 text-[#858585]" />
                ) : (
                    <ChevronRight className="w-3 h-3 shrink-0 text-[#858585]" />
                )}
                {icon}
                {title}
            </button>
            {open && <div className="pb-1">{children}</div>}
        </div>
    );
}
