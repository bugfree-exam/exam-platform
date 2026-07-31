import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { StartVariantButton } from "@/components/variants/StartVariantButton";
import { requireStudentPage } from "@/lib/access";
import { formatAnswerForDisplay } from "@/lib/answer";
import { primaryToEgeTestScore } from "@/lib/egeScore";
import { prisma } from "@/lib/prisma";
import { getVariantTaskMaxPoints } from "@/lib/variantScoring";

export const dynamic = "force-dynamic";

type ResultPageProps = {
  params: Promise<{
    id: string;
    attemptId: string;
  }>;
};

function formatDate(value: Date | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(value);
}

function formatDuration(startedAt: Date, submittedAt: Date | null) {
  if (!submittedAt) return "—";

  const minutes = Math.max(
    1,
    Math.round((submittedAt.getTime() - startedAt.getTime()) / 60000)
  );
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  return hours > 0 ? `${hours} ч ${remainder} мин` : `${minutes} мин`;
}

export default async function StudentVariantResultPage({
  params,
}: ResultPageProps) {
  const user = await requireStudentPage();
  const { id: variantId, attemptId } = await params;
  const attempt = await prisma.variantAttempt.findFirst({
    where: {
      id: attemptId,
      variantId,
      studentId: user.id,
    },
    include: {
      answers: true,
      variant: {
        include: {
          tasks: {
            orderBy: { order: "asc" },
            include: {
              task: {
                select: {
                  id: true,
                  egeNumber: true,
                  title: true,
                  correctAnswer: true,
                  explanationHtml: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!attempt) {
    notFound();
  }

  if (attempt.status !== "SUBMITTED") {
    redirect(`/student/variants/${variantId}/attempt/${attemptId}`);
  }

  const answerByTaskId = new Map(
    attempt.answers.map((answer) => [answer.taskId, answer])
  );
  const correctCount = attempt.answers.filter(
    (answer) => answer.isCorrect
  ).length;
  const wrongTasks = attempt.variant.tasks.filter(
    (variantTask) => !answerByTaskId.get(variantTask.taskId)?.isCorrect
  );
  const egeTestScore = primaryToEgeTestScore(attempt.score);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f4f7f8] px-4 py-5 text-slate-950 sm:px-6 sm:py-8">
      <div className="relative mx-auto max-w-6xl">
        <nav className="flex items-center justify-between gap-4">
          <Link
            href="/student/variants"
            className="text-sm font-bold text-slate-600"
          >
            ← К вариантам
          </Link>
          <Link
            href="/student/results"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700"
          >
            Вся статистика
          </Link>
        </nav>

        <header className="mt-5 overflow-hidden rounded-[2rem] bg-slate-950 p-7 text-white shadow-xl sm:p-9">
          <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-end">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-cyan-300">
                exam.result
              </div>
              <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] sm:text-5xl">
                {attempt.variant.title}
              </h1>
              <p className="mt-4 text-sm text-slate-300">
                Завершён {formatDate(attempt.submittedAt)} · в работе{" "}
                {formatDuration(attempt.startedAt, attempt.submittedAt)}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5">
                <div className="text-xs text-slate-400">Первичный балл</div>
                <div className="mt-2 text-4xl font-black text-white">
                  {attempt.score}
                  <span className="text-lg text-slate-500">
                    /{attempt.maxScore}
                  </span>
                </div>
              </div>
              <div className="rounded-2xl bg-cyan-300 p-5 text-slate-950">
                <div className="text-xs font-bold text-cyan-950/70">
                  Тестовый балл ЕГЭ
                </div>
                <div className="mt-2 text-4xl font-black">
                  {egeTestScore}
                  <span className="text-lg text-cyan-950/50">/100</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        <section className="mt-6 grid gap-4 sm:grid-cols-3">
          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Верно
            </div>
            <div className="mt-2 text-3xl font-black text-emerald-700">
              {correctCount}
            </div>
          </article>
          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Ошибок
            </div>
            <div className="mt-2 text-3xl font-black text-rose-700">
              {wrongTasks.length}
            </div>
          </article>
          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Следующий шаг
            </div>
            <div className="mt-3">
              <StartVariantButton
                variantId={variantId}
                restart
                label="Решить заново"
              />
            </div>
          </article>
        </section>

        <section className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-700">
                task.map
              </div>
              <h2 className="mt-2 text-2xl font-black tracking-tight">
                Карта варианта
              </h2>
            </div>
            <p className="text-sm text-slate-500">
              Нажмите на номер, чтобы перейти к разбору.
            </p>
          </div>

          <div className="mt-6 grid grid-cols-6 gap-2 sm:grid-cols-9 lg:grid-cols-[repeat(14,minmax(0,1fr))]">
            {attempt.variant.tasks.map((variantTask) => {
              const answer = answerByTaskId.get(variantTask.taskId);

              return (
                <a
                  key={variantTask.id}
                  href={`#result-${variantTask.taskId}`}
                  className={`grid aspect-square place-items-center rounded-xl text-sm font-black ${
                    answer?.isCorrect
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-rose-100 text-rose-800"
                  }`}
                >
                  {variantTask.order}
                </a>
              );
            })}
          </div>

          {wrongTasks.length > 0 ? (
            <div className="mt-6 rounded-2xl border border-rose-100 bg-rose-50 p-5">
              <div className="font-black text-rose-900">
                Номера для повторения
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {wrongTasks.map((variantTask) => (
                  <span
                    key={variantTask.id}
                    className="rounded-full bg-white px-3 py-1 text-sm font-bold text-rose-700"
                  >
                    №{variantTask.task.egeNumber}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        <section className="mt-6 space-y-4">
          {attempt.variant.tasks.map((variantTask) => {
            const answer = answerByTaskId.get(variantTask.taskId);
            const maxPoints = getVariantTaskMaxPoints(
              variantTask.task.egeNumber
            );
            const awardedPoints = answer?.awardedPoints ?? 0;
            const isCorrect = answer?.isCorrect ?? false;
            const isPartial = awardedPoints > 0 && awardedPoints < maxPoints;

            return (
              <article
                id={`result-${variantTask.taskId}`}
                key={variantTask.id}
                className={`scroll-mt-5 rounded-[2rem] border bg-white p-6 shadow-sm ${
                  isCorrect
                    ? "border-emerald-200"
                    : isPartial
                      ? "border-amber-200"
                      : "border-rose-200"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">
                        Задание {variantTask.order}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          isCorrect
                            ? "bg-emerald-50 text-emerald-700"
                            : isPartial
                              ? "bg-amber-50 text-amber-700"
                              : "bg-rose-50 text-rose-700"
                        }`}
                      >
                        {isCorrect ? "Верно" : isPartial ? "Частично" : "Ошибка"}
                      </span>
                    </div>
                    <h2 className="mt-3 text-xl font-black">
                      {variantTask.task.title}
                    </h2>
                  </div>
                  <span className="font-mono text-sm font-black text-slate-500">
                    {awardedPoints}/{maxPoints} балл
                  </span>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
                      Ваш ответ
                    </div>
                    <pre className="mt-2 whitespace-pre-wrap font-mono text-sm">
                      {formatAnswerForDisplay(answer?.rawAnswer)}
                    </pre>
                  </div>
                  <div
                    className={`rounded-2xl p-4 ${
                      isCorrect ? "bg-emerald-50" : "bg-rose-50"
                    }`}
                  >
                    <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Правильный ответ
                    </div>
                    <pre className="mt-2 whitespace-pre-wrap font-mono text-sm">
                      {formatAnswerForDisplay(variantTask.task.correctAnswer)}
                    </pre>
                  </div>
                </div>

                {variantTask.task.explanationHtml ? (
                  <details className="mt-4 rounded-2xl border border-slate-200">
                    <summary className="cursor-pointer px-4 py-3 text-sm font-bold">
                      Показать разбор задания
                    </summary>
                    <div
                      className="prose prose-slate max-w-none border-t border-slate-200 px-4 py-4"
                      dangerouslySetInnerHTML={{
                        __html: variantTask.task.explanationHtml,
                      }}
                    />
                  </details>
                ) : (
                  <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                    Разбор для этого задания пока не добавлен.
                  </div>
                )}
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
