import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { HomeworkSolveForm } from "@/components/student/HomeworkSolveForm";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type StudentHomeworkPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function StudentHomeworkPage({
  params,
}: StudentHomeworkPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const { id } = await params;

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
    }));

  const previousAttempt = homework.attempts[0] ?? null;

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8">
          <Link
            href="/student/homeworks"
            className="text-sm font-medium text-cyan-700 hover:text-cyan-900"
          >
            ← Мои домашние задания
          </Link>

          <h1 className="mt-3 text-3xl font-bold text-slate-950">
            {homework.title}
          </h1>

          {homework.description ? (
            <p className="mt-2 text-slate-600">{homework.description}</p>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">
              {tasks.length} задач
            </span>

            {previousAttempt ? (
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                Последний результат: {previousAttempt.percent}%
              </span>
            ) : (
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                Ещё не выполнено
              </span>
            )}
          </div>
        </header>

        {tasks.length === 0 ? (
          <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <h2 className="text-xl font-bold text-slate-950">
              В этом ДЗ нет активных задач
            </h2>
            <p className="mt-2 text-slate-600">
              Возможно, преподаватель удалил задачи из базы.
            </p>
          </section>
        ) : (
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
        )}
      </div>
    </main>
  );
}