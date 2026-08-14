"use client";

import { useEffect, useState } from "react";

type TaskAnswerReviewButtonProps = {
  egeNumber: number;
  title: string;
  statementHtml: string;
  studentAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
};

export function TaskAnswerReviewButton({
  egeNumber,
  title,
  statementHtml,
  studentAnswer,
  correctAnswer,
  isCorrect,
}: TaskAnswerReviewButtonProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-left font-semibold text-slate-800 underline decoration-cyan-300 decoration-2 underline-offset-4 transition hover:text-cyan-800"
      >
        №{egeNumber}. {title}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={`Задание №${egeNumber}`}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white/95 p-5 backdrop-blur sm:p-6">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-700">
                  Задание №{egeNumber}
                </div>
                <h2 className="mt-1 text-xl font-black text-slate-950 sm:text-2xl">
                  {title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-slate-200 text-xl text-slate-500 transition hover:bg-slate-100"
                aria-label="Закрыть"
              >
                ×
              </button>
            </header>

            <div className="space-y-5 p-5 sm:p-6">
              <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                <div className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">
                  Условие
                </div>
                <div
                  className="prose prose-slate max-w-none text-slate-900"
                  dangerouslySetInnerHTML={{ __html: statementHtml }}
                />
              </section>

              <section className="grid gap-4 md:grid-cols-2">
                <div
                  className={`rounded-2xl border p-4 ${
                    isCorrect
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-rose-200 bg-rose-50"
                  }`}
                >
                  <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Ответ ученика
                  </div>
                  <div className="mt-2 whitespace-pre-wrap break-words font-mono text-base font-bold text-slate-900">
                    {studentAnswer}
                  </div>
                </div>

                <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4">
                  <div className="text-xs font-bold uppercase tracking-wide text-cyan-700">
                    Правильный ответ
                  </div>
                  <div className="mt-2 whitespace-pre-wrap break-words font-mono text-base font-bold text-slate-900">
                    {correctAnswer}
                  </div>
                </div>
              </section>

              <div
                className={`rounded-2xl px-4 py-3 text-sm font-bold ${
                  isCorrect
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-rose-100 text-rose-800"
                }`}
              >
                {isCorrect ? "✓ Ответ засчитан как верный" : "✕ В этом задании допущена ошибка"}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
