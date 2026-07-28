import Link from "next/link";
import { notFound } from "next/navigation";

import { StudentAccessCard } from "@/components/teacher/StudentAccessCard";
import { StudentAccountActions } from "@/components/teacher/StudentAccountActions";
import { formatAnswerForDisplay } from "@/lib/answer";
import { requireTeacherPage } from "@/lib/access";
import { prisma } from "@/lib/prisma";

type TeacherStudentPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function getResultStyle(percent: number) {
  if (percent >= 80) {
    return {
      label: "Уверенно",
      badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
      bar: "bg-emerald-500",
    };
  }

  if (percent >= 50) {
    return {
      label: "В процессе",
      badge: "border-amber-200 bg-amber-50 text-amber-700",
      bar: "bg-amber-500",
    };
  }

  return {
    label: "Нужна практика",
    badge: "border-rose-200 bg-rose-50 text-rose-700",
    bar: "bg-rose-500",
  };
}

function formatDateTime(value: Date | null) {
  if (!value) return "Пока не зафиксирована";

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function getRelativeActivity(value: Date | null) {
  if (!value) return "Ученик ещё не заходил после включения учёта";

  const diffMs = Date.now() - value.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60_000));

  if (diffMinutes < 1) return "Только что";
  if (diffMinutes < 60) return `${diffMinutes} мин. назад`;

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours < 24) return `${diffHours} ч. назад`;

  const diffDays = Math.floor(diffHours / 24);

  if (diffDays === 1) return "Вчера";
  if (diffDays < 30) return `${diffDays} дн. назад`;

  return formatDateTime(value);
}

