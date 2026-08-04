"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type ExamTask = {
  id: string;
  order: number;
  egeNumber: number;
  title: string;
  statementHtml: string;
  answerType:
    | "TEXT"
    | "NUMBER"
    | "NUMBER_LIST"
    | "PAIR_LIST_ORDERED"
    | "PAIR_LIST_UNORDERED";
  attachments: {
    id: string;
    originalName: string;
    extension: string;
    sizeBytes: number;
  }[];
};

type ExamStationSolverProps = {
  attemptId: string;
  variantId: string;
  variantTitle: string;
  durationMinutes: number;
  timerEnabled: boolean;
  startedAt: string;
  tasks: ExamTask[];
  savedAnswers: Record<string, string>;
};

function formatTime(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

function formatFileSize(sizeBytes: number) {
  if (sizeBytes < 1024) return `${sizeBytes} Б`;
  if (sizeBytes < 1024 * 1024) return `${Math.ceil(sizeBytes / 1024)} КБ`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} МБ`;
}

function answerPlaceholder(answerType: ExamTask["answerType"]) {
  if (answerType.startsWith("PAIR_LIST")) {
    return "Введите каждую пару с новой строки";
  }
  if (answerType === "NUMBER_LIST") return "Введите числа через пробел";
  if (answerType === "NUMBER") return "Введите число";
  return "Введите ответ";
}

export function ExamStationSolver({
  attemptId,
  variantId,
  variantTitle,
  durationMinutes,
  timerEnabled,
  startedAt,
  tasks,
  savedAnswers,
}: ExamStationSolverProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] =
    useState<Record<string, string>>(savedAnswers);
  const [saveState, setSaveState] = useState<
    "saved" | "saving" | "error"
  >("saved");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submissionStarted = useRef(false);

  const endTime = useMemo(
    () =>
      new Date(startedAt).getTime() + durationMinutes * 60 * 1000,
    [durationMinutes, startedAt]
  );
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.ceil((endTime - Date.now()) / 1000))
  );
  const currentTask = tasks[currentIndex];
  const answeredCount = tasks.filter(
    (task) => answers[task.id]?.trim()
  ).length;

  useEffect(() => {
    if (!timerEnabled) return;

    const interval = window.setInterval(() => {
      setSecondsLeft(Math.max(0, Math.ceil((endTime - Date.now()) / 1000)));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [endTime, timerEnabled]);

  useEffect(() => {
    const timeout = window.setTimeout(async () => {
      setSaveState("saving");

      try {
        const response = await fetch(
          `/api/student/variants/attempts/${attemptId}/answers`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ answers }),
          }
        );

        setSaveState(response.ok ? "saved" : "error");
      } catch {
        setSaveState("error");
      }
    }, 700);

    return () => window.clearTimeout(timeout);
  }, [answers, attemptId]);

  useEffect(() => {
    function warnBeforeLeaving(event: BeforeUnloadEvent) {
      if (!submissionStarted.current) {
        event.preventDefault();
      }
    }

    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, []);

  async function submitAttempt(skipConfirmation = false) {
    if (submissionStarted.current) return;

    const unanswered = tasks.length - answeredCount;

    if (
      !skipConfirmation &&
      !window.confirm(
        unanswered > 0
          ? `Без ответа осталось заданий: ${unanswered}. Завершить работу?`
          : "Завершить работу и отправить ответы на проверку?"
      )
    ) {
      return;
    }

    submissionStarted.current = true;
    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch(
        `/api/student/variants/attempts/${attemptId}/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers }),
        }
      );
      const data = await response.json();

      if (!response.ok) {
        submissionStarted.current = false;
        setError(data.message || "Не удалось завершить вариант");
        return;
      }

      router.replace(
        `/student/variants/${variantId}/results/${attemptId}`
      );
      router.refresh();
    } catch {
      submissionStarted.current = false;
      setError("Не удалось подключиться к серверу");
    } finally {
      setIsSubmitting(false);
    }
  }

  useEffect(() => {
    if (timerEnabled && secondsLeft === 0 && !submissionStarted.current) {
      void submitAttempt(true);
    }
  });

  async function toggleFullscreen() {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await document.documentElement.requestFullscreen();
    }
  }

  if (!currentTask) {
    return null;
  }

  return (
    <main className="min-h-screen bg-[#e8eaed] text-[#202124]">
      <header className="sticky top-0 z-30 border-b border-[#c7c9cc] bg-[#f8f9fa] shadow-sm">
        <div className="flex min-h-16 items-center justify-between gap-4 px-4 sm:px-6">
          <div className="min-w-0">
            <div className="truncate text-sm font-bold text-[#202124]">
              ЕГЭ по информатике
            </div>
            <div className="truncate text-xs text-[#5f6368]">
              {variantTitle}
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden text-right text-xs text-[#5f6368] sm:block">
              <div>
                {saveState === "saving"
                  ? "Сохранение…"
                  : saveState === "error"
                    ? "Ошибка сохранения"
                    : "Ответы сохранены"}
              </div>
              <div>
                Заполнено {answeredCount} из {tasks.length}
              </div>
            </div>
            <div
              className={`rounded-md border px-3 py-2 font-mono text-base font-bold ${
                timerEnabled && secondsLeft <= 900
                  ? "border-red-300 bg-red-50 text-red-700"
                  : "border-[#c7c9cc] bg-white"
              }`}
            >
              {timerEnabled ? formatTime(secondsLeft) : "Без таймера"}
            </div>
            <Link
              href="/student/variants/help"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden rounded-md border border-[#c7c9cc] bg-white px-3 py-2 text-xs font-bold text-[#1967d2] hover:bg-[#f1f3f4] md:inline-flex"
            >
              Справочные материалы
            </Link>
            <button
              type="button"
              onClick={() => void toggleFullscreen()}
              aria-label="Полноэкранный режим"
              title="Полноэкранный режим"
              className="rounded-md border border-[#c7c9cc] bg-white px-3 py-2 text-xs font-bold hover:bg-[#f1f3f4]"
            >
              ⛶
            </button>
          </div>
        </div>
      </header>

      <div className="grid min-h-[calc(100vh-65px)] lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="border-b border-[#c7c9cc] bg-[#f8f9fa] p-4 lg:border-b-0 lg:border-r">
          <div className="text-xs font-bold uppercase tracking-wide text-[#5f6368]">
            Задания
          </div>
          <div className="mt-3 grid grid-cols-9 gap-1.5 sm:grid-cols-[repeat(14,minmax(0,1fr))] lg:grid-cols-5">
            {tasks.map((task, index) => {
              const isCurrent = index === currentIndex;
              const isAnswered = Boolean(answers[task.id]?.trim());

              return (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => setCurrentIndex(index)}
                  className={`grid aspect-square min-h-8 place-items-center rounded-sm border text-xs font-bold transition ${
                    isCurrent
                      ? "border-[#1a73e8] bg-[#1a73e8] text-white"
                      : isAnswered
                        ? "border-[#7cb797] bg-[#e6f4ea] text-[#137333]"
                        : "border-[#bdc1c6] bg-white hover:border-[#1a73e8]"
                  }`}
                >
                  {task.order}
                </button>
              );
            })}
          </div>

          <div className="mt-5 space-y-2 text-xs text-[#5f6368]">
            <div className="flex items-center gap-2">
              <span className="h-4 w-4 rounded-sm bg-[#1a73e8]" />
              Текущее
            </div>
            <div className="flex items-center gap-2">
              <span className="h-4 w-4 rounded-sm border border-[#7cb797] bg-[#e6f4ea]" />
              Есть ответ
            </div>
          </div>
        </aside>

        <section className="min-w-0 p-3 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-5xl overflow-hidden rounded-md border border-[#c7c9cc] bg-white shadow-sm">
            <div className="flex items-center justify-between gap-4 border-b border-[#dadce0] bg-[#f8f9fa] px-5 py-3">
              <div className="font-bold">
                Задание {currentTask.order} из {tasks.length}
              </div>
              <div className="text-xs text-[#5f6368]">
                №{currentTask.egeNumber} ЕГЭ
              </div>
            </div>

            <article className="min-h-[440px] p-5 sm:p-8">
              <h1 className="text-lg font-bold">{currentTask.title}</h1>
              <div
                className="prose prose-slate mt-5 max-w-none break-words text-[15px] leading-7 [&_img]:h-auto [&_img]:max-w-full [&_pre]:overflow-x-auto [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto"
                dangerouslySetInnerHTML={{
                  __html: currentTask.statementHtml,
                }}
              />

              {currentTask.attachments.length > 0 ? (
                <div className="mt-6 border-t border-[#dadce0] pt-5">
                  <div className="text-sm font-bold">Файлы к заданию</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {currentTask.attachments.map((attachment) => (
                      <a
                        key={attachment.id}
                        href={`/api/task-attachments/${attachment.id}/download`}
                        download
                        className="rounded-md border border-[#bdc1c6] bg-[#f8f9fa] px-4 py-2 text-sm font-bold text-[#1967d2] hover:bg-[#e8f0fe]"
                      >
                        ↓ {attachment.originalName} ·{" "}
                        {formatFileSize(attachment.sizeBytes)}
                      </a>
                    ))}
                  </div>
                </div>
              ) : null}
            </article>

            <div className="border-t border-[#dadce0] bg-[#f8f9fa] p-5 sm:p-6">
              <label className="block text-sm font-bold">Ответ</label>
              {currentTask.answerType.startsWith("PAIR_LIST") ? (
                <textarea
                  rows={4}
                  value={answers[currentTask.id] ?? ""}
                  onChange={(event) =>
                    setAnswers((current) => ({
                      ...current,
                      [currentTask.id]: event.target.value,
                    }))
                  }
                  placeholder={answerPlaceholder(currentTask.answerType)}
                  className="mt-2 w-full rounded-sm border border-[#9aa0a6] bg-white px-3 py-3 font-mono text-sm outline-none focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8]"
                />
              ) : (
                <input
                  value={answers[currentTask.id] ?? ""}
                  onChange={(event) =>
                    setAnswers((current) => ({
                      ...current,
                      [currentTask.id]: event.target.value,
                    }))
                  }
                  placeholder={answerPlaceholder(currentTask.answerType)}
                  className="mt-2 w-full rounded-sm border border-[#9aa0a6] bg-white px-3 py-3 font-mono text-sm outline-none focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8]"
                />
              )}
            </div>
          </div>

          {error ? (
            <div className="mx-auto mt-4 max-w-5xl rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="mx-auto mt-4 flex max-w-5xl flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((index) => index - 1)}
              className="rounded-md border border-[#bdc1c6] bg-white px-5 py-2.5 text-sm font-bold disabled:opacity-40"
            >
              ← Назад
            </button>

            <div className="flex gap-3">
              {currentIndex < tasks.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentIndex((index) => index + 1)}
                  className="rounded-md bg-[#1a73e8] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#1765cc]"
                >
                  Следующее →
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => void submitAttempt()}
                disabled={isSubmitting}
                className="rounded-md bg-[#188038] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#137333] disabled:opacity-60"
              >
                {isSubmitting ? "Проверка…" : "Завершить работу"}
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
