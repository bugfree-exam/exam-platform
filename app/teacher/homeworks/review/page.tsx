import Link from "next/link";

import { prisma } from "@/lib/prisma";

function getAttemptBadgeClass(percent: number) {
  if (percent >= 80) {
    return "bg-emerald-50 text-emerald-700";
  }

  if (percent >= 50) {
    return "bg-amber-50 text-amber-700";
  }

  return "bg-red-50 text-red-700";
}

function getStudentStatusLabel({
  hasAttempt,
  percent,
}: {
  hasAttempt: boolean;
  percent?: number;
}) {
  if (!hasAttempt) {
    return "Не сдал";
  }

  if (typeof percent === "number" && percent === 100) {
    return "Без ошибок";
  }

  if (typeof percent === "number" && percent >= 80) {
    return "Хорошо";
  }

  if (typeof percent === "number" && percent >= 50) {
    return "Есть ошибки";
  }

  return "Нужно внимание";
}

function getStudentStatusClass({
  hasAttempt,
  percent,
}: {
  hasAttempt: boolean;
  percent?: number;
}) {
  if (!hasAttempt) {
    return "bg-amber-50 text-amber-700";
  }

  if (typeof percent === "number" && percent === 100) {
    return "bg-emerald-50 text-emerald-700";
  }

  if (typeof percent === "number" && percent >= 80) {
    return "bg-cyan-50 text-cyan-700";
  }

  if (typeof percent === "number" && percent >= 50) {
    return "bg-amber-50 text-amber-700";
  }

  return "bg-red-50 text-red-700";
}

