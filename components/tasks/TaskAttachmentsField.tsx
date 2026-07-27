"use client";

import { useRef } from "react";

export type TaskAttachmentItem = {
  id: string;
  originalName: string;
  extension: string;
  sizeBytes: number;
};

type TaskAttachmentsFieldProps = {
  attachments: TaskAttachmentItem[];
  pendingFiles: File[];
  isBusy: boolean;
  deletingAttachmentId: string | null;
  onSelectFiles: (files: File[]) => void | Promise<void>;
  onRemovePendingFile: (index: number) => void;
  onDeleteAttachment: (
    attachmentId: string
  ) => void | Promise<void>;
};

function formatFileSize(sizeBytes: number) {
  if (sizeBytes < 1024) {
    return `${sizeBytes} Б`;
  }

  if (sizeBytes < 1024 * 1024) {
    return `${Math.ceil(sizeBytes / 1024)} КБ`;
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} МБ`;
}

function getFileBadge(extension: string) {
  switch (extension.toLowerCase()) {
    case ".txt":
      return "TXT";
    case ".ods":
    case ".xls":
      return "XLS";
    case ".odt":
    case ".doc":
      return "DOC";
    default:
      return "FILE";
  }
}

export function TaskAttachmentsField({
  attachments,
  pendingFiles,
  isBusy,
  deletingAttachmentId,
  onSelectFiles,
  onRemovePendingFile,
  onDeleteAttachment,
}: TaskAttachmentsFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const totalFiles = attachments.length + pendingFiles.length;
  const canAddFiles = totalFiles < 5 && !isBusy;

  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-950">
            Файлы к заданию
          </h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            До 5 файлов, каждый до 20 МБ. Поддерживаются .txt, .odt,
            .ods, .xls и .doc.
          </p>
        </div>

        <button
          type="button"
          disabled={!canAddFiles}
          onClick={() => inputRef.current?.click()}
          className="shrink-0 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-cyan-400 hover:text-cyan-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isBusy ? "Подождите..." : "Выбрать файлы"}
        </button>

        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".txt,.odt,.ods,.xls,.doc"
          className="hidden"
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            event.target.value = "";

            if (files.length > 0) {
              void onSelectFiles(files);
            }
          }}
        />
      </div>

      {attachments.length === 0 && pendingFiles.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-5 text-center text-sm text-slate-500">
          Дополнительные файлы не прикреплены
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-slate-950 font-mono text-[10px] font-bold text-cyan-300">
                {getFileBadge(attachment.extension)}
              </span>

              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-slate-900">
                  {attachment.originalName}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {formatFileSize(attachment.sizeBytes)}
                </div>
              </div>

              <button
                type="button"
                disabled={
                  isBusy ||
                  deletingAttachmentId === attachment.id
                }
                onClick={() =>
                  void onDeleteAttachment(attachment.id)
                }
                className="rounded-lg px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deletingAttachmentId === attachment.id
                  ? "Удаляем..."
                  : "Удалить"}
              </button>
            </div>
          ))}

          {pendingFiles.map((file, index) => {
            const extension =
              file.name.slice(file.name.lastIndexOf(".")).toLowerCase();

            return (
              <div
                key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
                className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-amber-900 font-mono text-[10px] font-bold text-amber-100">
                  {getFileBadge(extension)}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-slate-900">
                    {file.name}
                  </div>
                  <div className="mt-1 text-xs text-amber-800">
                    {formatFileSize(file.size)} · загрузится после
                    сохранения задачи
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => onRemovePendingFile(index)}
                  className="rounded-lg px-3 py-2 text-xs font-semibold text-amber-900 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Убрать
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-3 text-right font-mono text-[11px] text-slate-400">
        {totalFiles}/5
      </div>
    </section>
  );
}
