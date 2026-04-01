import { useTheme } from "@/contexts/ThemeContext";
import { BookOpenText } from "lucide-react";

interface Props {
  instructions?: string | null;
  referenceImages?: string[];
}

export function AssignmentInstructions({ instructions, referenceImages = [] }: Props) {
  const { isDark } = useTheme();

  return (
    <div
      className={`rounded-xl border p-4 ${
        isDark ? "border-white/8 bg-white/3" : "border-black/8 bg-black/2"
      }`}
    >
      <div className="flex items-center gap-2">
        <BookOpenText className="h-4 w-4 text-yellow-400" />
        <h4 className="text-sm font-semibold">Assignment Instructions</h4>
      </div>

      <p className={`mt-2 whitespace-pre-wrap text-sm ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
        {instructions?.trim() || "No special instructions were provided for this assignment."}
      </p>

      {referenceImages.length > 0 && (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {referenceImages.map((imageUrl, idx) => (
            <a
              key={`${imageUrl}-${idx}`}
              href={imageUrl}
              target="_blank"
              rel="noreferrer"
              className={`group overflow-hidden rounded-lg border ${
                isDark ? "border-white/8" : "border-black/8"
              }`}
            >
              <img
                src={imageUrl}
                alt={`Reference ${idx + 1}`}
                className="h-36 w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
