import Link from "next/link";
import { notFound } from "next/navigation";

import { HomeworkSolveForm } from "@/components/student/HomeworkSolveForm";
import { requireStudentPage } from "@/lib/access";
import { prisma } from "@/lib/prisma";

type StudentHomeworkPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function getTaskWord(value: number) {
  const lastTwo = value % 100;
  const last = value % 10;

  if (lastTwo >= 11 && lastTwo <= 14) return "заданий";
  if (last === 1) return "задание";
  if (last >= 2 && last <= 4) return "задания";

  return "заданий";
}

function getResultStyle(percent: number) {
  if (percent >= 80) {
    return {
      label: "Уверенный результат",
      badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
      bar: "bg-emerald-500",
      dot: "bg-emerald-400",
    };
  }

  if (percent >= 50) {
    return {
      label: "Хорошая база",
      badge: "border-amber-200 bg-amber-50 text-amber-700",
      bar: "bg-amber-500",
      dot: "bg-amber-400",
    };
  }

  return {
    label: "Нужен разбор",
    badge: "border-rose-200 bg-rose-50 text-rose-700",
    bar: "bg-rose-500",
    dot: "bg-rose-400",
  };
}

function formatSubmittedDate(value: Date | null) {
  if (!value) return "Дата отправки не указана";

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

export default async function StudentHomeworkPage({
  params,
}: StudentHomeworkPageProps) {
  const { id } = await params;
  const user = await requireStudentPage();

  const homework = await prisma.homework.findFirst({
    where: {
      id,
      assignments: {
        some: {
          studentId: user.id,
        },
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
              statementHtml: true,
              answerType: true,
              difficulty: true,
              isArchived: true,
              attachments: {
                select: {
                  id: true,
                  originalName: true,
                  extension: true,
                  sizeBytes: true,
                },
                orderBy: {
                  createdAt: "asc",
                },
              },
            },
          },
        },
      },
      attempts: {
        where: {
          studentId: user.id,
          status: "SUBMITTED",
        },
        orderBy: {
          submittedAt: "desc",
        },
        take: 1,
        include: {
          answers: {
            include: {
              task: {
                select: {
                  id: true,
                  egeNumber: true,
                  title: true,
                  answerType: true,
                  correctAnswer: true,
                  explanationHtml: true,
                },
              },
            },
            orderBy: {
              task: {
                egeNumber: "asc",
              },
            },
          },
        },
      },
    },
  });

  if (!homework) {
    notFound();
  }

  const tasks = homework.tasks
    .filter((homeworkTask) => !homeworkTask.task.isArchived)
    .map((homeworkTask) => ({
      id: homeworkTask.task.id,
      egeNumber: homeworkTask.task.egeNumber,
      title: homeworkTask.task.title,
      statementHtml: homeworkTask.task.statementHtml,
      answerType: homeworkTask.task.answerType,
      difficulty: homeworkTask.task.difficulty,
      attachments: homeworkTask.task.attachments,
    }));

  const previousAttempt = homework.attempts[0] ?? null;
  const isArchived = homework.status === "ARCHIVED";

  const egeNumbers = Array.from(
    new Set(tasks.map((task) => task.egeNumber))
  ).sort((a, b) => a - b);

  const correctAnswers =
    previousAttempt?.answers.filter((answer) => answer.isCorrect).length ?? 0;

  const incorrectAnswers =
    previousAttempt?.answers.length !== undefined
      ? previousAttempt.answers.length - correctAnswers
      : 0;

  const resultStyle = previousAttempt
    ? getResultStyle(previousAttempt.percent)
    : null;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f4f7f8] px-4 py-5 text-slate-950 sm:px-6 sm:py-8">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.32]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(15,23,42,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.045) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="pointer-events-none absolute -left-32 top-24 h-80 w-80 rounded-full bg-cyan-300/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 top-[42rem] h-96 w-96 rounded-full bg-violet-300/15 blur-3xl" />

      <div className="relative mx-auto max-w-7xl">
        <nav className="mb-5 flex items-center justify-between gap-4 rounded-2xl border border-white/80 bg-white/80 px-4 py-3 shadow-sm backdrop-blur sm:px-5">
          <Link
            href="/student"
            className="group flex min-w-0 items-center gap-3"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-950 font-mono text-sm font-bold text-cyan-300">
              &lt;/&gt;
            </span>

            <span className="min-w-0">
              <span className="block truncate text-sm font-bold text-slate-950">
                Экзамен без багов
              </span>
              <span className="block truncate font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">
                student.workspace
              </span>
            </span>
          </Link>

          <Link
            href="/student/homeworks"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-cyan-300 hover:text-cyan-800"
          >
            <span aria-hidden="true">←</span>
            <span className="hidden sm:inline">К списку ДЗ</span>
            <span className="sm:hidden">Назад</span>
          </Link>
        </nav>

        {isArchived ? (
          <section className="mb-5 flex flex-col gap-4 rounded-2xl border border-slate-300 bg-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-800 text-sm text-white">
                ↳
              </span>

              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.17em] text-slate-500">
                  archived.homework
                </div>
                <p className="mt-1 text-sm leading-6 text-slate-700">
                  Преподаватель убрал эту работу из активных. История решения и
                  полученный результат сохранены.
                </p>
              </div>
            </div>

            <span className="w-fit rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-bold text-slate-600">
              Архив
            </span>
          </section>
        ) : null}

        <header className="relative overflow-hidden rounded-[2rem] bg-slate-950 px-5 py-7 text-white shadow-xl shadow-slate-950/10 sm:px-8 sm:py-9 lg:px-10">
          <div
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
          />

          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-1/3 h-40 w-40 rounded-full bg-violet-500/20 blur-3xl" />

          <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-cyan-200">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      previousAttempt ? resultStyle?.dot : "bg-amber-400"
                    }`}
                  />
                  homework.session
                </span>

                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-slate-300">
                  {tasks.length} {getTaskWord(tasks.length)}
                </span>

                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-slate-300">
                  {previousAttempt ? "submitted" : "ready"}
                </span>
              </div>

              <h1 className="mt-5 max-w-4xl text-3xl font-black tracking-[-0.04em] sm:text-4xl lg:text-5xl">
                {homework.title}
              </h1>

              {homework.description ? (
                <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-300 sm:text-base">
                  {homework.description}
                </p>
              ) : (
                <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-400 sm:text-base">
                  Решай задания последовательно, внимательно проверяй введённые
                  ответы и отправляй работу, когда всё будет готово.
                </p>
              )}

              {egeNumbers.length > 0 ? (
                <div className="mt-6 flex flex-wrap items-center gap-2">
                  <span className="mr-1 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">
                    Номера ЕГЭ:
                  </span>

                  {egeNumbers.map((egeNumber) => (
                    <span
                      key={egeNumber}
                      className="grid h-8 min-w-8 place-items-center rounded-lg border border-white/10 bg-white/[0.06] px-2 font-mono text-xs font-bold text-slate-200"
                    >
                      {egeNumber}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            {previousAttempt ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">
                      Последний результат
                    </div>

                    <div className="mt-3 text-5xl font-black tracking-[-0.06em] text-white">
                      {previousAttempt.percent}
                      <span className="ml-1 text-2xl text-cyan-300">%</span>
                    </div>
                  </div>

                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-bold ${resultStyle?.badge}`}
                  >
                    {resultStyle?.label}
                  </span>
                </div>

                <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className={`h-full rounded-full ${resultStyle?.bar}`}
                    style={{
                      width: `${Math.min(previousAttempt.percent, 100)}%`,
                    }}
                  />
                </div>

                <div className="mt-4 flex items-end justify-between gap-4">
                  <div>
                    <div className="text-lg font-black text-white">
                      {previousAttempt.score}/{previousAttempt.maxScore}
                    </div>
                    <div className="text-xs text-slate-500">баллов</div>
                  </div>

                  <div className="text-right text-xs leading-5 text-slate-400">
                    {formatSubmittedDate(previousAttempt.submittedAt)}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur">
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">
                  Статус работы
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-400/15 text-xl text-amber-300">
                    →
                  </span>

                  <div>
                    <div className="text-xl font-black text-white">
                      Можно приступать
                    </div>
                    <div className="mt-1 text-sm text-slate-400">
                      Попыток пока нет
                    </div>
                  </div>
                </div>

                <p className="mt-5 text-sm leading-6 text-slate-400">
                  После отправки здесь появятся процент, баллы и подробный
                  разбор каждого ответа.
                </p>
              </div>
            )}
          </div>
        </header>

        {previousAttempt ? (
          <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="font-mono text-[10px] uppercase tracking-[0.17em] text-slate-400">
                Результат
              </div>
              <div className="mt-3 text-3xl font-black text-slate-950">
                {previousAttempt.percent}%
              </div>
              <p className="mt-2 text-sm text-slate-500">
                Последняя отправленная попытка
              </p>
            </article>

            <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="font-mono text-[10px] uppercase tracking-[0.17em] text-slate-400">
                Верных ответов
              </div>
              <div className="mt-3 text-3xl font-black text-emerald-700">
                {correctAnswers}
              </div>
              <p className="mt-2 text-sm text-slate-500">
                Из {previousAttempt.answers.length} проверенных
              </p>
            </article>

            <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="font-mono text-[10px] uppercase tracking-[0.17em] text-slate-400">
                Ошибок
              </div>
              <div className="mt-3 text-3xl font-black text-rose-700">
                {incorrectAnswers}
              </div>
              <p className="mt-2 text-sm text-slate-500">
                Их можно разобрать ниже
              </p>
            </article>

            <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="font-mono text-[10px] uppercase tracking-[0.17em] text-slate-400">
                Баллы
              </div>
              <div className="mt-3 text-3xl font-black text-slate-950">
                {previousAttempt.score}/{previousAttempt.maxScore}
              </div>
              <p className="mt-2 text-sm text-slate-500">
                За текущий набор заданий
              </p>
            </article>
          </section>
        ) : null}

        {tasks.length === 0 ? (
          <section className="mt-6 overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
            <div className="mx-auto max-w-xl text-center">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-slate-950 font-mono text-xl text-cyan-300">
                —
              </div>

              <div className="mt-5 font-mono text-[11px] uppercase tracking-[0.18em] text-cyan-700">
                tasks.empty
              </div>

              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                В этой работе нет активных заданий
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-600">
                Возможно, преподаватель удалил задания из базы или временно
                скрыл их.
              </p>

              <Link
                href="/student/homeworks"
                className="mt-6 inline-flex items-center justify-center rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-cyan-700"
              >
                Вернуться к списку ДЗ
              </Link>
            </div>
          </section>
        ) : (
          <section className="mt-6">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-700">
                  workspace.tasks
                </div>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                  {previousAttempt ? "Результат и разбор" : "Выполнение работы"}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                  {previousAttempt
                    ? "Ниже сохранены ответы последней попытки. При повторном решении следуй подсказкам внутри формы."
                    : "Ответы сохраняются внутри формы. Перед отправкой проверь, что заполнены все необходимые поля."}
                </p>
              </div>

              <div className="w-fit rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-500">
                {tasks.length} {getTaskWord(tasks.length)}
              </div>
            </div>

            <div
              className={[
                "rounded-[2rem] border border-slate-200 bg-white p-3 shadow-sm sm:p-5 lg:p-6",
                "[&_button]:rounded-xl",
                "[&_button]:font-bold",
                "[&_button]:transition",
                "[&_input]:rounded-xl",
                "[&_input]:border-slate-200",
                "[&_input]:bg-white",
                "[&_input]:shadow-sm",
                "[&_input:focus]:border-cyan-400",
                "[&_input:focus]:outline-none",
                "[&_input:focus]:ring-4",
                "[&_input:focus]:ring-cyan-100",
                "[&_textarea]:rounded-xl",
                "[&_textarea]:border-slate-200",
                "[&_textarea:focus]:border-cyan-400",
                "[&_textarea:focus]:outline-none",
                "[&_textarea:focus]:ring-4",
                "[&_textarea:focus]:ring-cyan-100",
                "[&_pre]:overflow-x-auto",
                "[&_pre]:rounded-2xl",
                "[&_pre]:bg-slate-950",
                "[&_pre]:p-4",
                "[&_pre]:text-slate-100",
                "[&_img]:max-w-full",
                "[&_img]:rounded-2xl",
                "[&_table]:w-full",
              ].join(" ")}
            >
              <HomeworkSolveForm
                homeworkId={homework.id}
                tasks={tasks}
                previousAttempt={
                  previousAttempt
                    ? {
                        id: previousAttempt.id,
                        score: previousAttempt.score,
                        maxScore: previousAttempt.maxScore,
                        percent: previousAttempt.percent,
                        submittedAt: previousAttempt.submittedAt,
                        answers: previousAttempt.answers.map((answer) => ({
                          taskId: answer.taskId,
                          task: {
                            id: answer.task.id,
                            egeNumber: answer.task.egeNumber,
                            title: answer.task.title,
                            answerType: answer.task.answerType,
                            correctAnswer: answer.task.correctAnswer,
                            explanationHtml: answer.task.explanationHtml,
                          },
                          rawAnswer: answer.rawAnswer,
                          normalizedAnswer: answer.normalizedAnswer,
                          isCorrect: answer.isCorrect,
                        })),
                      }
                    : null
                }
              />
            </div>
          </section>
        )}

        <footer className="mt-6 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/80 px-5 py-4 text-sm text-slate-500 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <span>
            Возник вопрос по условию? Сохрани номер задания и обратись к
            преподавателю.
          </span>

          <Link
            href="/student/results"
            className="shrink-0 font-bold text-cyan-700 transition hover:text-cyan-900"
          >
            Открыть мой прогресс →
          </Link>
        </footer>
      </div>
    </main>
  );
}