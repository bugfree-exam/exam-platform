import Link from "next/link";
import { notFound } from "next/navigation";

import { VariantStatusButton } from "@/components/variants/VariantStatusButton";
import { primaryToEgeTestScore } from "@/lib/egeScore";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type VariantPageProps = {
  params: Promise<{ id: string }>;
};

function formatDate(value: Date | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

export default async function TeacherVariantPage({
  params,
}: VariantPageProps) {
  const { id } = await params;
  const variant = await prisma.examVariant.findUnique({
    where: { id },
    include: {
      tasks: {
        orderBy: { order: "asc" },
        include: {
          task: {
            select: {
              id: true,
              egeNumber: true,
              title: true,
              difficulty: true,
            },
          },
        },
      },
      attempts: {
        where: { status: "SUBMITTED" },
        orderBy: { submittedAt: "desc" },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          answers: {
            select: {
              isCorrect: true,
            },
          },
        },
      },
    },
  });

  if (!variant) {
    notFound();
  }

  const averagePercent =
    variant.attempts.length === 0
      ? 0
      : Math.round(
          variant.attempts.reduce(
            (sum, attempt) => sum + attempt.percent,
            0
          ) / variant.attempts.length
        );

  return (
    <main className="min-h-screen bg-[#f4f7f8] px-4 py-6 text-slate-950 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <nav className="flex items-center justify-between gap-4">
          <Link
            href="/teacher/variants"
            className="text-sm font-bold text-slate-600"
          >
            ← Все варианты
          </Link>
          <VariantStatusButton
            variantId={variant.id}
            status={variant.status}
          />
        </nav>

        <header className="mt-5 rounded-[2rem] bg-slate-950 p-7 text-white shadow-xl sm:p-9">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-cyan-300">
                variant.{variant.status.toLowerCase()}
              </div>
              <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] sm:text-5xl">
                {variant.title}
              </h1>
              {variant.description ? (
                <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">
                  {variant.description}
                </p>
              ) : null}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                <div className="text-xs text-slate-400">Заданий</div>
                <div className="mt-1 text-2xl font-black">
                  {variant.tasks.length}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                <div className="text-xs text-slate-400">Попыток</div>
                <div className="mt-1 text-2xl font-black">
                  {variant.attempts.length}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                <div className="text-xs text-slate-400">Средний</div>
                <div className="mt-1 text-2xl font-black text-cyan-300">
                  {averagePercent}%
                </div>
              </div>
            </div>
          </div>
        </header>

        <section className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-700">
              student.attempts
            </div>
            <h2 className="mt-2 text-2xl font-black tracking-tight">
              Попытки учеников
            </h2>
          </div>

          {variant.attempts.length === 0 ? (
            <div className="mt-6 rounded-2xl bg-slate-50 p-6 text-sm text-slate-500">
              Отправленных решений пока нет.
            </div>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead className="text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="pb-3 font-bold">Ученик</th>
                    <th className="pb-3 font-bold">Дата</th>
                    <th className="pb-3 font-bold">Верно</th>
                    <th className="pb-3 font-bold">Баллы</th>
                    <th className="pb-3 font-bold">Тестовый балл</th>
                    <th className="pb-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {variant.attempts.map((attempt) => {
                    const correct = attempt.answers.filter(
                      (answer) => answer.isCorrect
                    ).length;

                    return (
                      <tr key={attempt.id}>
                        <td className="py-4">
                          <div className="font-bold text-slate-900">
                            {attempt.student.name}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {attempt.student.email}
                          </div>
                        </td>
                        <td className="py-4 text-sm text-slate-600">
                          {formatDate(attempt.submittedAt)}
                        </td>
                        <td className="py-4 font-black">
                          {correct}/{attempt.answers.length}
                        </td>
                        <td className="py-4 font-black">
                          {attempt.score}/{attempt.maxScore}
                        </td>
                        <td className="py-4">
                          <span className="rounded-full bg-cyan-50 px-3 py-1 text-sm font-black text-cyan-700">
                            {primaryToEgeTestScore(attempt.score)}/100
                          </span>
                        </td>
                        <td className="py-4 text-right">
                          <Link
                            href={`/teacher/variants/attempts/${attempt.id}`}
                            className="text-sm font-black text-cyan-700 hover:text-cyan-900"
                          >
                            Все ответы →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-2xl font-black tracking-tight">
            Состав варианта
          </h2>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {variant.tasks.map((variantTask) => (
              <Link
                key={variantTask.id}
                href={`/teacher/tasks/${variantTask.task.id}`}
                className="flex items-center gap-4 rounded-2xl border border-slate-200 p-4 transition hover:border-cyan-300 hover:bg-cyan-50/40"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-950 font-mono font-black text-cyan-300">
                  {variantTask.order}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-bold">
                    {variantTask.task.title}
                  </span>
                  <span className="mt-1 block text-xs text-slate-500">
                    №{variantTask.task.egeNumber} ЕГЭ
                    {variantTask.task.difficulty
                      ? ` · сложность ${variantTask.task.difficulty}/5`
                      : ""}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
