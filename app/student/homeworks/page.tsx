import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function StudentHomeworksPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const assignments = await prisma.homeworkAssignment.findMany({
    where: {
      studentId: user.id,
    },
    include: {
      homework: {
        include: {
          tasks: true,
          attempts: {
            where: {
              studentId: user.id,
              status: "SUBMITTED",
            },
            orderBy: {
              submittedAt: "desc",
            },
            take: 1,
          },
        },
      },
    },
    orderBy: {
      assignedAt: "desc",
    },
  });

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <Link
            href="/student"
            className="text-sm font-medium text-cyan-700 hover:text-cyan-900"
          >
            ← Кабинет ученика
          </Link>
          <h1 className="mt-3 text-3xl font-bold text-slate-950">
            Мои домашние задания
          </h1>
          <p className="mt-2 text-slate-600">
            Здесь отображаются задания, которые выдал преподаватель.
          </p>
        </header>

        {assignments.length === 0 ? (
          <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <h2 className="text-xl font-bold text-slate-950">
              Пока нет выданных ДЗ
            </h2>
            <p className="mt-2 text-slate-600">
              Когда преподаватель выдаст домашнее задание, оно появится здесь.
            </p>
          </section>
        ) : (
          <section className="grid gap-4">
            {assignments.map((assignment) => {
              const homework = assignment.homework;
              const latestAttempt = homework.attempts[0];

              return (
                <Link
                  key={assignment.id}
                  href={`/student/homeworks/${homework.id}`}
                  className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">
                          {homework.tasks.length} задач
                        </span>

                        {latestAttempt ? (
                          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                            Выполнено на {latestAttempt.percent}%
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                            Не выполнено
                          </span>
                        )}
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
                      Выдано{" "}
                      {new Intl.DateTimeFormat("ru-RU").format(
                        assignment.assignedAt
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