import Link from "next/link";
import { notFound } from "next/navigation";
import { ArchiveHomeworkButton } from "@/components/homeworks/ArchiveHomeworkButton";

import { formatAnswerForDisplay } from "@/lib/answer";
import { prisma } from "@/lib/prisma";

type TeacherHomeworkPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function TeacherHomeworkPage({
  params,
}: TeacherHomeworkPageProps) {
  const { id } = await params;

  const homework = await prisma.homework.findUnique({
    where: {
      id,
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
              answerType: true,
              correctAnswer: true,
              isArchived: true,
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

  if (!homework) {
    notFound();
  }

  const latestAttemptByStudent = new Map<string, (typeof homework.attempts)[number]>();

  for (const attempt of homework.attempts) {
    if (!latestAttemptByStudent.has(attempt.studentId)) {
      latestAttemptByStudent.set(attempt.studentId, attempt);
    }
  }

  const submittedCount = latestAttemptByStudent.size;
  const assignedCount = homework.assignments.length;

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Link
                href="/teacher/homeworks"
                className="text-sm font-medium text-cyan-700 hover:text-cyan-900"
              >
                ← Домашние задания
              </Link>

              <h1 className="mt-3 text-3xl font-bold text-slate-950">
                {homework.title}
              </h1>

              {homework.description ? (
                <p className="mt-2 text-slate-600">{homework.description}</p>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href={`/teacher/homeworks/${homework.id}/edit`}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Редактировать
              </Link>

              <ArchiveHomeworkButton
                homeworkId={homework.id}
                currentStatus={homework.status}
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">
              {homework.tasks.length} задач
            </span>

            <span
              className={
                homework.status === "ARCHIVED"
                  ? "rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"
                  : "rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
              }
            >
              {homework.status === "ARCHIVED" ? "Архив" : "Активно"}
            </span>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              {assignedCount} учеников
            </span>

            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              Сдали {submittedCount}/{assignedCount}
            </span>

            {homework.deadline ? (
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                Дедлайн{" "}
                {new Intl.DateTimeFormat("ru-RU", {
                  dateStyle: "short",
                  timeStyle: "short",
                }).format(homework.deadline)}
              </span>
            ) : null}
          </div>
        </header>

        <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-950">Состав ДЗ</h2>

          <div className="mt-4 grid gap-3">
            {homework.tasks.map((homeworkTask, index) => (
              <div
                key={homeworkTask.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-cyan-700">
                    Задача {index + 1}
                  </span>

                  <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600">
                    №{homeworkTask.task.egeNumber}
                  </span>

                  {homeworkTask.task.isArchived ? (
                    <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                      Удалена из базы
                    </span>
                  ) : null}
                </div>

                <div className="mt-2 font-semibold text-slate-950">
                  {homeworkTask.task.title}
                </div>

                <div className="mt-2 text-sm text-slate-500">
                  Правильный ответ:{" "}
                  <span className="font-mono text-slate-800">
                    {formatAnswerForDisplay(homeworkTask.task.correctAnswer)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-950">
            Выполнение учениками
          </h2>

          <div className="mt-4 grid gap-4">
            {homework.assignments.map((assignment) => {
              const attempt = latestAttemptByStudent.get(assignment.studentId);

              return (
                <div
                  key={assignment.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="font-bold text-slate-950">
                        {assignment.student.name}
                      </div>
                      <div className="mt-1 text-sm text-slate-500">
                        {assignment.student.email}
                      </div>
                    </div>

                    {attempt ? (
                      <div className="rounded-2xl bg-slate-950 px-5 py-3 text-center text-white">
                        <div className="text-2xl font-bold">
                          {attempt.percent}%
                        </div>
                        <div className="text-xs text-slate-300">
                          {attempt.score}/{attempt.maxScore}
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                        Не сдал
                      </div>
                    )}
                  </div>

                  {attempt ? (
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
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}