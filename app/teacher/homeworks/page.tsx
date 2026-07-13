import Link from "next/link";

import { prisma } from "@/lib/prisma";

export default async function TeacherHomeworksPage() {
  const homeworks = await prisma.homework.findMany({
    include: {
      tasks: true,
      assignments: {
        include: {
          student: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      attempts: {
        where: {
          status: "SUBMITTED",
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
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
              Домашние задания
            </h1>

            <p className="mt-2 text-slate-600">
              Создание, выдача и просмотр выполнения домашних заданий.
            </p>
          </div>

          <Link
            href="/teacher/homeworks/create"
            className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            + Создать ДЗ
          </Link>
        </header>

        {homeworks.length === 0 ? (
          <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <h2 className="text-xl font-bold text-slate-950">
              Домашних заданий пока нет
            </h2>
            <p className="mt-2 text-slate-600">
              Создай первое ДЗ из базы заданий и выдай его ученику.
            </p>

            <Link
              href="/teacher/homeworks/create"
              className="mt-5 inline-flex rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Создать ДЗ
            </Link>
          </section>
        ) : (
          <section className="grid gap-4">
            {homeworks.map((homework) => {
              const assignedCount = homework.assignments.length;
              const submittedStudentIds = new Set(
                homework.attempts.map((attempt) => attempt.studentId)
              );
              const submittedCount = submittedStudentIds.size;

              return (
                <Link
                  key={homework.id}
                  href={`/teacher/homeworks/${homework.id}`}
                  className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">
                          {homework.tasks.length} задач
                        </span>

                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                          {assignedCount} учеников
                        </span>

                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                          Сдали {submittedCount}/{assignedCount}
                        </span>
                      </div>

                      <h2 className="mt-3 text-xl font-bold text-slate-950">
                        {homework.title}
                      </h2>

                      {homework.description ? (
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {homework.description}
                        </p>
                      ) : null}
                    </div>

                    <div className="text-sm text-slate-400">
                      {new Intl.DateTimeFormat("ru-RU").format(
                        homework.createdAt
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}