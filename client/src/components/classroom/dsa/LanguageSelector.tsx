import { Code2 } from "lucide-react";

interface Props {
  value: "cpp" | "python" | "java";
  onChange: (lang: "cpp" | "python" | "java") => void;
}

const OPTIONS: Array<{ value: "cpp" | "python" | "java"; label: string }> = [
  { value: "cpp", label: "C++" },
  { value: "python", label: "Python" },
  { value: "java", label: "Java" },
];

export function LanguageSelector({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-2">
      <Code2 className="h-4 w-4 text-zinc-400" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as "cpp" | "python" | "java")}
        className="rounded-md border border-white/10 bg-zinc-900 px-2 py-1 text-xs text-zinc-200 outline-none focus:border-yellow-500/60"
      >
        {OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
