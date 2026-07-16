"use client";

import { ChangeEvent, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { Image } from "@tiptap/extension-image";
import { Link } from "@tiptap/extension-link";
import {
  Table,
  TableCell,
  TableHeader,
  TableRow,
} from "@tiptap/extension-table";
import { TextAlign } from "@tiptap/extension-text-align";
import { Underline } from "@tiptap/extension-underline";
import { Superscript } from "@tiptap/extension-superscript"; // 👈 Новое
import { Subscript } from "@tiptap/extension-subscript"; // 👈 Новое

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  minHeight?: number;
};

function ToolbarButton({
  active,
  disabled,
  onClick,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={
        active
          ? "rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
          : "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
      }
    >
      {children}
    </button>
  );
}

export function RichTextEditor({
  value,
  onChange,
  minHeight = 260,
}: RichTextEditorProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      Superscript, // 👈 Добавляем
      Subscript, // 👈 Добавляем
      Image.configure({
        allowBase64: false,
        HTMLAttributes: {
          class: "content-image",
        },
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: "https",
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class:
          "content-html min-h-[220px] rounded-b-2xl border-x border-b border-slate-200 bg-white px-4 py-4 outline-none",
      },
    },
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
  });

  if (!editor) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
        Загружаем редактор...
      </div>
    );
  }

  const activeEditor = editor;

  function addImageByUrl() {
    const url = window.prompt("Вставь ссылку на картинку");

    if (!url?.trim()) {
      return;
    }

    activeEditor.chain().focus().setImage({ src: url.trim() }).run();
  }

  function setLink() {
    const previousUrl = activeEditor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Вставь ссылку", previousUrl ?? "");

    if (url === null) {
      return;
    }

    if (!url.trim()) {
      activeEditor.chain().focus().unsetLink().run();
      return;
    }

    activeEditor.chain().focus().setLink({ href: url.trim() }).run();
  }

  async function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Не удалось загрузить картинку");
        return;
      }

      activeEditor.chain().focus().setImage({ src: data.url }).run();
    } catch {
      alert("Не удалось загрузить картинку");
    } finally {
      setIsUploading(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleImageUpload}
        className="hidden"
      />

      <div className="flex flex-wrap gap-2 rounded-t-2xl border border-slate-200 bg-slate-50 p-3">
        <ToolbarButton
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          Ж
        </ToolbarButton>

        <ToolbarButton
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          К
        </ToolbarButton>

        <ToolbarButton
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          Ч
        </ToolbarButton>

        <ToolbarButton
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          S
        </ToolbarButton>

        {/* 👇 Новые кнопки для надстрочного и подстрочного текста */}
        <ToolbarButton
          active={editor.isActive("superscript")}
          onClick={() => editor.chain().focus().toggleSuperscript().run()}
        >
          x²
        </ToolbarButton>

        <ToolbarButton
          active={editor.isActive("subscript")}
          onClick={() => editor.chain().focus().toggleSubscript().run()}
        >
          x₂
        </ToolbarButton>

        <ToolbarButton
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          H2
        </ToolbarButton>

        <ToolbarButton
          active={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          H3
        </ToolbarButton>

        <ToolbarButton
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          • список
        </ToolbarButton>

        <ToolbarButton
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          1. список
        </ToolbarButton>

        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("left").run()}>
          ←
        </ToolbarButton>

        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("center").run()}>
          ↔
        </ToolbarButton>

        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("right").run()}>
          →
        </ToolbarButton>

        <ToolbarButton active={editor.isActive("link")} onClick={setLink}>
          Ссылка
        </ToolbarButton>

        <ToolbarButton onClick={addImageByUrl}>Картинка URL</ToolbarButton>

        <ToolbarButton
          disabled={isUploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {isUploading ? "Загрузка..." : "Загрузить картинку"}
        </ToolbarButton>

        <ToolbarButton
          onClick={() =>
            editor
              .chain()
              .focus()
              .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
              .run()
          }
        >
          Таблица
        </ToolbarButton>

        <ToolbarButton
          disabled={!editor.can().addColumnAfter()}
          onClick={() => editor.chain().focus().addColumnAfter().run()}
        >
          + колонка
        </ToolbarButton>

        <ToolbarButton
          disabled={!editor.can().addRowAfter()}
          onClick={() => editor.chain().focus().addRowAfter().run()}
        >
          + строка
        </ToolbarButton>

        <ToolbarButton
          disabled={!editor.can().deleteColumn()}
          onClick={() => editor.chain().focus().deleteColumn().run()}
        >
          − колонка
        </ToolbarButton>

        <ToolbarButton
          disabled={!editor.can().deleteRow()}
          onClick={() => editor.chain().focus().deleteRow().run()}
        >
          − строка
        </ToolbarButton>

        <ToolbarButton
          disabled={!editor.can().deleteTable()}
          onClick={() => editor.chain().focus().deleteTable().run()}
        >
          Удалить таблицу
        </ToolbarButton>
      </div>

      <div style={{ minHeight }}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}