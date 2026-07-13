import Link from "next/link";

import { formatAnswerForDisplay } from "@/lib/answer";
import { prisma } from "@/lib/prisma";

function getResultBadgeClass(percent: number) {
  if (percent >= 80) {
    return "bg-emerald-50 text-emerald-700";
  }

  if (percent >= 50) {
    return "bg-amber-50 text-amber-700";
  }

  return "bg-red-50 text-red-700";
}

export default async function TeacherResultsPage() {
  const attempts = await prisma.attempt.findMany({
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
  });

  const totalAttempts = attempts.length;
  const averagePercent =
    totalAttempts === 0
      ? 0
      : Math.round(
          attempts.reduce((sum, attempt) => sum + attempt.percent, 0) /
            totalAttempts
        );

  const totalAnswers = attempts.reduce(
    (sum, attempt) => sum + attempt.answers.length,
    0
  );

  const totalCorrectAnswers = attempts.reduce(
    (sum, attempt) =>
      sum + attempt.answers.filter((answer) => answer.isCorrect).length,
    0
  );

  const taskNumberStats = new Map<
    number,
    {
      total: number;
      correct: number;
    }
  >();

  for (const attempt of attempts) {
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

  const weakestTaskNumbers = Array.from(taskNumberStats.entries())
    .map(([egeNumber, stat]) => ({
      egeNumber,
      total: stat.total,
      correct: stat.correct,
      percent: Math.round((stat.correct / stat.total) * 100),
    }))
    .sort((a, b) => a.percent - b.percent)
    .slice(0, 6);

  const latestAttemptByStudent = new Map<string, (typeof attempts)[number]>();

  for (const attempt of attempts) {
    if (!latestAttemptByStudent.has(attempt.studentId)) {
      latestAttemptByStudent.set(attempt.studentId, attempt);
    }
  }

  const latestStudentAttempts = Array.from(latestAttemptByStudent.values());

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
            Результаты учеников
          </h1>

          <p className="mt-2 text-slate-600">
            Общий обзор выполненных домашних заданий, попыток и ошибок.
          </p>
        </header>

        <section className="mb-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-medium text-slate-500">Попыток</div>
            <div className="mt-2 text-3xl font-bold text-slate-950">
              {totalAttempts}
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

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-medium text-slate-500">
              Верных ответов
            </div>
            <div className="mt-2 text-3xl font-bold text-slate-950">
              {totalCorrectAnswers}/{totalAnswers}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-medium text-slate-500">
              Учеников сдавали
            </div>
            <div className="mt-2 text-3xl font-bold text-slate-950">
              {latestStudentAttempts.length}
            </div>
          </div>
        </section>

        <section className="mb-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-950">
              Слабые номера ЕГЭ
            </h2>

            {weakestTaskNumbers.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">
                Пока нет данных для анализа.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {weakestTaskNumbers.map((item) => (
                  <div
                    key={item.egeNumber}
                    className="rounded-2xl bg-slate-50 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-bold text-slate-950">
                          №{item.egeNumber} ЕГЭ
                        </div>
                        <div className="mt-1 text-sm text-slate-500">
                          Верно {item.correct} из {item.total}
                        </div>
                      </div>

                      <div
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${getResultBadgeClass(
                          item.percent
                        )}`}
                      >
                        {item.percent}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-950">
              Последняя сдача по ученикам
            </h2>

            {latestStudentAttempts.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">
                Пока никто не сдавал домашние задания.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {latestStudentAttempts.map((attempt) => (
                  <Link
                    key={attempt.id}
                    href={`/teacher/homeworks/${attempt.homeworkId}`}
                    className="block rounded-2xl border border-slate-200 p-4 transition hover:bg-slate-50"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="font-bold text-slate-950">
                          {attempt.student.name}
                        </div>
                        <div className="mt-1 text-sm text-slate-500">
                          {attempt.homework.title}
                        </div>
                      </div>

                      <div
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${getResultBadgeClass(
                          attempt.percent
                        )}`}
                      >
                        {attempt.percent}%
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-950">Все попытки</h2>

          {attempts.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
              Пока нет отправленных домашних заданий.
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {attempts.map((attempt) => (
                <div
                  key={attempt.id}
                  className="rounded-2xl border border-slate-200 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="font-bold text-slate-950">
                        {attempt.student.name}
                      </div>

                      <Link
                        href={`/teacher/homeworks/${attempt.homeworkId}`}
                        className="mt-1 block text-sm font-medium text-cyan-700 hover:text-cyan-900"
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