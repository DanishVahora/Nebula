import { useState } from "react";
import {
  GitBranch,
  GitCommitHorizontal,
  ArrowUpFromLine,
  ArrowDownToLine,
  RefreshCw,
  GitFork,
  Loader2,
  FileEdit,
  FilePlus2,
  FileX2,
  Check,
} from "lucide-react";

interface GitPanelProps {
  gitBranch: string | null;
  gitStatus: any;
  workspace: any;
  onCommit: (message: string) => void;
  onPush: () => Promise<void> | void;
  onPull: () => Promise<void> | void;
  onGitInit: () => void;
  onRefresh: () => void;
}

export function GitPanel({
  gitBranch,
  gitStatus,
  workspace,
  onCommit,
  onPush,
  onPull,
  onGitInit,
  onRefresh,
}: GitPanelProps) {
  const [commitMessage, setCommitMessage] = useState("");
  const [isPushing, setIsPushing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);

  const modifiedFiles: string[] = gitStatus?.modified || [];
  const untrackedFiles: string[] = gitStatus?.untracked || [];
  const deletedFiles: string[] = gitStatus?.deleted || [];
  const stagedFiles: string[] = gitStatus?.staged || [];
  const isRepo = gitStatus?.isRepo !== false;
  const totalChanges = modifiedFiles.length + untrackedFiles.length + deletedFiles.length;

  const handleCommit = () => {
    if (commitMessage.trim()) {
      onCommit(commitMessage.trim());
      setCommitMessage("");
    }
  };

  const handlePush = async () => {
    setIsPushing(true);
    await onPush();
    setIsPushing(false);
  };

  const handlePull = async () => {
    setIsPulling(true);
    await onPull();
    setIsPulling(false);
  };

  if (!isRepo) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-4 py-2 shrink-0">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#858585]">
            Source Control
          </span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-3">
          <GitFork className="w-10 h-10 text-[#6e7681]" />
          <p className="text-[13px] text-[#d4d4d4] text-center">
            This workspace has no Git repository.
          </p>
          <button
            onClick={onGitInit}
            className="flex items-center gap-2 px-4 py-2 bg-[#007acc] text-white rounded text-[13px] font-medium hover:bg-[#1177bb] transition-colors"
          >
            <GitFork className="w-4 h-4" />
            Initialize Repository
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 shrink-0">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#858585]">
          Source Control
        </span>
        <button
          onClick={onRefresh}
          className="p-1 hover:bg-[#3c3c3c] rounded transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#858585] hover:text-[#d4d4d4]" />
        </button>
      </div>

      {/* Branch info */}
      {gitBranch && (
        <div className="flex items-center gap-2 px-4 py-1.5 text-[12px] text-[#d4d4d4]">
          <GitBranch className="w-3.5 h-3.5 text-[#858585]" />
          <span className="font-medium">{gitBranch}</span>
        </div>
      )}

      {/* Commit section */}
      <div className="px-3 py-2 shrink-0">
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleCommit(); }}
            placeholder="Message (press Enter to commit)"
            className="flex-1 px-2.5 py-1.5 text-[13px] bg-[#2d2d2d] border border-[#3c3c3c] rounded text-[#d4d4d4] outline-none focus:border-[#007acc] placeholder-[#6e7681] min-w-0"
          />
          <button
            onClick={handleCommit}
            disabled={!commitMessage.trim()}
            className="p-1.5 bg-[#007acc] text-white rounded hover:bg-[#1177bb] transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            title="Commit"
          >
            <Check className="w-4 h-4" />
          </button>
        </div>

        {/* Push / Pull buttons */}
        <div className="flex items-center gap-1.5 mt-2">
          <button
            onClick={handlePush}
            disabled={isPushing || !workspace.repoUrl}
            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 bg-[#2d2d2d] border border-[#3c3c3c] text-[#d4d4d4] rounded text-[12px] font-medium hover:bg-[#3c3c3c] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title={workspace.repoUrl ? "Push to remote" : "No remote repository linked"}
          >
            {isPushing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowUpFromLine className="w-3.5 h-3.5" />}
            Push
          </button>
          <button
            onClick={handlePull}
            disabled={isPulling || !workspace.repoUrl}
            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 bg-[#2d2d2d] border border-[#3c3c3c] text-[#d4d4d4] rounded text-[12px] font-medium hover:bg-[#3c3c3c] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title={workspace.repoUrl ? "Pull from remote" : "No remote repository linked"}
          >
            {isPulling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowDownToLine className="w-3.5 h-3.5" />}
            Pull
          </button>
        </div>
      </div>

      {/* Changes list */}
      <div className="flex-1 overflow-y-auto">
        {totalChanges === 0 && stagedFiles.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <GitCommitHorizontal className="w-8 h-8 text-[#6e7681] mx-auto mb-2" />
            <p className="text-[12px] text-[#858585]">No changes detected</p>
          </div>
        ) : (
          <>
            {/* Staged */}
            {stagedFiles.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 px-4 py-1.5 text-[11px] font-semibold text-[#858585] uppercase tracking-wider">
                  Staged Changes
                  <span className="text-[10px] font-bold text-[#007acc]">{stagedFiles.length}</span>
                </div>
                {stagedFiles.map((file) => (
                  <div key={`staged-${file}`} className="flex items-center gap-2 px-4 py-1 text-[13px] text-[#6a9955] hover:bg-[#2a2d2e] cursor-default">
                    <Check className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{file}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Changes */}
            {totalChanges > 0 && (
              <div>
                <div className="flex items-center gap-1.5 px-4 py-1.5 text-[11px] font-semibold text-[#858585] uppercase tracking-wider">
                  Changes
                  <span className="text-[10px] font-bold text-[#007acc]">{totalChanges}</span>
                </div>
                {modifiedFiles.map((file) => (
                  <div key={`mod-${file}`} className="flex items-center gap-2 px-4 py-1 text-[13px] text-[#dcdcaa] hover:bg-[#2a2d2e] cursor-default">
                    <FileEdit className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate flex-1">{file}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#dcdcaa]/10 text-[#dcdcaa] shrink-0">M</span>
                  </div>
                ))}
                {untrackedFiles.map((file) => (
                  <div key={`new-${file}`} className="flex items-center gap-2 px-4 py-1 text-[13px] text-[#6a9955] hover:bg-[#2a2d2e] cursor-default">
                    <FilePlus2 className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate flex-1">{file}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#6a9955]/10 text-[#6a9955] shrink-0">U</span>
                  </div>
                ))}
                {deletedFiles.map((file) => (
                  <div key={`del-${file}`} className="flex items-center gap-2 px-4 py-1 text-[13px] text-[#f44747] hover:bg-[#2a2d2e] cursor-default">
                    <FileX2 className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate flex-1">{file}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#f44747]/10 text-[#f44747] shrink-0">D</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Remote info */}
      {workspace.repoUrl && (
        <div className="px-4 py-2 text-[11px] text-[#858585] border-t border-[#2d2d2d] shrink-0 truncate">
          <a
            href={workspace.repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#007acc] transition-colors"
          >
            {workspace.repoName || workspace.repoUrl}
          </a>
        </div>
      )}
    </div>
  );
}
