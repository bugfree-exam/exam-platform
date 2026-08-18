import Link from "next/link";

import { PythonCodeBlock } from "@/components/code/PythonCodeBlock";
import { requireStudentPage } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const statusMeta = {
  PRIVATE: { label: "Только для меня", className: "bg-slate-100 text-slate-700" },
  PENDING_REVIEW: { label: "На проверке", className: "bg-amber-100 text-amber-800" },
  PUBLISHED: { label: "Опубликовано", className: "bg-emerald-100 text-emerald-800" },
  REJECTED: { label: "Нужно доработать", className: "bg-rose-100 text-rose-800" },
} as const;

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    dateStyle: "long",
    timeStyle: "short",
  }).format(value);
}

export default async function StudentSolutionsPage() {
  const user = await requireStudentPage();
  const solutions = await prisma.studentTaskSolution.findMany({
    where: { studentId: user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      task: { select: { id: true, egeNumber: true, title: true } },
      taskRevision: { select: { version: true } },
    },
  });

  return (
    <main className="min-h-screen bg-[#f3f7fa] px-4 py-6 text-[#102638] sm:px-6 sm:py-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/student" className="text-sm font-bold text-cyan-700">
            ← В кабинет
          </Link>
          <Link
            href="/student/trainer"
            className="rounded-xl border border-cyan-200 bg-white px-4 py-2.5 text-sm font-bold text-cyan-800"
          >
            Открыть тренажёр
          </Link>
        </div>

        <header className="mt-5 overflow-hidden rounded-[32px] bg-[#092535] p-7 text-white shadow-xl sm:p-10">
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-cyan-300">
            personal.solution.history
          </div>
          <h1 className="mt-3 text-3xl font-black sm:text-5xl">Мои решения</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
            Личная библиотека кода по уже решённым задачам. Здесь можно быстро найти нужный алгоритм, сравнить версии и вернуться к заданию.
          </p>
          <div className="mt-6 inline-flex rounded-2xl bg-white/10 px-4 py-3 text-sm font-black">
            Сохранено решений: {solutions.length}
          </div>
        </header>

        {solutions.length ? (
          <section className="mt-6 grid gap-5 lg:grid-cols-2">
            {solutions.map((solution) => {
              const status = statusMeta[solution.publicationStatus];
              return (
                <article
                  key={solution.id}
                  className="flex flex-col rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-black text-cyan-800">
                          №{solution.task.egeNumber} ЕГЭ
                        </span>
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${status.className}`}>
                          {status.label}
                        </span>
                      </div>
                      <h2 className="mt-3 text-xl font-black">{solution.task.title}</h2>
                      <p className="mt-1 text-xs text-slate-400">
                        Версия задания {solution.taskRevision.version} · обновлено {formatDate(solution.updatedAt)}
                      </p>
                    </div>
                  </div>

                  <PythonCodeBlock code={solution.code} className="mt-5" />

                  <div className="mt-5 flex flex-wrap gap-2">
                    <Link
                      href={`/student/trainer/${solution.task.egeNumber}?task=${solution.taskId}`}
                      className="rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white"
                    >
                      Открыть задачу и изменить код →
                    </Link>
                  </div>
                </article>
              );
            })}
          </section>
        ) : (
          <section className="mt-6 rounded-[28px] border border-dashed border-slate-300 bg-white p-10 text-center">
            <h2 className="text-2xl font-black">Личная библиотека пока пуста</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-500">
              После проверки ответа откройте блок «Моё решение на Python» и сохраните код, которым решали задачу.
            </p>
            <Link
              href="/student/trainer"
              className="mt-5 inline-flex rounded-xl bg-cyan-700 px-5 py-3 text-sm font-black text-white"
            >
              Перейти к заданиям
            </Link>
          </section>
        )}
      </div>
    </main>
  );
}
