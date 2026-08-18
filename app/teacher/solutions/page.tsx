import Link from "next/link";

import { PythonCodeBlock } from "@/components/code/PythonCodeBlock";
import { SolutionModerationActions } from "@/components/teacher/SolutionModerationActions";
import { requireTeacherPage } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const statusMeta = {
  PRIVATE: { label: "Личное", className: "bg-slate-100 text-slate-700", priority: 3 },
  PENDING_REVIEW: { label: "Ждёт проверки", className: "bg-amber-100 text-amber-800", priority: 0 },
  PUBLISHED: { label: "Опубликовано", className: "bg-emerald-100 text-emerald-800", priority: 1 },
  REJECTED: { label: "Отклонено", className: "bg-rose-100 text-rose-800", priority: 2 },
} as const;

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    dateStyle: "long",
    timeStyle: "short",
  }).format(value);
}

export default async function TeacherSolutionsPage() {
  await requireTeacherPage();
  const solutions = await prisma.studentTaskSolution.findMany({
    orderBy: { updatedAt: "desc" },
    take: 200,
    include: {
      student: { select: { id: true, name: true, email: true } },
      task: { select: { id: true, egeNumber: true, title: true } },
      taskRevision: { select: { version: true } },
    },
  });
  solutions.sort((left, right) => {
    const priority =
      statusMeta[left.publicationStatus].priority -
      statusMeta[right.publicationStatus].priority;
    return priority || right.updatedAt.getTime() - left.updatedAt.getTime();
  });
  const pendingCount = solutions.filter(
    (solution) => solution.publicationStatus === "PENDING_REVIEW"
  ).length;
  const publishedCount = solutions.filter(
    (solution) => solution.publicationStatus === "PUBLISHED"
  ).length;

  return (
    <main className="min-h-screen bg-[#f4f7f8] px-4 py-6 text-slate-950 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <Link href="/teacher" className="text-sm font-bold text-cyan-700">
          ← В кабинет учителя
        </Link>

        <header className="mt-5 rounded-[32px] bg-slate-950 p-7 text-white shadow-xl sm:p-10">
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-cyan-300">
            student.solutions.review
          </div>
          <h1 className="mt-3 text-3xl font-black sm:text-5xl">Решения учеников</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
            Личные решения видны преподавателю для обратной связи. Публичными становятся только проверенные работы, авторы которых дали разрешение.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 text-sm font-black">
            <span className="rounded-xl bg-amber-300 px-4 py-3 text-amber-950">На проверке: {pendingCount}</span>
            <span className="rounded-xl bg-white/10 px-4 py-3">Опубликовано: {publishedCount}</span>
            <span className="rounded-xl bg-white/10 px-4 py-3">Всего: {solutions.length}</span>
          </div>
        </header>

        {solutions.length ? (
          <section className="mt-6 space-y-5">
            {solutions.map((solution) => {
              const status = statusMeta[solution.publicationStatus];
              return (
                <article
                  key={solution.id}
                  className="grid gap-5 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.55fr)] sm:p-6"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-black ${status.className}`}>
                        {status.label}
                      </span>
                      <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-black text-cyan-800">
                        №{solution.task.egeNumber} ЕГЭ
                      </span>
                      <span className="text-xs text-slate-400">версия {solution.taskRevision.version}</span>
                    </div>
                    <h2 className="mt-3 text-xl font-black">{solution.task.title}</h2>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                      <Link href={`/teacher/students/${solution.student.id}`} className="font-bold text-cyan-800 hover:underline">
                        {solution.student.name}
                      </Link>
                      <span>{solution.student.email}</span>
                      <span>Обновлено {formatDate(solution.updatedAt)}</span>
                    </div>
                    <PythonCodeBlock code={solution.code} className="mt-5" />
                  </div>

                  <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <h3 className="font-black">Модерация</h3>
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      Проверьте корректность, читаемость и отсутствие персональных данных в комментариях к коду.
                    </p>
                    <div className="mt-5">
                      <SolutionModerationActions
                        solutionId={solution.id}
                        status={solution.publicationStatus}
                        allowPublication={solution.allowPublication}
                      />
                    </div>
                    <div className="mt-5 border-t border-slate-200 pt-4">
                      <Link
                        href={`/teacher/tasks/${solution.task.id}?version=${solution.taskRevision.version}`}
                        className="text-xs font-black text-cyan-800"
                      >
                        Открыть условие задачи →
                      </Link>
                    </div>
                  </aside>
                </article>
              );
            })}
          </section>
        ) : (
          <section className="mt-6 rounded-[28px] border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
            Ученики пока не сохраняли свои решения.
          </section>
        )}
      </div>
    </main>
  );
}
