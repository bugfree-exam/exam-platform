import Link from "next/link";
import { notFound } from "next/navigation";

import { StartVariantButton } from "@/components/variants/StartVariantButton";
import { requireStudentPage } from "@/lib/access";
import { primaryToEgeTestScore } from "@/lib/egeScore";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type StudentVariantPageProps = {
  params: Promise<{ id: string }>;
};

function formatDate(value: Date | null) {
  if (!value) return "Без срока";

  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(value);
}

export default async function StudentVariantPage({
  params,
}: StudentVariantPageProps) {
  const user = await requireStudentPage();
  const { id } = await params;
  const variant = await prisma.examVariant.findFirst({
    where: {
      id,
      status: "PUBLISHED",
    },
    include: {
      _count: {
        select: { tasks: true },
      },
      assignments: {
        where: { studentId: user.id },
        select: { deadline: true },
        take: 1,
      },
      attempts: {
        where: { studentId: user.id },
        orderBy: { startedAt: "desc" },
        select: {
          id: true,
          status: true,
          score: true,
          maxScore: true,
          submittedAt: true,
        },
      },
    },
  });

  if (!variant || variant._count.tasks !== 27) notFound();

  const activeAttempt = variant.attempts.find(
    (attempt) => attempt.status === "IN_PROGRESS"
  );
  const latestResult = variant.attempts.find(
    (attempt) => attempt.status === "SUBMITTED"
  );
  const assignment = variant.assignments[0];

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f4f7f8] px-4 py-5 text-slate-950 sm:px-6 sm:py-8">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.3]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(15,23,42,0.045) 1px, transparent 1px), linear-gradient(90deg,rgba(15,23,42,0.045) 1px,transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="relative mx-auto max-w-4xl">
        <nav className="flex items-center justify-between gap-4 rounded-2xl border border-white/80 bg-white/85 px-4 py-3 shadow-sm backdrop-blur">
          <Link href="/student/variants" className="text-sm font-bold text-slate-700">
            ← К вариантам
          </Link>
          <Link
            href="/student/variants/progress"
            className="rounded-xl bg-cyan-50 px-4 py-2 text-sm font-bold text-cyan-700"
          >
            Мой прогресс
          </Link>
        </nav>

        <section className="mt-5 overflow-hidden rounded-[2rem] bg-slate-950 p-7 text-white shadow-xl sm:p-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-2xl">
              <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-cyan-300">
                exam.variant
              </div>
              <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] sm:text-5xl">
                {variant.title}
              </h1>
              <p className="mt-4 text-sm leading-7 text-slate-300 sm:text-base">
                {variant.description ||
                  "Полноценный вариант из 27 заданий в формате экзаменационной станции."}
              </p>
            </div>
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-cyan-300 font-mono text-xl font-black text-slate-950">
              27
            </span>
          </div>

          <div className="mt-6 flex flex-wrap gap-2 text-xs font-bold">
            <span className="rounded-xl bg-white/10 px-3 py-2">
              {variant.durationMinutes} минут
            </span>
            {assignment ? (
              <span className="rounded-xl bg-white/10 px-3 py-2">
                Срок: {formatDate(assignment.deadline)}
              </span>
            ) : (
              <span className="rounded-xl bg-white/10 px-3 py-2">
                Доступен для самостоятельной работы
              </span>
            )}
          </div>
        </section>

        <section className="mt-5 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          {latestResult ? (
            <div className="mb-6 rounded-2xl bg-slate-50 p-5">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Последний результат
                  </div>
                  <div className="mt-1 text-3xl font-black">
                    {latestResult.score}/{latestResult.maxScore}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-cyan-700">
                    {primaryToEgeTestScore(latestResult.score)}/100
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {formatDate(latestResult.submittedAt)}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-6 rounded-2xl border border-cyan-100 bg-cyan-50 p-5 text-sm leading-6 text-cyan-950">
              Выберите режим с таймером или без него. Ответы сохраняются во
              время решения, поэтому к незавершённой попытке можно вернуться.
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <StartVariantButton
              variantId={variant.id}
              restart={Boolean(latestResult && !activeAttempt)}
              resume={Boolean(activeAttempt)}
              label={
                activeAttempt
                  ? "Продолжить решение"
                  : latestResult
                    ? "Решить ещё раз"
                    : "Начать вариант"
              }
            />
            {latestResult ? (
              <Link
                href={`/student/variants/${variant.id}/results/${latestResult.id}`}
                className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-700"
              >
                Разбор ошибок
              </Link>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
