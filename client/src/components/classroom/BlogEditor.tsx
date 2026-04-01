import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { useTheme } from "@/contexts/ThemeContext";
import {
  Bold,
  Code2,
  Heading1,
  Heading2,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Unlink,
} from "lucide-react";
import { useEffect } from "react";

interface Props {
  value: string;
  onChange: (html: string) => void;
  editable?: boolean;
}

export function BlogEditor({ value, onChange, editable = true }: Props) {
  const { isDark } = useTheme();

  const editor = useEditor({
    editable,
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: "https",
      }),
      Image,
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class: "min-h-[220px] focus:outline-none",
      },
    },
    onUpdate: ({ editor: activeEditor }) => {
      onChange(activeEditor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value !== current) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [editor, value]);

  if (!editor) return null;

  const buttonBase = `flex h-8 w-8 items-center justify-center rounded-md border transition-colors ${
    isDark
      ? "border-white/10 text-zinc-400 hover:bg-white/5"
      : "border-black/10 text-zinc-600 hover:bg-black/5"
  }`;

  const activeClass = isDark ? "bg-white/10 text-white" : "bg-black/10 text-black";

  const setLink = () => {
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("Enter URL", previousUrl || "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const addImage = () => {
    const url = window.prompt("Enter image URL", "https://");
    if (!url) return;
    editor.chain().focus().setImage({ src: url }).run();
  };

  return (
    <div
      className={`rounded-xl border ${
        isDark ? "border-white/8 bg-white/3" : "border-black/8 bg-black/2"
      }`}
    >
      <div
        className={`flex flex-wrap items-center gap-1 border-b p-2 ${
          isDark ? "border-white/8" : "border-black/8"
        }`}
      >
        <button
          type="button"
          className={`${buttonBase} ${editor.isActive("bold") ? activeClass : ""}`}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={`${buttonBase} ${editor.isActive("italic") ? activeClass : ""}`}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={`${buttonBase} ${editor.isActive("heading", { level: 1 }) ? activeClass : ""}`}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          title="Heading 1"
        >
          <Heading1 className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={`${buttonBase} ${editor.isActive("heading", { level: 2 }) ? activeClass : ""}`}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          title="Heading 2"
        >
          <Heading2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={`${buttonBase} ${editor.isActive("bulletList") ? activeClass : ""}`}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Bullet list"
        >
          <List className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={`${buttonBase} ${editor.isActive("orderedList") ? activeClass : ""}`}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Ordered list"
        >
          <ListOrdered className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={`${buttonBase} ${editor.isActive("codeBlock") ? activeClass : ""}`}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          title="Code block"
        >
          <Code2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={`${buttonBase} ${editor.isActive("link") ? activeClass : ""}`}
          onClick={setLink}
          title="Insert link"
        >
          <Link2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={buttonBase}
          onClick={() => editor.chain().focus().unsetLink().run()}
          title="Remove link"
        >
          <Unlink className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={buttonBase}
          onClick={addImage}
          title="Insert image"
        >
          <ImagePlus className="h-4 w-4" />
        </button>
      </div>

      <div className={`p-4 text-sm ${isDark ? "text-zinc-100" : "text-zinc-900"}`}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
