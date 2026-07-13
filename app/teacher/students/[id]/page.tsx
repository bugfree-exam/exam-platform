import Link from "next/link";
import { notFound } from "next/navigation";

import { formatAnswerForDisplay } from "@/lib/answer";
import { prisma } from "@/lib/prisma";

type TeacherStudentPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function getResultBadgeClass(percent: number) {
  if (percent >= 80) {
    return "bg-emerald-50 text-emerald-700";
  }

  if (percent >= 50) {
    return "bg-amber-50 text-amber-700";
  }

  return "bg-red-50 text-red-700";
}

export default async function TeacherStudentPage({
  params,
}: TeacherStudentPageProps) {
  const { id } = await params;

  const student = await prisma.user.findFirst({
    where: {
      id,
      role: "STUDENT",
    },
    include: {
      assignedHomeworks: {
        include: {
          homework: {
            include: {
              tasks: true,
            },
          },
        },
        orderBy: {
          assignedAt: "desc",
        },
      },
      attempts: {
        where: {
          status: "SUBMITTED",
        },
        include: {
          homework: {
            select: {
              id: true,
              title: true,
            },
          },
          answers: {
            include: {
              task: {
                select: {
                  id: true,
                  egeNumber: true,
                  title: true,
                  correctAnswer: true,
                },
              },
            },
          },
        },
        orderBy: {
          submittedAt: "desc",
        },
      },
    },
  });

  if (!student) {
    notFound();
  }

  const attemptsCount = student.attempts.length;

  const averagePercent =
    attemptsCount === 0
      ? 0
      : Math.round(
          student.attempts.reduce((sum, attempt) => sum + attempt.percent, 0) /
            attemptsCount
        );

  const latestAttemptByHomework = new Map<
    string,
    (typeof student.attempts)[number]
  >();

  for (const attempt of student.attempts) {
    if (!latestAttemptByHomework.has(attempt.homeworkId)) {
      latestAttemptByHomework.set(attempt.homeworkId, attempt);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Link
                href="/teacher/students"
                className="text-sm font-medium text-cyan-700 hover:text-cyan-900"
              >
                ← Ученики
              </Link>

              <h1 className="mt-3 text-3xl font-bold text-slate-950">
                {student.name}
              </h1>

              <p className="mt-2 text-slate-600">{student.email}</p>
            </div>

            <Link
              href={`/teacher/students/${student.id}/parent-report`}
              className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Отчёт для родителей
            </Link>
          </div>
        </header>

        <section className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-medium text-slate-500">Выдано ДЗ</div>
            <div className="mt-2 text-3xl font-bold text-slate-950">
              {student.assignedHomeworks.length}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-medium text-slate-500">Попыток</div>
            <div className="mt-2 text-3xl font-bold text-slate-950">
              {attemptsCount}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-medium text-slate-500">
              Средний результат
            </div>
            <div className="mt-2 text-3xl font-bold text-slate-950">
              {averagePercent}%
            </div>
          </div>
        </section>

        <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-950">
            Выданные домашние задания
          </h2>

          {student.assignedHomeworks.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              Этому ученику пока не выдавали ДЗ.
            </p>
          ) : (
            <div className="mt-4 grid gap-3">
              {student.assignedHomeworks.map((assignment) => {
                const latestAttempt = latestAttemptByHomework.get(
                  assignment.homeworkId
                );

                return (
                  <Link
                    key={assignment.id}
                    href={`/teacher/homeworks/${assignment.homeworkId}`}
                    className="rounded-2xl border border-slate-200 p-4 transition hover:bg-slate-50"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="font-bold text-slate-950">
                          {assignment.homework.title}
                        </div>

                        <div className="mt-1 text-sm text-slate-500">
                          {assignment.homework.tasks.length} задач · выдано{" "}
                          {new Intl.DateTimeFormat("ru-RU").format(
                            assignment.assignedAt
                          )}
                        </div>
                      </div>

                      {latestAttempt ? (
                        <div
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${getResultBadgeClass(
                            latestAttempt.percent
                          )}`}
                        >
                          {latestAttempt.percent}%
                        </div>
                      ) : (
                        <div className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                          Не сдал
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-950">История попыток</h2>

          {student.attempts.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              У ученика пока нет отправленных решений.
            </p>
          ) : (
            <div className="mt-4 space-y-4">
              {student.attempts.map((attempt) => (
                <div
                  key={attempt.id}
                  className="rounded-2xl border border-slate-200 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <Link
                        href={`/teacher/homeworks/${attempt.homeworkId}`}
                        className="font-bold text-slate-950 hover:text-cyan-800"
                      >
                        {attempt.homework.title}
                      </Link>

                      <div className="mt-1 text-sm text-slate-500">
                        {attempt.submittedAt
                          ? new Intl.DateTimeFormat("ru-RU", {
                              dateStyle: "short",
                              timeStyle: "short",
                            }).format(attempt.submittedAt)
                          : "Дата сдачи не указана"}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-slate-950 px-5 py-3 text-center text-white">
                      <div className="text-2xl font-bold">
                        {attempt.percent}%
                      </div>
                      <div className="text-xs text-slate-300">
                        {attempt.score}/{attempt.maxScore}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2">
                    {attempt.answers.map((answer) => (
                      <div
                        key={answer.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm"
                      >
                        <div>
                          <div className="font-semibold text-slate-800">
                            №{answer.task.egeNumber}. {answer.task.title}
                          </div>

                          <div className="mt-1 text-slate-500">
                            Ответ ученика:{" "}
                            <span className="font-mono text-slate-800">
                              {formatAnswerForDisplay(answer.rawAnswer)}
                            </span>
                          </div>

                          <div className="mt-1 text-slate-500">
                            Правильный ответ:{" "}
                            <span className="font-mono text-slate-800">
                              {formatAnswerForDisplay(answer.task.correctAnswer)}
                            </span>
                          </div>
                        </div>

                        <div
                          className={
                            answer.isCorrect
                              ? "rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
                              : "rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700"
                          }
                        >
                          {answer.isCorrect ? "Верно" : "Ошибка"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}