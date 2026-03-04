import { useState } from "react";
import type { FileEntry } from "@/pages/WorkspaceIDE";
import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  FolderOpen,
  Plus,
  FolderPlus,
  RefreshCw,
  Trash2,
  Pencil,
} from "lucide-react";

interface FileExplorerProps {
  files: FileEntry[];
  activeFile: string | null;
  onFileClick: (path: string) => void;
  onCreateFile: (parentPath: string, name: string, type: "file" | "directory") => void;
  onDeleteFile: (path: string) => void;
  onRenameFile: (oldPath: string, newPath: string) => void;
  onRefresh: () => void;
}

function getFileIconColor(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  const colors: Record<string, string> = {
    ts: "#3178c6", tsx: "#3178c6", js: "#f0db4f", jsx: "#f0db4f",
    json: "#cbcb41", html: "#e34c26", css: "#563d7c", scss: "#cd6799",
    md: "#083fa1", py: "#3572a5", java: "#b07219", cpp: "#f34b7d",
    c: "#555555", go: "#00add8", rs: "#dea584", vue: "#41b883",
    svelte: "#ff3e00", prisma: "#2d3748", yaml: "#cb171e", yml: "#cb171e",
    svg: "#ffb13b", png: "#a074c4", gitignore: "#f54d27",
  };
  return colors[ext] || "#858585";
}

interface FileTreeItemProps {
  entry: FileEntry;
  depth: number;
  activeFile: string | null;
  onFileClick: (path: string) => void;
  onCreateFile: (parentPath: string, name: string, type: "file" | "directory") => void;
  onDeleteFile: (path: string) => void;
  onRenameFile: (oldPath: string, newPath: string) => void;
}

