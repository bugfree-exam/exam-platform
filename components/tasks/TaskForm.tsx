"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RichTextEditor } from "@/components/editor/RichTextEditor";

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
};

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

  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const selectedAnswerType = useMemo(
    () => ANSWER_TYPES.find((item) => item.value === answerType),
    [answerType]
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setIsSaving(true);

    try {
      const url =
        mode === "create" ? "/api/tasks" : `/api/tasks/${initialData?.id}`;

      const response = await fetch(url, {
        method: mode === "create" ? "POST" : "PUT",
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
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.message || "Не удалось сохранить задачу");
        return;
      }

      router.push(`/teacher/tasks/${result.task.id}`);
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

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isSaving}
          className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving
            ? "Сохраняем..."
            : mode === "create"
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