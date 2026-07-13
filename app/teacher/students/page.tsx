import Link from "next/link";

import { prisma } from "@/lib/prisma";

export default async function TeacherStudentsPage() {
  const students = await prisma.user.findMany({
    where: {
      role: "STUDENT",
    },
    include: {
      assignedHomeworks: true,
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
              Ученики
            </h1>

            <p className="mt-2 text-slate-600">
              Список учеников, доступы и краткая статистика.
            </p>
          </div>

          <Link
            href="/teacher/students/create"
            className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            + Добавить ученика
          </Link>
        </header>

        {students.length === 0 ? (
          <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <h2 className="text-xl font-bold text-slate-950">
              Учеников пока нет
            </h2>
            <p className="mt-2 text-slate-600">
              Создай первого ученика и выдай ему доступ к платформе.
            </p>

            <Link
              href="/teacher/students/create"
              className="mt-5 inline-flex rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Добавить ученика
            </Link>
          </section>
        ) : (
          <section className="grid gap-4 md:grid-cols-2">
            {students.map((student) => {
              const attemptsCount = student.attempts.length;
              const averagePercent =
                attemptsCount === 0
                  ? 0
                  : Math.round(
                      student.attempts.reduce(
                        (sum, attempt) => sum + attempt.percent,
                        0
                      ) / attemptsCount
                    );

              return (
                <Link
                  key={student.id}
                  href={`/teacher/students/${student.id}`}
                  className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-slate-950">
                        {student.name}
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        {student.email}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-950 px-4 py-3 text-center text-white">
                      <div className="text-xl font-bold">
                        {averagePercent}%
                      </div>
                      <div className="text-xs text-slate-300">средний</div>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">
                      ДЗ: {student.assignedHomeworks.length}
                    </span>

                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                      Попыток: {attemptsCount}
                    </span>

                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                      Создан{" "}
                      {new Intl.DateTimeFormat("ru-RU").format(
                        student.createdAt
                      )}
                    </span>
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