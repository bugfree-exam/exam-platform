import Link from "next/link";

import { getAnswerTypeLabel } from "@/lib/answer";
import { prisma } from "@/lib/prisma";

export default async function TeacherTasksPage() {
  const tasks = await prisma.task.findMany({
    where: {
      isArchived: false,
    },
    orderBy: [{ egeNumber: "asc" }, { createdAt: "desc" }],
  });

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex items-start justify-between gap-4">
          <div>
            <Link
              href="/teacher"
              className="text-sm font-medium text-cyan-700 hover:text-cyan-900"
            >
              ← Кабинет учителя
            </Link>
            <h1 className="mt-3 text-3xl font-bold text-slate-950">
              База заданий
            </h1>
            <p className="mt-2 text-slate-600">
              Здесь хранятся задачи ЕГЭ, из которых потом будем собирать
              домашние задания.
            </p>
          </div>

          <Link
            href="/teacher/tasks/create"
            className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            + Создать задачу
          </Link>
        </header>

        {tasks.length === 0 ? (
          <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <h2 className="text-xl font-bold text-slate-950">
              В базе пока нет задач
            </h2>
            <p className="mt-2 text-slate-600">
              Создай первую задачу и проверь, что правильный ответ сохраняется.
            </p>
            <Link
              href="/teacher/tasks/create"
              className="mt-5 inline-flex rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Создать первую задачу
            </Link>
          </section>
        ) : (
          <section className="grid gap-4">
            {tasks.map((task) => (
              <Link
                key={task.id}
                href={`/teacher/tasks/${task.id}`}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">
                        №{task.egeNumber}
                      </span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                        {getAnswerTypeLabel(task.answerType)}
                      </span>
                      {task.difficulty ? (
                        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                          Сложность {task.difficulty}/5
                        </span>
                      ) : null}
                      {task.skillTag ? (
                        <span className="rounded-full bg-violet-50 px-2 py-1 text-xs font-medium text-violet-700">
                          {task.skillTag}
                        </span>
                      ) : null}
                    </div>

                    <h2 className="mt-3 text-lg font-bold text-slate-950">
                      {task.title}
                    </h2>
                  </div>

                  <div className="text-sm text-slate-400">
                    {new Intl.DateTimeFormat("ru-RU").format(task.createdAt)}
                  </div>
                </div>
              </Link>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