export default async function TeacherHomeworksReviewPage() {
  const homeworks = await prisma.homework.findMany({
    where: {
      status: {
        not: "ARCHIVED",
      },
    },
    include: {
      tasks: {
        orderBy: {
          order: "asc",
        },
        include: {
          task: {
            select: {
              id: true,
              egeNumber: true,
              title: true,
            },
          },
        },
      },
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
        orderBy: {
          assignedAt: "asc",
        },
      },
      attempts: {
        where: {
          status: "SUBMITTED",
        },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          answers: {
            include: {
              task: {
                select: {
                  id: true,
                  egeNumber: true,
                  title: true,
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
    orderBy: {
      createdAt: "desc",
    },
  });

  const totalHomeworks = homeworks.length;
  const totalAssignments = homeworks.reduce(
    (sum, homework) => sum + homework.assignments.length,
    0
  );

  let submittedCount = 0;
  let unsubmittedCount = 0;
  let needsAttentionCount = 0;

  const attentionItems: {
    homeworkId: string;
    homeworkTitle: string;
    studentId: string;
    studentName: string;
    reason: string;
    percent?: number;
  }[] = [];

  for (const homework of homeworks) {
    const latestAttemptByStudent = new Map<string, (typeof homework.attempts)[number]>();

    for (const attempt of homework.attempts) {
      if (!latestAttemptByStudent.has(attempt.studentId)) {
        latestAttemptByStudent.set(attempt.studentId, attempt);
      }
    }

    for (const assignment of homework.assignments) {
      const latestAttempt = latestAttemptByStudent.get(assignment.studentId);

      if (!latestAttempt) {
        unsubmittedCount += 1;
        needsAttentionCount += 1;

        attentionItems.push({
          homeworkId: homework.id,
          homeworkTitle: homework.title,
          studentId: assignment.studentId,
          studentName: assignment.student.name,
          reason: "Не сдал ДЗ",
        });

        continue;
      }

      submittedCount += 1;

      if (latestAttempt.percent < 70) {
        needsAttentionCount += 1;

        attentionItems.push({
          homeworkId: homework.id,
          homeworkTitle: homework.title,
          studentId: assignment.studentId,
          studentName: assignment.student.name,
          reason: "Низкий результат",
          percent: latestAttempt.percent,
        });
      }
    }
  }

  const completionPercent =
    totalAssignments === 0
      ? 0
      : Math.round((submittedCount / totalAssignments) * 100);

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8">
          <Link
            href="/teacher"
            className="text-sm font-medium text-cyan-700 hover:text-cyan-900"
          >
            ← Кабинет учителя
          </Link>

          <h1 className="mt-3 text-3xl font-bold text-slate-950">
            Контроль выполнения ДЗ
          </h1>

          <p className="mt-2 text-slate-600">
            Быстрый обзор: кто сдал, кто не сдал и где нужны разборы ошибок.
          </p>
        </header>

        <section className="mb-6 grid gap-4 md:grid-cols-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-medium text-slate-500">Домашек</div>
            <div className="mt-2 text-3xl font-bold text-slate-950">
              {totalHomeworks}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-medium text-slate-500">Выдач</div>
            <div className="mt-2 text-3xl font-bold text-slate-950">
              {totalAssignments}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-medium text-slate-500">Сдано</div>
            <div className="mt-2 text-3xl font-bold text-emerald-700">
              {submittedCount}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-medium text-slate-500">Не сдано</div>
            <div className="mt-2 text-3xl font-bold text-amber-700">
              {unsubmittedCount}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-medium text-slate-500">
              Выполнение
            </div>
            <div className="mt-2 text-3xl font-bold text-slate-950">
              {completionPercent}%
            </div>
          </div>
        </section>

        {attentionItems.length > 0 ? (
          <section className="mb-6 rounded-3xl border border-red-100 bg-red-50 p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-red-950">
                  Требуют внимания
                </h2>
                <p className="mt-2 text-sm leading-6 text-red-800">
                  Здесь ученики, которые не сдали ДЗ или получили низкий
                  результат. Это первый список для ручной проверки.
                </p>
              </div>

              <div className="rounded-2xl bg-white px-5 py-3 text-center text-red-800 shadow-sm">
                <div className="text-2xl font-bold">
                  {needsAttentionCount}
                </div>
                <div className="text-xs font-medium">ситуаций</div>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {attentionItems.slice(0, 12).map((item) => (
                <Link
                  key={`${item.homeworkId}-${item.studentId}-${item.reason}`}
                  href={`/teacher/homeworks/${item.homeworkId}`}
                  className="rounded-2xl bg-white p-4 shadow-sm transition hover:bg-red-100/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-bold text-slate-950">
                        {item.studentName}
                      </div>
                      <div className="mt-1 text-sm text-slate-600">
                        {item.homeworkTitle}
                      </div>
                    </div>

                    <div className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                      {item.percent !== undefined
                        ? `${item.percent}%`
                        : item.reason}
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {attentionItems.length > 12 ? (
              <p className="mt-4 text-sm text-red-800">
                Показаны первые 12 ситуаций. Остальные можно посмотреть в
                карточках ДЗ ниже.
              </p>
            ) : null}
          </section>
        ) : (
          <section className="mb-6 rounded-3xl border border-emerald-100 bg-emerald-50 p-6">
            <h2 className="text-xl font-bold text-emerald-950">
              Критичных проблем нет
            </h2>
            <p className="mt-2 text-sm leading-6 text-emerald-800">
              Сейчас нет учеников с несданными ДЗ или результатом ниже 70%.
            </p>
          </section>
        )}

        <section className="grid gap-5">
          {homeworks.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <h2 className="text-xl font-bold text-slate-950">
                ДЗ пока нет
              </h2>
              <p className="mt-2 text-slate-600">
                Создай первое домашнее задание, и контроль появится здесь.
              </p>
            </div>
          ) : (
            homeworks.map((homework) => {
              const latestAttemptByStudent = new Map<string, (typeof homework.attempts)[number]>();

              for (const attempt of homework.attempts) {
                if (!latestAttemptByStudent.has(attempt.studentId)) {
                  latestAttemptByStudent.set(attempt.studentId, attempt);
                }
              }

              const assignedCount = homework.assignments.length;
              const homeworkSubmittedCount = Array.from(
                latestAttemptByStudent.keys()
              ).filter((studentId) =>
                homework.assignments.some(
                  (assignment) => assignment.studentId === studentId
                )
              ).length;

              const homeworkCompletionPercent =
                assignedCount === 0
                  ? 0
                  : Math.round((homeworkSubmittedCount / assignedCount) * 100);

              return (
                <article
                  key={homework.id}
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
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
                          Сдали {homeworkSubmittedCount}/{assignedCount}
                        </span>
                      </div>

                      <Link
                        href={`/teacher/homeworks/${homework.id}`}
                        className="mt-3 block text-xl font-bold text-slate-950 hover:text-cyan-800"
                      >
                        {homework.title}
                      </Link>

                      {homework.description ? (
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {homework.description}
                        </p>
                      ) : null}
                    </div>

                    <div className="rounded-2xl bg-slate-950 px-5 py-3 text-center text-white">
                      <div className="text-2xl font-bold">
                        {homeworkCompletionPercent}%
                      </div>
                      <div className="text-xs text-slate-300">сдали</div>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3">
                    {homework.assignments.map((assignment) => {
                      const latestAttempt = latestAttemptByStudent.get(
                        assignment.studentId
                      );

                      const wrongAnswersCount =
                        latestAttempt?.answers.filter(
                          (answer) => !answer.isCorrect
                        ).length ?? 0;

                      const weakNumbers = latestAttempt
                        ? Array.from(
                            new Set(
                              latestAttempt.answers
                                .filter((answer) => !answer.isCorrect)
                                .map((answer) => answer.task.egeNumber)
                            )
                          ).sort((a, b) => a - b)
                        : [];

                      return (
                        <div
                          key={assignment.id}
                          className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                              <Link
                                href={`/teacher/students/${assignment.studentId}`}
                                className="font-bold text-slate-950 hover:text-cyan-800"
                              >
                                {assignment.student.name}
                              </Link>

                              <div className="mt-1 text-sm text-slate-500">
                                {assignment.student.email}
                              </div>

                              <div className="mt-2 flex flex-wrap gap-2">
                                <Link
                                  href={`/teacher/students/${assignment.studentId}/parent-report?period=30d`}
                                  className="rounded-xl border border-cyan-200 bg-white px-3 py-1.5 text-xs font-semibold text-cyan-700 transition hover:bg-cyan-50"
                                >
                                  Отчёт для родителей
                                </Link>
                              </div>
                            </div>

                            {latestAttempt ? (
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`rounded-full px-3 py-1 text-xs font-semibold ${getStudentStatusClass(
                                    {
                                      hasAttempt: true,
                                      percent: latestAttempt.percent,
                                    }
                                  )}`}
                                >
                                  {getStudentStatusLabel({
                                    hasAttempt: true,
                                    percent: latestAttempt.percent,
                                  })}
                                </span>

                                <span
                                  className={`rounded-full px-3 py-1 text-xs font-semibold ${getAttemptBadgeClass(
                                    latestAttempt.percent
                                  )}`}
                                >
                                  {latestAttempt.percent}%
                                </span>
                              </div>
                            ) : (
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${getStudentStatusClass(
                                  {
                                    hasAttempt: false,
                                  }
                                )}`}
                              >
                                Не сдал
                              </span>
                            )}
                          </div>

                          {latestAttempt ? (
                            <div className="mt-3 grid gap-3 md:grid-cols-3">
                              <div className="rounded-xl bg-white p-3 text-sm">
                                <div className="font-semibold text-slate-500">
                                  Результат
                                </div>
                                <div className="mt-1 font-bold text-slate-950">
                                  {latestAttempt.score}/{latestAttempt.maxScore}
                                </div>
                              </div>

                              <div className="rounded-xl bg-white p-3 text-sm">
                                <div className="font-semibold text-slate-500">
                                  Ошибок
                                </div>
                                <div className="mt-1 font-bold text-slate-950">
                                  {wrongAnswersCount}
                                </div>
                              </div>

                              <div className="rounded-xl bg-white p-3 text-sm">
                                <div className="font-semibold text-slate-500">
                                  Повторить
                                </div>
                                <div className="mt-1 font-bold text-slate-950">
                                  {weakNumbers.length > 0
                                    ? weakNumbers
                                        .map((number) => `№${number}`)
                                        .join(", ")
                                    : "Ошибок нет"}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="mt-3 rounded-xl bg-white p-3 text-sm text-slate-500">
                              Ученик ещё не отправлял решение.
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </article>
              );
            })
          )}
        </section>
      </div>
    </main>
  );
}
