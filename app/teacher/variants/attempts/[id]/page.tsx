import Link from "next/link";
import { notFound } from "next/navigation";

import { formatAnswerForDisplay } from "@/lib/answer";
import { primaryToEgeTestScore } from "@/lib/egeScore";
import { prisma } from "@/lib/prisma";
import { getVariantTaskMaxPoints } from "@/lib/variantScoring";

export const dynamic = "force-dynamic";

type AttemptPageProps = {
  params: Promise<{ id: string }>;
};

function formatDate(value: Date | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(value);
}

export default async function TeacherVariantAttemptPage({
  params,
}: AttemptPageProps) {
  const { id } = await params;
  const attempt = await prisma.variantAttempt.findFirst({
    where: {
      id,
      status: "SUBMITTED",
    },
    include: {
      student: {
        select: {
          name: true,
          email: true,
        },
      },
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
      answers: true,
    },
  });

  if (!attempt) {
    notFound();
  }

  const answerByTaskId = new Map(
    attempt.answers.map((answer) => [answer.taskId, answer])
  );

  return (
    <main className="min-h-screen bg-[#f4f7f8] px-4 py-6 text-slate-950 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-5xl">
        <Link
          href={`/teacher/variants/${attempt.variantId}`}
          className="text-sm font-bold text-slate-600"
        >
          ← К результатам варианта
        </Link>

        <header className="mt-5 rounded-[2rem] bg-slate-950 p-7 text-white shadow-xl sm:p-9">
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-cyan-300">
            attempt.review
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] sm:text-4xl">
            {attempt.student.name}
          </h1>
          <p className="mt-2 text-sm text-slate-300">
            {attempt.variant.title} · {formatDate(attempt.submittedAt)}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <span className="rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 font-black">
              {attempt.score}/{attempt.maxScore} баллов
            </span>
            <span className="rounded-xl bg-cyan-300 px-4 py-3 font-black text-slate-950">
              {primaryToEgeTestScore(attempt.score)}/100 ЕГЭ
            </span>
          </div>
        </header>

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
                key={variantTask.id}
                className={`rounded-[2rem] border bg-white p-6 shadow-sm ${
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
                    {awardedPoints}/{maxPoints}
                  </span>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
                      Ответ ученика
                    </div>
                    <pre className="mt-2 whitespace-pre-wrap font-mono text-sm">
                      {formatAnswerForDisplay(answer?.rawAnswer)}
                    </pre>
                  </div>
                  <div className="rounded-2xl bg-cyan-50 p-4">
                    <div className="text-xs font-bold uppercase tracking-wide text-cyan-700">
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
                      Показать разбор
                    </summary>
                    <div
                      className="prose prose-slate max-w-none border-t border-slate-200 px-4 py-4"
                      dangerouslySetInnerHTML={{
                        __html: variantTask.task.explanationHtml,
                      }}
                    />
                  </details>
                ) : null}
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
