import Link from "next/link";

import { StartVariantButton } from "@/components/variants/StartVariantButton";
import { requireStudentPage } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function formatDate(value: Date | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(value);
}

export default async function StudentVariantsPage() {
  const user = await requireStudentPage();
  const variants = await prisma.examVariant.findMany({
    where: {
      status: "PUBLISHED",
    },
    include: {
      _count: {
        select: { tasks: true },
      },
      attempts: {
        where: {
          studentId: user.id,
        },
        orderBy: {
          startedAt: "desc",
        },
        select: {
          id: true,
          status: true,
          score: true,
          maxScore: true,
          percent: true,
          submittedAt: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const availableVariants = variants.filter(
    (variant) => variant._count.tasks === 27
  );

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

      <div className="relative mx-auto max-w-6xl">
        <nav className="flex items-center justify-between gap-4 rounded-2xl border border-white/80 bg-white/85 px-4 py-3 shadow-sm backdrop-blur">
          <Link href="/student" className="text-sm font-bold text-slate-700">
            ← В кабинет
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/student/variants/progress"
              className="rounded-xl bg-cyan-50 px-4 py-2 text-sm font-bold text-cyan-700"
            >
              Прогресс по вариантам
            </Link>
            <Link
              href="/student/results"
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700"
            >
              Все результаты
            </Link>
          </div>
        </nav>

        <header className="mt-5 overflow-hidden rounded-[2rem] bg-slate-950 p-7 text-white shadow-xl sm:p-9">
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-cyan-300">
            exam.mode
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] sm:text-5xl">
            Решать варианты
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
            Полноценная работа из 27 заданий с добровольным таймером и интерфейсом,
            приближённым к экзаменационной станции.
          </p>
        </header>

        {availableVariants.length === 0 ? (
          <section className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-10 text-center shadow-sm">
            <h2 className="text-2xl font-black">
              Опубликованных вариантов пока нет
            </h2>
            <p className="mt-3 text-sm text-slate-500">
              Они появятся здесь после публикации учителем.
            </p>
          </section>
        ) : (
          <section className="mt-6 grid gap-4 lg:grid-cols-2">
            {availableVariants.map((variant) => {
              const activeAttempt = variant.attempts.find(
                (attempt) => attempt.status === "IN_PROGRESS"
              );
              const latestResult = variant.attempts.find(
                (attempt) => attempt.status === "SUBMITTED"
              );

              return (
                <article
                  key={variant.id}
                  className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-bold text-cyan-700">
                        27 заданий · {variant.durationMinutes} минут
                      </span>
                      <h2 className="mt-4 text-2xl font-black tracking-tight">
                        {variant.title}
                      </h2>
                      {variant.description ? (
                        <p className="mt-2 text-sm leading-6 text-slate-500">
                          {variant.description}
                        </p>
                      ) : null}
                    </div>
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-slate-950 font-mono font-black text-cyan-300">
                      27
                    </span>
                  </div>

                  {latestResult ? (
                    <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                      <div className="flex items-end justify-between gap-4">
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
                            {latestResult.percent}%
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {formatDate(latestResult.submittedAt)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-5 flex flex-wrap items-center gap-3">
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
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}
