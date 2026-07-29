import Link from "next/link";

import { VariantStatusButton } from "@/components/variants/VariantStatusButton";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const statusLabels = {
  DRAFT: "Черновик",
  PUBLISHED: "Опубликован",
  ARCHIVED: "Архив",
} as const;

export default async function TeacherVariantsPage() {
  const variants = await prisma.examVariant.findMany({
    include: {
      _count: {
        select: {
          tasks: true,
          attempts: {
            where: { status: "SUBMITTED" },
          },
        },
      },
      attempts: {
        where: { status: "SUBMITTED" },
        select: { percent: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="min-h-screen bg-[#f4f7f8] px-4 py-6 text-slate-950 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <nav className="flex items-center justify-between gap-4">
          <Link href="/teacher" className="text-sm font-bold text-slate-600">
            ← В кабинет
          </Link>
          <Link
            href="/teacher/variants/create"
            className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-cyan-700"
          >
            + Создать вариант
          </Link>
        </nav>

        <header className="mt-5 rounded-[2rem] bg-slate-950 p-7 text-white shadow-xl sm:p-9">
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-cyan-300">
            exam.variants
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] sm:text-5xl">
            Варианты ЕГЭ
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">
            Формируйте пробные работы и отслеживайте каждую попытку учеников.
          </p>
        </header>

        {variants.length === 0 ? (
          <section className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-10 text-center shadow-sm">
            <h2 className="text-2xl font-black">Вариантов пока нет</h2>
            <p className="mt-3 text-sm text-slate-500">
              Создайте первый вариант из заданий вашей базы.
            </p>
            <Link
              href="/teacher/variants/create"
              className="mt-6 inline-flex rounded-xl bg-cyan-600 px-5 py-3 text-sm font-black text-white"
            >
              Собрать вариант
            </Link>
          </section>
        ) : (
          <section className="mt-6 grid gap-4 lg:grid-cols-2">
            {variants.map((variant) => {
              const average =
                variant.attempts.length === 0
                  ? 0
                  : Math.round(
                      variant.attempts.reduce(
                        (sum, attempt) => sum + attempt.percent,
                        0
                      ) / variant.attempts.length
                    );

              return (
                <article
                  key={variant.id}
                  className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                        {statusLabels[variant.status]}
                      </span>
                      <h2 className="mt-4 text-2xl font-black tracking-tight">
                        {variant.title}
                      </h2>
                    </div>
                    <span className="rounded-xl bg-cyan-50 px-3 py-2 font-mono text-xs font-black text-cyan-700">
                      {variant._count.tasks}/27
                    </span>
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-3">
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <div className="text-xs text-slate-500">Попыток</div>
                      <div className="mt-1 text-xl font-black">
                        {variant._count.attempts}
                      </div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <div className="text-xs text-slate-500">Средний</div>
                      <div className="mt-1 text-xl font-black">{average}%</div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <div className="text-xs text-slate-500">Время</div>
                      <div className="mt-1 text-xl font-black">
                        {variant.durationMinutes}м
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link
                      href={`/teacher/variants/${variant.id}`}
                      className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white"
                    >
                      Открыть результаты
                    </Link>
                    <VariantStatusButton
                      variantId={variant.id}
                      status={variant.status}
                    />
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
