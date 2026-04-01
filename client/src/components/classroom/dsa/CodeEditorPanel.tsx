import Editor from "@monaco-editor/react";
import { motion } from "framer-motion";

interface Props {
  code: string;
  language: "cpp" | "python" | "java";
  onChange: (code: string) => void;
}

function monacoLanguage(language: "cpp" | "python" | "java") {
  if (language === "cpp") return "cpp";
  if (language === "java") return "java";
  return "python";
}

export function CodeEditorPanel({ code, language, onChange }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      className="h-full overflow-hidden rounded-xl border border-white/8 bg-zinc-950"
    >
      <Editor
        height="100%"
        language={monacoLanguage(language)}
        value={code}
        onChange={(value) => onChange(value || "")}
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          lineHeight: 20,
          scrollBeyondLastLine: false,
          tabSize: 2,
          wordWrap: "on",
          padding: { top: 10 },
        }}
      />
    </motion.div>
  );
}
