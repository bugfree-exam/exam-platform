"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { RichTextEditor } from "@/components/editor/RichTextEditor";
import {
  TaskAttachmentsField,
  type TaskAttachmentItem,
} from "@/components/tasks/TaskAttachmentsField";

type AnswerType =
  | "TEXT"
  | "NUMBER"
  | "NUMBER_LIST"
  | "PAIR_LIST_ORDERED"
  | "PAIR_LIST_UNORDERED";

type TaskFormInitialData = {
  id?: string;
  egeNumber: number;
  title: string;
  statementHtml: string;
  answerType: AnswerType;
  correctAnswerText: string;
  explanationHtml: string;
  videoUrl: string;
  source: string;
  difficulty: number | null;
  isPublic: boolean;
  attachments: TaskAttachmentItem[];
};

type TaskFormProps = {
  mode: "create" | "edit";
  initialData?: TaskFormInitialData;
};

const ANSWER_TYPES: { value: AnswerType; label: string; hint: string }[] = [
  {
    value: "TEXT",
    label: "Текст",
    hint: "Например: комбинаторика",
  },
  {
    value: "NUMBER",
    label: "Одно число",
    hint: "Например: 20",
  },
  {
    value: "NUMBER_LIST",
    label: "Список чисел",
    hint: "Например: 10 20 30",
  },
  {
    value: "PAIR_LIST_ORDERED",
    label: "Пары чисел, порядок важен",
    hint: "Каждая пара с новой строки: 1 2 / 3 4",
  },
  {
    value: "PAIR_LIST_UNORDERED",
    label: "Пары чисел, порядок не важен",
    hint: "Каждая пара с новой строки: 1 2 / 3 4",
  },
];

const DEFAULT_DATA: TaskFormInitialData = {
  egeNumber: 1,
  title: "",
  statementHtml: "",
  answerType: "NUMBER",
  correctAnswerText: "",
  explanationHtml: "",
  videoUrl: "",
  source: "",
  difficulty: null,
  isPublic: true,
  attachments: [],
};


const MAX_TASK_FILES = 5;
const MAX_TASK_FILE_SIZE_BYTES = 20 * 1024 * 1024;
const ALLOWED_TASK_FILE_EXTENSIONS = new Set([
  ".txt",
  ".odt",
  ".ods",
  ".xls",
  ".doc",
]);

function getFileExtension(filename: string) {
  const dotIndex = filename.lastIndexOf(".");

  if (dotIndex < 0) {
    return "";
  }

  return filename.slice(dotIndex).toLowerCase();
}

function validateSelectedFiles(files: File[], currentCount: number) {
  if (files.length === 0) {
    return "Выберите хотя бы один файл";
  }

  if (currentCount + files.length > MAX_TASK_FILES) {
    return `К задаче можно прикрепить не более ${MAX_TASK_FILES} файлов`;
  }

  for (const file of files) {
    const extension = getFileExtension(file.name);

    if (!ALLOWED_TASK_FILE_EXTENSIONS.has(extension)) {
      return `Файл «${file.name}» имеет неподдерживаемый формат`;
    }

    if (file.size <= 0) {
      return `Файл «${file.name}» пуст`;
    }

    if (file.size > MAX_TASK_FILE_SIZE_BYTES) {
      return `Файл «${file.name}» превышает допустимый размер 20 МБ`;
    }
  }

  return null;
}

async function uploadTaskFiles(
  taskId: string,
  files: File[]
): Promise<TaskAttachmentItem[]> {
  const formData = new FormData();

  for (const file of files) {
    formData.append("files", file);
  }

  const response = await fetch(`/api/tasks/${taskId}/attachments`, {
    method: "POST",
    body: formData,
  });

  const result = (await response.json().catch(() => null)) as
    | {
        message?: string;
        attachments?: TaskAttachmentItem[];
      }
    | null;

  if (!response.ok) {
    throw new Error(result?.message || "Не удалось загрузить файлы");
  }

  return result?.attachments ?? [];
}