export default async function TeacherStudentPage({
  params,
}: TeacherStudentPageProps) {
  await requireTeacherPage();

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

  const totalAnswers = student.attempts.reduce(
    (sum, attempt) => sum + attempt.answers.length,
    0
  );

  const totalCorrectAnswers = student.attempts.reduce(
    (sum, attempt) =>
      sum + attempt.answers.filter((answer) => answer.isCorrect).length,
    0
  );

  const accuracyPercent =
    totalAnswers === 0
      ? 0
      : Math.round((totalCorrectAnswers / totalAnswers) * 100);

  const latestAttemptByHomework = new Map<
    string,
    (typeof student.attempts)[number]
  >();

  for (const attempt of student.attempts) {
    if (!latestAttemptByHomework.has(attempt.homeworkId)) {
      latestAttemptByHomework.set(attempt.homeworkId, attempt);
    }
  }

  const taskNumberStats = new Map<
    number,
    {
      total: number;
      correct: number;
    }
  >();

  for (const attempt of student.attempts) {
    for (const answer of attempt.answers) {
      const current = taskNumberStats.get(answer.task.egeNumber) ?? {
        total: 0,
        correct: 0,
      };

      current.total += 1;

      if (answer.isCorrect) {
        current.correct += 1;
      }

      taskNumberStats.set(answer.task.egeNumber, current);
    }
  }

  const taskNumberResults = Array.from(taskNumberStats.entries())
    .map(([egeNumber, stat]) => ({
      egeNumber,
      total: stat.total,
      correct: stat.correct,
      incorrect: stat.total - stat.correct,
      percent: Math.round((stat.correct / stat.total) * 100),
    }))
    .sort((a, b) => a.egeNumber - b.egeNumber);

  const completedHomeworks = student.assignedHomeworks.filter((assignment) =>
    latestAttemptByHomework.has(assignment.homeworkId)
  ).length;

  const pendingHomeworks =
    student.assignedHomeworks.length - completedHomeworks;

  return (
    <main className="min-h-screen bg-slate-100/70 px-4 py-6 text-slate-950 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <Link
                href="/teacher/students"
                className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-cyan-700"
              >
                ← Все ученики
              </Link>

              <div className="mt-5 flex items-start gap-4">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-slate-900 text-xl font-bold text-white">
                  {student.name
                    .split(/\s+/)
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((part) => part[0]?.toUpperCase())
                    .join("") || "У"}
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">
                      Карточка ученика
                    </div>

                    <span
                      className={
                        student.studentStatus === "ARCHIVED"
                          ? "rounded-full border border-slate-300 bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600"
                          : student.studentStatus === "FROZEN"
                            ? "rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700"
                            : "rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700"
                      }
                    >
                      {student.studentStatus === "ARCHIVED"
                        ? "В архиве"
                        : student.studentStatus === "FROZEN"
                          ? "Заморожен"
                          : "Активен"}
                    </span>
                  </div>

                  <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
                    {student.name}
                  </h1>
                  <p className="mt-2 text-sm text-slate-500">
                    Последняя активность:{" "}
                    <span className="font-semibold text-slate-700">
                      {getRelativeActivity(student.lastActivityAt)}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            <Link
              href={`/teacher/students/${student.id}/parent-report`}
              className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Отчёт для родителей
            </Link>
          </div>
        </header>

        <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-medium text-slate-500">Выдано ДЗ</div>
            <div className="mt-2 text-3xl font-bold">{student.assignedHomeworks.length}</div>
            <div className="mt-2 text-xs text-slate-400">
              {pendingHomeworks} ожидают выполнения
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-medium text-slate-500">Попыток</div>
            <div className="mt-2 text-3xl font-bold">{attemptsCount}</div>
            <div className="mt-2 text-xs text-slate-400">
              {completedHomeworks} работ имеют результат
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-medium text-slate-500">
              Средний результат
            </div>
            <div className="mt-2 text-3xl font-bold">{averagePercent}%</div>
            <div className="mt-2 text-xs text-slate-400">
              По всем отправленным попыткам
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-medium text-slate-500">
              Точность ответов
            </div>
            <div className="mt-2 text-3xl font-bold">{accuracyPercent}%</div>
            <div className="mt-2 text-xs text-slate-400">
              {totalCorrectAnswers} из {totalAnswers} ответов верны
            </div>
          </article>
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[390px_minmax(0,1fr)]">
          <StudentAccessCard
            studentId={student.id}
            email={student.email}
            lastActivityLabel={formatDateTime(student.lastActivityAt)}
          />

          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-950">
                  Успешность по номерам ЕГЭ
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Небольшие блоки показывают накопленный результат по каждому номеру.
                </p>
              </div>

              <span className="text-xs font-medium text-slate-400">
                Учитываются все отправленные ответы
              </span>
            </div>

            {taskNumberResults.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
                Пока нет данных по заданиям.
              </div>
            ) : (
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {taskNumberResults.map((item) => {
                  const style = getResultStyle(item.percent);

                  return (
                    <div
                      key={item.egeNumber}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-xs font-medium text-slate-400">
                            Задание
                          </div>
                          <div className="mt-1 text-lg font-bold text-slate-950">
                            №{item.egeNumber}
                          </div>
                        </div>

                        <span
                          className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${style.badge}`}
                        >
                          {item.percent}%
                        </span>
                      </div>

                      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className={`h-full rounded-full ${style.bar}`}
                          style={{ width: `${item.percent}%` }}
                        />
                      </div>

                      <div className="mt-3 text-[11px] text-slate-500">
                        {item.correct} верно · {item.incorrect} ошибок
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </article>
        </section>

        <StudentAccountActions
          studentId={student.id}
          studentName={student.name}
          studentEmail={student.email}
          studentStatus={student.studentStatus}
          archivedAt={student.archivedAt?.toISOString() ?? null}
        />

        <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div>
            <h2 className="text-xl font-bold text-slate-950">
              Выданные домашние задания
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Последний результат по каждой работе.
            </p>
          </div>

          {student.assignedHomeworks.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
              Этому ученику пока не выдавали домашние задания.
            </div>
          ) : (
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {student.assignedHomeworks.map((assignment) => {
                const latestAttempt = latestAttemptByHomework.get(
                  assignment.homeworkId
                );
                const style = latestAttempt
                  ? getResultStyle(latestAttempt.percent)
                  : null;

                return (
                  <Link
                    key={assignment.id}
                    href={`/teacher/homeworks/${assignment.homeworkId}`}
                    className="rounded-2xl border border-slate-200 p-4 transition hover:border-cyan-200 hover:bg-slate-50"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="line-clamp-2 font-semibold text-slate-900">
                          {assignment.homework.title}
                        </div>
                        <div className="mt-2 text-xs leading-5 text-slate-500">
                          {assignment.homework.tasks.length} заданий · выдано{" "}
                          {new Intl.DateTimeFormat("ru-RU").format(
                            assignment.assignedAt
                          )}
                        </div>
                      </div>

                      {latestAttempt ? (
                        <span
                          className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${style?.badge}`}
                        >
                          {latestAttempt.percent}%
                        </span>
                      ) : (
                        <span className="shrink-0 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                          Не сдано
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div>
            <h2 className="text-xl font-bold text-slate-950">
              История решений и попыток
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Все попытки свернуты. Нажмите на нужную, чтобы посмотреть ответы.
            </p>
          </div>

          {student.attempts.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
              У ученика пока нет отправленных решений.
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {student.attempts.map((attempt, index) => {
                const correctCount = attempt.answers.filter(
                  (answer) => answer.isCorrect
                ).length;
                const errorCount = attempt.answers.length - correctCount;
                const style = getResultStyle(attempt.percent);

                return (
                  <details
                    key={attempt.id}
                    className="group overflow-hidden rounded-2xl border border-slate-200 bg-white open:border-cyan-200"
                  >
                    <summary className="cursor-pointer list-none p-4 [&::-webkit-details-marker]:hidden">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-sm font-bold text-slate-600">
                            {String(index + 1).padStart(2, "0")}
                          </div>

                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900">
                              {attempt.homework.title}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              {formatDateTime(attempt.submittedAt)} ·{" "}
                              {correctCount} верно · {errorCount} ошибок
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-3 sm:justify-end">
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-semibold ${style.badge}`}
                          >
                            {attempt.percent}% · {attempt.score}/{attempt.maxScore}
                          </span>

                          <span className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-400 transition group-open:rotate-180">
                            ↓
                          </span>
                        </div>
                      </div>
                    </summary>

                    <div className="border-t border-slate-200 bg-slate-50 p-4">
                      <div className="space-y-3">
                        {attempt.answers.map((answer) => (
                          <article
                            key={answer.id}
                            className={`rounded-2xl border p-4 ${
                              answer.isCorrect
                                ? "border-emerald-200 bg-emerald-50/60"
                                : "border-rose-200 bg-rose-50/60"
                            }`}
                          >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <div className="font-semibold text-slate-900">
                                  №{answer.task.egeNumber}. {answer.task.title}
                                </div>

                                <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
                                  <div className="rounded-xl bg-white/80 p-3">
                                    <div className="text-xs text-slate-400">
                                      Ответ ученика
                                    </div>
                                    <div className="mt-1 break-words font-mono font-semibold text-slate-800">
                                      {formatAnswerForDisplay(answer.rawAnswer)}
                                    </div>
                                  </div>

                                  <div className="rounded-xl bg-white/80 p-3">
                                    <div className="text-xs text-slate-400">
                                      Правильный ответ
                                    </div>
                                    <div className="mt-1 break-words font-mono font-semibold text-slate-800">
                                      {formatAnswerForDisplay(
                                        answer.task.correctAnswer
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <span
                                className={`w-fit shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                                  answer.isCorrect
                                    ? "bg-emerald-600 text-white"
                                    : "bg-rose-600 text-white"
                                }`}
                              >
                                {answer.isCorrect ? "Верно" : "Ошибка"}
                              </span>
                            </div>
                          </article>
                        ))}
                      </div>
                    </div>
                  </details>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}