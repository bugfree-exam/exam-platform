import Link from "next/link";
import { notFound } from "next/navigation";

import { TrainerTaskSolver } from "@/components/student/TrainerTaskSolver";
import { requireStudentPage } from "@/lib/access";
import { studyPlanSchema } from "@/lib/ai/planSchema";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type TrainerNumberPageProps = {
  params: Promise<{
    egeNumber: string;
  }>;
  searchParams: Promise<{
    task?: string;
    plan?: string;
    action?: string;
  }>;
};

function formatFileSize(sizeBytes: number) {
  if (sizeBytes < 1024) return `${sizeBytes} Б`;
  if (sizeBytes < 1024 * 1024) return `${Math.ceil(sizeBytes / 1024)} КБ`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} МБ`;
}

export default async function TrainerNumberPage({
  params,
  searchParams,
}: TrainerNumberPageProps) {
  const user = await requireStudentPage();
  const routeParams = await params;
  const query = await searchParams;
  const egeNumber = Number(routeParams.egeNumber);
  const requestedActionIndex = Number(query.action);

  if (
    !Number.isInteger(egeNumber) ||
    egeNumber < 1 ||
    egeNumber > 27
  ) {
    notFound();
  }

  const taskIds = await prisma.task.findMany({
    where: {
      egeNumber,
      isArchived: false,
    },
    select: {
      id: true,
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });

  if (taskIds.length === 0) {
    notFound();
  }

  const requestedTaskExists = taskIds.some((item) => item.id === query.task);
  const currentTaskId = requestedTaskExists ? query.task! : taskIds[0].id;
  const currentPosition =
    taskIds.findIndex((item) => item.id === currentTaskId) + 1;

  const [task, numberAttempts, linkedPlan] = await Promise.all([
    prisma.task.findUnique({
      where: {
        id: currentTaskId,
      },
      select: {
        id: true,
        egeNumber: true,
        title: true,
        statementHtml: true,
        answerType: true,
        difficulty: true,
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
    }),
    prisma.practiceAttempt.findMany({
      where: {
        studentId: user.id,
        task: {
          egeNumber,
        },
      },
      select: {
        isCorrect: true,
      },
    }),
    query.plan && Number.isInteger(requestedActionIndex) && requestedActionIndex >= 0
      ? prisma.studentStudyPlan.findFirst({
          where: {
            id: query.plan,
            studentId: user.id,
            status: "CONFIRMED",
          },
          select: {
            id: true,
            title: true,
            durationDays: true,
            topics: true,
            actions: true,
            practiceAttempts: {
              where: { studyPlanActionIndex: requestedActionIndex },
              select: { id: true },
            },
          },
        })
      : null,
  ]);

  if (!task) {
    notFound();
  }

  const validatedLinkedPlan = linkedPlan
    ? studyPlanSchema.safeParse({
        title: linkedPlan.title,
        summary: "Проверка активного этапа",
        durationDays: linkedPlan.durationDays,
        topics: linkedPlan.topics,
        actions: linkedPlan.actions,
      })
    : null;
  const linkedAction = validatedLinkedPlan?.success
    ? validatedLinkedPlan.data.actions[requestedActionIndex]
    : undefined;
  const studyPlanContext =
    linkedPlan && linkedAction?.egeNumber === egeNumber
      ? {
          planId: linkedPlan.id,
          actionIndex: requestedActionIndex,
          title: linkedPlan.title,
          target: linkedAction.taskCount,
          completedBefore: linkedPlan.practiceAttempts.length,
        }
      : undefined;

  const correctAttempts = numberAttempts.filter(
    (attempt) => attempt.isCorrect
  ).length;
  const accuracy =
    numberAttempts.length === 0
      ? 0
      : Math.round((correctAttempts / numberAttempts.length) * 100);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f4f7f8] px-4 py-5 text-slate-950 sm:px-6 sm:py-8">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.32]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(15,23,42,0.045) 1px, transparent 1px), linear-gradient(90deg,rgba(15,23,42,0.045) 1px,transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="relative mx-auto max-w-5xl">
        <nav className="flex items-center justify-between gap-4 rounded-2xl border border-white/80 bg-white/85 px-4 py-3 shadow-sm backdrop-blur">
          <Link
            href="/student/trainer"
            className="text-sm font-bold text-slate-700 transition hover:text-cyan-700"
          >
            ← Выбрать другой номер
          </Link>
          <Link
            href="/student/results"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700"
          >
            Мои результаты
          </Link>
        </nav>

        <header className="relative mt-5 overflow-hidden rounded-[2rem] bg-slate-950 px-5 py-7 text-white shadow-xl sm:px-8 sm:py-9">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
          <div className="relative">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-cyan-200">
                тренажёр · №{egeNumber}
              </span>
              {studyPlanContext ? (
                <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 font-mono text-[11px] text-emerald-200">
                  мой план · {Math.min(studyPlanContext.completedBefore, studyPlanContext.target)}/{studyPlanContext.target}
                </span>
              ) : null}
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-[11px] text-slate-300">
                задача {currentPosition} из {taskIds.length}
              </span>
              {task.difficulty ? (
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-[11px] text-slate-300">
                  сложность {task.difficulty}/5
                </span>
              ) : null}
            </div>

            <h1 className="mt-5 text-3xl font-black tracking-[-0.04em] sm:text-4xl">
              {task.title}
            </h1>

            <div className="mt-6 flex flex-wrap gap-3 text-sm">
              <span className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-slate-300">
                Решений:{" "}
                <strong className="text-white">{numberAttempts.length}</strong>
              </span>
              <span className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-slate-300">
                Точность:{" "}
                <strong className="text-cyan-300">{accuracy}%</strong>
              </span>
            </div>
          </div>
        </header>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
          <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">
              task.condition
            </div>
            <div
              className="prose prose-slate mt-5 max-w-none break-words [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-xl [&_pre]:overflow-x-auto [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto"
              dangerouslySetInnerHTML={{
                __html: task.statementHtml,
              }}
            />

            {task.attachments.length > 0 ? (
              <div className="mt-7 border-t border-slate-200 pt-5">
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">
                  task.files
                </div>
                <div className="mt-3 space-y-2">
                  {task.attachments.map((attachment) => (
                    <a
                      key={attachment.id}
                      href={`/api/task-attachments/${attachment.id}/download`}
                      className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 px-4 py-3 transition hover:border-cyan-300 hover:bg-cyan-50"
                    >
                      <span className="min-w-0 truncate text-sm font-bold">
                        {attachment.originalName}
                      </span>
                      <span className="shrink-0 text-xs text-slate-400">
                        {attachment.extension.replace(".", "").toUpperCase()} ·{" "}
                        {formatFileSize(attachment.sizeBytes)}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            ) : null}
          </article>

          <TrainerTaskSolver
            key={task.id}
            taskId={task.id}
            egeNumber={egeNumber}
            answerType={task.answerType}
            studyPlanContext={studyPlanContext}
          />
        </div>

        <footer className="mt-6 rounded-2xl border border-slate-200 bg-white/80 px-5 py-4 text-sm leading-6 text-slate-500 backdrop-blur">
          После проверки нажмите «Следующее задание №{egeNumber}» — тренажёр
          продолжит показывать только задачи выбранного номера.
        </footer>
      </div>
    </main>
  );
}