export function TaskForm({ mode, initialData }: TaskFormProps) {
  const router = useRouter();

  const data = initialData ?? DEFAULT_DATA;

  const [egeNumber, setEgeNumber] = useState(data.egeNumber);
  const [title, setTitle] = useState(data.title);
  const [statementHtml, setStatementHtml] = useState(data.statementHtml);
  const [answerType, setAnswerType] = useState<AnswerType>(data.answerType);
  const [correctAnswerText, setCorrectAnswerText] = useState(
    data.correctAnswerText
  );
  const [explanationHtml, setExplanationHtml] = useState(data.explanationHtml);
  const [videoUrl, setVideoUrl] = useState(data.videoUrl);
  const [source, setSource] = useState(data.source);
  const [difficulty, setDifficulty] = useState<number | null>(data.difficulty);
  const [isPublic, setIsPublic] = useState(data.isPublic);

  const [attachments, setAttachments] = useState<TaskAttachmentItem[]>(
    data.attachments
  );
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [persistedTaskId, setPersistedTaskId] = useState<string | null>(
    initialData?.id ?? null
  );
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<
    string | null
  >(null);

  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const selectedAnswerType = useMemo(
    () => ANSWER_TYPES.find((item) => item.value === answerType),
    [answerType]
  );

  async function handleSelectedFiles(files: File[]) {
    setError("");

    const validationError = validateSelectedFiles(
      files,
      attachments.length + pendingFiles.length
    );

    if (validationError) {
      setError(validationError);
      return;
    }

    if (!persistedTaskId) {
      setPendingFiles((current) => [...current, ...files]);
      return;
    }

    setIsUploading(true);

    try {
      const uploadedAttachments = await uploadTaskFiles(
        persistedTaskId,
        files
      );

      setAttachments((current) => [
        ...current,
        ...uploadedAttachments,
      ]);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Не удалось загрузить файлы"
      );
    } finally {
      setIsUploading(false);
    }
  }

  function handleRemovePendingFile(index: number) {
    setPendingFiles((current) =>
      current.filter((_, currentIndex) => currentIndex !== index)
    );
  }

  async function handleDeleteAttachment(attachmentId: string) {
    if (!persistedTaskId) {
      return;
    }

    const shouldDelete = window.confirm(
      "Удалить этот файл из задания?"
    );

    if (!shouldDelete) {
      return;
    }

    setError("");
    setDeletingAttachmentId(attachmentId);

    try {
      const response = await fetch(
        `/api/tasks/${persistedTaskId}/attachments/${attachmentId}`,
        {
          method: "DELETE",
        }
      );

      const result = (await response.json().catch(() => null)) as
        | {
            message?: string;
          }
        | null;

      if (!response.ok) {
        throw new Error(result?.message || "Не удалось удалить файл");
      }

      setAttachments((current) =>
        current.filter(
          (attachment) => attachment.id !== attachmentId
        )
      );
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Не удалось удалить файл"
      );
    } finally {
      setDeletingAttachmentId(null);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setIsSaving(true);

    try {
      const taskAlreadyExists = Boolean(persistedTaskId);

      const url = taskAlreadyExists
        ? `/api/tasks/${persistedTaskId}`
        : "/api/tasks";

      const response = await fetch(url, {
        method: taskAlreadyExists ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          egeNumber,
          title,
          statementHtml,
          answerType,
          correctAnswerText,
          explanationHtml,
          videoUrl,
          source,
          difficulty,
          isPublic,
        }),
      });

      const result = (await response.json().catch(() => null)) as
        | {
            message?: string;
            task?: {
              id: string;
            };
          }
        | null;

      if (!response.ok || !result?.task?.id) {
        setError(result?.message || "Не удалось сохранить задачу");
        return;
      }

      const taskId = result.task.id;
      setPersistedTaskId(taskId);

      if (pendingFiles.length > 0) {
        setIsUploading(true);

        try {
          const uploadedAttachments = await uploadTaskFiles(
            taskId,
            pendingFiles
          );

          setAttachments((current) => [
            ...current,
            ...uploadedAttachments,
          ]);
          setPendingFiles([]);
        } catch (uploadError) {
          setError(
            `Задача сохранена, но файлы не загрузились. ${
              uploadError instanceof Error
                ? uploadError.message
                : "Повторите попытку"
            }`
          );
          return;
        } finally {
          setIsUploading(false);
        }
      }

      router.push(`/teacher/tasks/${taskId}`);
      router.refresh();
    } catch {
      setError("Не удалось подключиться к серверу");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-[160px_1fr]">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            № ЕГЭ
          </label>
          <select
            value={egeNumber}
            onChange={(event) => setEgeNumber(Number(event.target.value))}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
          >
            {Array.from({ length: 27 }, (_, index) => index + 1).map(
              (number) => (
                <option key={number} value={number}>
                  №{number}
                </option>
              )
            )}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Название задачи
          </label>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
            placeholder="Например: Задание 5. Исполнитель"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Условие задачи
        </label>
        <RichTextEditor
          value={statementHtml}
          onChange={setStatementHtml}
          minHeight={320}
        />
        <p className="mt-2 text-xs text-slate-500">
          Можно добавлять форматирование, картинки, ссылки, списки и таблицы.
        </p>
      </div>

      <TaskAttachmentsField
        attachments={attachments}
        pendingFiles={pendingFiles}
        isBusy={isSaving || isUploading}
        deletingAttachmentId={deletingAttachmentId}
        onSelectFiles={handleSelectedFiles}
        onRemovePendingFile={handleRemovePendingFile}
        onDeleteAttachment={handleDeleteAttachment}
      />

      <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Тип ответа
          </label>
          <select
            value={answerType}
            onChange={(event) => setAnswerType(event.target.value as AnswerType)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
          >
            {ANSWER_TYPES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs text-slate-500">
            {selectedAnswerType?.hint}
          </p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Сложность
          </label>
          <select
            value={difficulty ?? ""}
            onChange={(event) =>
              setDifficulty(
                event.target.value ? Number(event.target.value) : null
              )
            }
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
          >
            <option value="">Не указана</option>
            <option value="1">1 — простая</option>
            <option value="2">2</option>
            <option value="3">3 — средняя</option>
            <option value="4">4</option>
            <option value="5">5 — сложная</option>
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Правильный ответ
        </label>
        <textarea
          value={correctAnswerText}
          onChange={(event) => setCorrectAnswerText(event.target.value)}
          rows={answerType.startsWith("PAIR_LIST") ? 5 : 2}
          className="w-full rounded-xl border border-slate-200 px-4 py-3 font-mono text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
          placeholder={
            answerType.startsWith("PAIR_LIST")
              ? "1 2\n3 4"
              : selectedAnswerType?.hint
          }
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Решение / пояснение
        </label>
        <RichTextEditor
          value={explanationHtml}
          onChange={setExplanationHtml}
          minHeight={240}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Ссылка на видео
          </label>
          <input
            value={videoUrl}
            onChange={(event) => setVideoUrl(event.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
            placeholder="https://..."
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Источник
          </label>
          <input
            value={source}
            onChange={(event) => setSource(event.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
            placeholder="РешуЕГЭ, КЕГЭ, авторская и т.д."
          />
        </div>
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-cyan-200 bg-cyan-50/70 p-4">
        <input
          type="checkbox"
          checked={isPublic}
          onChange={(event) => setIsPublic(event.target.checked)}
          className="mt-1 h-4 w-4"
        />
        <span>
          <span className="block text-sm font-bold text-slate-900">
            Показывать в открытом банке
          </span>
          <span className="mt-1 block text-xs leading-5 text-slate-600">
            Условие и файлы будут доступны без регистрации. Правильный ответ
            останется на сервере и появится только после проверки.
          </span>
        </span>
      </label>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isSaving || isUploading}
          className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isUploading
            ? "Загружаем файлы..."
            : isSaving
              ? "Сохраняем..."
              : mode === "create" && !persistedTaskId
                ? "Создать задачу"
                : "Сохранить изменения"}
        </button>

        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Назад
        </button>
      </div>
    </form>
  );
}
