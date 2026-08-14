import Link from "next/link";
import { notFound } from "next/navigation";

import { ArchiveHomeworkButton } from "@/components/homeworks/ArchiveHomeworkButton";
import { TaskAnswerReviewButton } from "@/components/teacher/TaskAnswerReviewButton";
import { formatAnswerForDisplay } from "@/lib/answer";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type TeacherHomeworkPageProps = {
  params: Promise<{ id: string }>;
};

function formatDate(value: Date | null) {
  if (!value) return "Без дедлайна";
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    dateStyle: "short",
    timeStyle: "short",
  }).format(value);
}

export default async function TeacherHomeworkPage({ params }: TeacherHomeworkPageProps) {
  const { id } = await params;

  const homework = await prisma.homework.findUnique({
    where: { id },
    include: {
      tasks: {
        orderBy: { order: "asc" },
        include: {
          task: {
            select: {
              id: true,
              isArchived: true,
            },
          },
          taskRevision: {
            select: {
              egeNumber: true,
              title: true,
              statementHtml: true,
              answerType: true,
              correctAnswer: true,
            },
          },
        },
      },
      assignments: {
        include: {
          student: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { assignedAt: "asc" },
      },
      attempts: {
        where: { status: "SUBMITTED" },
        include: {
          student: {
            select: { id: true, name: true, email: true },
          },
          answers: {
            include: {
              taskRevision: {
                select: {
                  id: true,
                  egeNumber: true,
                  title: true,
                  statementHtml: true,
                  correctAnswer: true,
                },
              },
            },
          },
        },
        orderBy: { submittedAt: "desc" },
      },
    },
  });

  if (!homework) notFound();

  const latestAttemptByStudent = new Map<string, (typeof homework.attempts)[number]>();
  for (const attempt of homework.attempts) {
    if (!latestAttemptByStudent.has(attempt.studentId)) {
      latestAttemptByStudent.set(attempt.studentId, attempt);
    }
  }

  const submittedCount = homework.assignments.filter((assignment) =>
    latestAttemptByStudent.has(assignment.studentId)
  ).length;
  const assignedCount = homework.assignments.length;
  // Серверная динамическая страница намеренно проверяет текущее время запроса.
  // eslint-disable-next-line react-hooks/purity
  const deadlinePassed = Boolean(homework.deadline && homework.deadline.getTime() < Date.now());

  return (
    <main className="min-h-screen bg-[#f3f7fa] px-4 py-6 text-[#102638] sm:px-6 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-[28px] bg-[#092535] p-6 text-white shadow-xl sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="min-w-0">
              <Link href="/teacher/homeworks" className="text-sm font-bold text-cyan-300">
                ← Домашние задания
              </Link>
              <div className="mt-5 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300">
                homework.review
              </div>
              <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl">
                {homework.title}
              </h1>
              {homework.description ? (
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
                  {homework.description}
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href={`/teacher/homeworks/${homework.id}/edit`}
                className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/15"
              >
                Редактировать
              </Link>
              <ArchiveHomeworkButton homeworkId={homework.id} currentStatus={homework.status} />
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
              <div className="text-xs text-slate-400">Состав</div>
              <div className="mt-1 text-2xl font-black">{homework.tasks.length} задач</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
              <div className="text-xs text-slate-400">Ученики</div>
              <div className="mt-1 text-2xl font-black">{assignedCount}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
              <div className="text-xs text-slate-400">Сдали</div>
              <div className="mt-1 text-2xl font-black text-emerald-300">
                {submittedCount}/{assignedCount}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
              <div className="text-xs text-slate-400">Дедлайн</div>
              <div className={`mt-1 text-sm font-bold ${deadlinePassed ? "text-rose-300" : "text-white"}`}>
                {formatDate(homework.deadline)}{homework.deadline ? " МСК" : ""}
              </div>
            </div>
          </div>
        </header>

        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[330px_minmax(0,1fr)]">
          <aside className="rounded-[26px] border border-white bg-white p-5 shadow-sm lg:sticky lg:top-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-700">
                  homework.tasks
                </div>
                <h2 className="mt-1 text-xl font-black">Состав ДЗ</h2>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                {homework.tasks.length}
              </span>
            </div>

            <div className="mt-4 space-y-2">
              {homework.tasks.map((homeworkTask, index) => (
                <details key={homeworkTask.id} className="group rounded-2xl border border-slate-200 bg-slate-50">
                  <summary className="cursor-pointer list-none p-3 [&::-webkit-details-marker]:hidden">
                    <div className="flex items-start gap-3">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white font-mono text-xs font-black text-cyan-700 shadow-sm">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-cyan-700">ЕГЭ №{homeworkTask.taskRevision.egeNumber}</div>
                        <div className="mt-1 line-clamp-2 text-sm font-bold text-slate-900">
                          {homeworkTask.taskRevision.title}
                        </div>
                      </div>
                      <span className="text-slate-400 transition group-open:rotate-180">⌄</span>
                    </div>
                  </summary>
                  <div className="border-t border-slate-200 px-3 py-3 text-xs leading-5 text-slate-500">
                    <div>
                      Правильный ответ: <span className="font-mono font-bold text-slate-800">{formatAnswerForDisplay(homeworkTask.taskRevision.correctAnswer)}</span>
                    </div>
                    {homeworkTask.task.isArchived ? (
                      <div className="mt-2 font-bold text-rose-700">Задача удалена из активной базы</div>
                    ) : null}
                  </div>
                </details>
              ))}
            </div>
          </aside>

          <section className="rounded-[26px] border border-white bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-700">
                  students.progress
                </div>
                <h2 className="mt-1 text-2xl font-black">Ученики и результаты</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Решения скрыты по умолчанию. Раскрой нужного ученика и нажми на задание для полного условия.
                </p>
              </div>
              <div className="flex gap-2 text-xs font-bold">
                <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-emerald-800">Сдали {submittedCount}</span>
                <span className="rounded-full bg-amber-100 px-3 py-1.5 text-amber-800">Ждём {Math.max(assignedCount - submittedCount, 0)}</span>
              </div>
            </div>

            {homework.assignments.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
                Ученики пока не назначены.
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {homework.assignments.map((assignment) => {
                  const attempt = latestAttemptByStudent.get(assignment.studentId);

                  return (
                    <details key={assignment.id} className="group overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 open:bg-white">
                      <summary className="cursor-pointer list-none px-4 py-4 [&::-webkit-details-marker]:hidden sm:px-5">
                        <div className="flex items-center gap-4">
                          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#092535] text-sm font-black text-cyan-300">
                            {assignment.student.name.trim().charAt(0).toUpperCase() || "У"}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-black text-slate-950">{assignment.student.name}</div>
                            <div className="mt-0.5 truncate text-xs text-slate-400">{assignment.student.email}</div>
                          </div>

                          {attempt ? (
                            <div className="text-right">
                              <div className={`text-xl font-black ${attempt.percent >= 70 ? "text-emerald-700" : "text-rose-700"}`}>
                                {Math.round(attempt.percent)}%
                              </div>
                              <div className="text-xs text-slate-400">{attempt.score}/{attempt.maxScore} баллов</div>
                            </div>
                          ) : (
                            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                              {deadlinePassed ? "Не сдал" : "Ожидается"}
                            </span>
                          )}

                          <span className="hidden text-slate-400 transition group-open:rotate-180 sm:block">⌄</span>
                        </div>
                      </summary>

                      <div className="border-t border-slate-200 px-4 py-4 sm:px-5">
                        {attempt ? (
                          <>
                            <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                              <span>
                                Последняя сдача: {attempt.submittedAt ? `${formatDate(attempt.submittedAt)} МСК` : "дата не указана"}
                              </span>
                              <Link href={`/teacher/students/${assignment.student.id}`} className="font-bold text-cyan-700 hover:text-cyan-900">
                                Карточка ученика →
                              </Link>
                            </div>

                            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                              {attempt.answers.map((answer) => (
                                <div
                                  key={answer.id}
                                  className={`rounded-xl border p-3 ${answer.isCorrect ? "border-emerald-200 bg-emerald-50/70" : "border-rose-200 bg-rose-50/70"}`}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <TaskAnswerReviewButton
                                      egeNumber={answer.taskRevision.egeNumber}
                                      title={answer.taskRevision.title}
                                      statementHtml={answer.taskRevision.statementHtml}
                                      studentAnswer={formatAnswerForDisplay(answer.rawAnswer)}
                                      correctAnswer={formatAnswerForDisplay(answer.taskRevision.correctAnswer)}
                                      isCorrect={answer.isCorrect}
                                    />
                                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ${answer.isCorrect ? "bg-emerald-200 text-emerald-800" : "bg-rose-200 text-rose-800"}`}>
                                      {answer.isCorrect ? "✓" : "✕"}
                                    </span>
                                  </div>
                                  <div className="mt-2 truncate font-mono text-xs text-slate-600">
                                    Ответ: {formatAnswerForDisplay(answer.rawAnswer)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </>
                        ) : (
                          <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
                            Ученик ещё не отправлял решение этого ДЗ.
                          </div>
                        )}
                      </div>
                    </details>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