function FileTreeItem({
  entry, depth, activeFile, onFileClick, onCreateFile, onDeleteFile, onRenameFile,
}: FileTreeItemProps) {
  const [isOpen, setIsOpen] = useState(depth < 1);
  const [isCreating, setIsCreating] = useState<"file" | "directory" | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState("");
  const [showActions, setShowActions] = useState(false);

  const isDir = entry.type === "directory";
  const isActive = activeFile === entry.path;

  const handleClick = () => {
    if (isDir) setIsOpen(!isOpen);
    else onFileClick(entry.path);
  };

  const handleCreate = (type: "file" | "directory") => {
    setIsCreating(type);
    setNewName("");
    if (!isOpen) setIsOpen(true);
  };

  const submitCreate = () => {
    if (newName.trim() && isCreating) {
      onCreateFile(entry.path, newName.trim(), isCreating);
      setIsCreating(null);
      setNewName("");
    }
  };

  const startRename = () => { setIsRenaming(true); setNewName(entry.name); };

  const submitRename = () => {
    if (newName.trim() && newName !== entry.name) {
      const parentPath = entry.path.includes("/")
        ? entry.path.substring(0, entry.path.lastIndexOf("/")) : "";
      const newPath = parentPath ? `${parentPath}/${newName.trim()}` : newName.trim();
      onRenameFile(entry.path, newPath);
    }
    setIsRenaming(false);
  };

  return (
    <div>
      <div
        className={`group flex items-center gap-1 px-2 py-[3px] cursor-pointer transition-colors ${
          isActive
            ? "bg-[#37373d] text-[#ffffff]"
            : "text-[#cccccc] hover:bg-[#2a2d2e]"
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={handleClick}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        {isDir ? (
          <span className="w-4 h-4 flex items-center justify-center shrink-0">
            {isOpen ? (
              <ChevronDown className="w-3.5 h-3.5 text-[#858585]" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-[#858585]" />
            )}
          </span>
        ) : (
          <span className="w-4 h-4 shrink-0" />
        )}

        {isDir ? (
          isOpen ? (
            <FolderOpen className="w-4 h-4 text-[#dcb67a] shrink-0" />
          ) : (
            <Folder className="w-4 h-4 text-[#dcb67a] shrink-0" />
          )
        ) : (
          <File className="w-4 h-4 shrink-0" style={{ color: getFileIconColor(entry.name) }} />
        )}

        {isRenaming ? (
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={submitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitRename();
              if (e.key === "Escape") setIsRenaming(false);
            }}
            className="flex-1 text-[13px] bg-[#3c3c3c] border border-[#007acc] rounded px-1 py-0 outline-none text-[#cccccc] min-w-0"
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="text-[13px] truncate flex-1 min-w-0 leading-[22px]">{entry.name}</span>
        )}

        {showActions && !isRenaming && (
          <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
            {isDir && (
              <>
                <button onClick={() => handleCreate("file")} className="p-0.5 hover:bg-[#3c3c3c] rounded" title="New file">
                  <Plus className="w-3.5 h-3.5 text-[#858585] hover:text-[#cccccc]" />
                </button>
                <button onClick={() => handleCreate("directory")} className="p-0.5 hover:bg-[#3c3c3c] rounded" title="New folder">
                  <FolderPlus className="w-3.5 h-3.5 text-[#858585] hover:text-[#cccccc]" />
                </button>
              </>
            )}
            <button onClick={startRename} className="p-0.5 hover:bg-[#3c3c3c] rounded" title="Rename">
              <Pencil className="w-3 h-3 text-[#858585] hover:text-[#cccccc]" />
            </button>
            <button onClick={() => onDeleteFile(entry.path)} className="p-0.5 hover:bg-[#3c3c3c] rounded" title="Delete">
              <Trash2 className="w-3 h-3 text-[#858585] hover:text-[#c74e39]" />
            </button>
          </div>
        )}
      </div>

      {isCreating && isDir && isOpen && (
        <div className="flex items-center gap-1 px-2 py-1" style={{ paddingLeft: `${(depth + 1) * 12 + 8}px` }}>
          <span className="w-4 h-4 shrink-0" />
          {isCreating === "directory" ? (
            <Folder className="w-4 h-4 text-[#dcb67a] shrink-0" />
          ) : (
            <File className="w-4 h-4 text-[#858585] shrink-0" />
          )}
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={() => { if (newName.trim()) submitCreate(); else setIsCreating(null); }}
            onKeyDown={(e) => { if (e.key === "Enter") submitCreate(); if (e.key === "Escape") setIsCreating(null); }}
            placeholder={isCreating === "directory" ? "folder name" : "file name"}
            className="flex-1 text-[13px] bg-[#3c3c3c] border border-[#007acc] rounded px-1.5 py-0.5 outline-none text-[#cccccc] placeholder-[#6a6a6a] min-w-0"
            autoFocus
          />
        </div>
      )}

      {isDir && isOpen && entry.children && (
        <div>
          {entry.children.map((child) => (
            <FileTreeItem
              key={child.path} entry={child} depth={depth + 1} activeFile={activeFile}
              onFileClick={onFileClick} onCreateFile={onCreateFile}
              onDeleteFile={onDeleteFile} onRenameFile={onRenameFile}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FileExplorer({
  files, activeFile, onFileClick, onCreateFile, onDeleteFile, onRenameFile, onRefresh,
}: FileExplorerProps) {
  const [isCreatingRoot, setIsCreatingRoot] = useState<"file" | "directory" | null>(null);
  const [rootName, setRootName] = useState("");

  const submitRootCreate = () => {
    if (rootName.trim() && isCreatingRoot) {
      onCreateFile("", rootName.trim(), isCreatingRoot);
      setIsCreatingRoot(null);
      setRootName("");
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 shrink-0">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#bbbbbb]">
          Explorer
        </span>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => { setIsCreatingRoot("file"); setRootName(""); }}
            className="p-1 hover:bg-[#3c3c3c] rounded transition-colors" title="New file"
          >
            <Plus className="w-3.5 h-3.5 text-[#858585] hover:text-[#cccccc]" />
          </button>
          <button
            onClick={() => { setIsCreatingRoot("directory"); setRootName(""); }}
            className="p-1 hover:bg-[#3c3c3c] rounded transition-colors" title="New folder"
          >
            <FolderPlus className="w-3.5 h-3.5 text-[#858585] hover:text-[#cccccc]" />
          </button>
          <button onClick={onRefresh} className="p-1 hover:bg-[#3c3c3c] rounded transition-colors" title="Refresh">
            <RefreshCw className="w-3.5 h-3.5 text-[#858585] hover:text-[#cccccc]" />
          </button>
        </div>
      </div>

      {isCreatingRoot && (
        <div className="flex items-center gap-1 px-2 py-1">
          {isCreatingRoot === "directory" ? (
            <Folder className="w-4 h-4 text-[#dcb67a] shrink-0" />
          ) : (
            <File className="w-4 h-4 text-[#858585] shrink-0" />
          )}
          <input
            type="text" value={rootName}
            onChange={(e) => setRootName(e.target.value)}
            onBlur={() => { if (rootName.trim()) submitRootCreate(); else setIsCreatingRoot(null); }}
            onKeyDown={(e) => { if (e.key === "Enter") submitRootCreate(); if (e.key === "Escape") setIsCreatingRoot(null); }}
            placeholder={isCreatingRoot === "directory" ? "folder name" : "file name"}
            className="flex-1 text-[13px] bg-[#3c3c3c] border border-[#007acc] rounded px-1.5 py-0.5 outline-none text-[#cccccc] placeholder-[#6a6a6a] min-w-0"
            autoFocus
          />
        </div>
      )}

      {/* File tree */}
      <div className="flex-1 overflow-y-auto py-0.5">
        {files.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-[12px] text-[#858585]">No files yet</p>
            <p className="text-[11px] text-[#6a6a6a] mt-1">Create a file to get started</p>
          </div>
        ) : (
          files.map((entry) => (
            <FileTreeItem
              key={entry.path} entry={entry} depth={0} activeFile={activeFile}
              onFileClick={onFileClick} onCreateFile={onCreateFile}
              onDeleteFile={onDeleteFile} onRenameFile={onRenameFile}
            />
          ))
        )}
      </div>
    </div>
  );
}
