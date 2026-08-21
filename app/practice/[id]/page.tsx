import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PublicPracticeDrawingLayer } from "@/components/practice/PublicPracticeDrawingLayer";
import { PublicTaskSolver } from "@/components/practice/PublicTaskSolver";
import { prisma } from "@/lib/prisma";

type PracticeTaskPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    topic?: string | string[];
  }>;
};
export const dynamic = "force-dynamic";

function formatFileSize(sizeBytes: number) {
  if (sizeBytes < 1024) return `${sizeBytes} Б`;
  if (sizeBytes < 1024 * 1024) return `${Math.ceil(sizeBytes / 1024)} КБ`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} МБ`;
}

export async function generateMetadata({
  params,
}: PracticeTaskPageProps): Promise<Metadata> {
  const { id } = await params;
  const task = await prisma.task.findFirst({
    where: {
      id,
      isPublic: true,
      isArchived: false,
    },
    select: {
      title: true,
      egeNumber: true,
    },
  });

  return task
    ? {
        title: `${task.title} — задание №${task.egeNumber}`,
      }
    : {
        title: "Задача не найдена",
      };
}

export default async function PracticeTaskPage({
  params,
  searchParams,
}: PracticeTaskPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const requestedTopic = (
    Array.isArray(query.topic) ? query.topic[0] : query.topic
  )
    ?.trim()
    .slice(0, 120);
  const task = await prisma.task.findFirst({
    where: {
      id,
      isPublic: true,
      isArchived: false,
    },
    select: {
      id: true,
      egeNumber: true,
      title: true,
      statementHtml: true,
      referenceHtml: true,
      answerType: true,
      difficulty: true,
      skillTag: true,
      currentRevision: {
        select: {
          attachments: {
            orderBy: { order: "asc" },
            select: {
              attachment: {
                select: {
                  id: true,
                  originalName: true,
                  extension: true,
                  sizeBytes: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!task) {
    notFound();
  }
  const attachments =
    task.currentRevision?.attachments.map((link) => link.attachment) ?? [];
  const selectedTopic =
    requestedTopic && requestedTopic === task.skillTag?.trim()
      ? requestedTopic
      : null;

  const tasksOfSameNumber = await prisma.task.findMany({
    where: {
      egeNumber: task.egeNumber,
      isPublic: true,
      isArchived: false,
      ...(selectedTopic ? { skillTag: selectedTopic } : {}),
    },
    select: {
      id: true,
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  const currentIndex = tasksOfSameNumber.findIndex(
    (item) => item.id === task.id
  );
  const nextTaskId =
    tasksOfSameNumber.length > 1
      ? tasksOfSameNumber[(currentIndex + 1) % tasksOfSameNumber.length].id
      : null;
  const topicParams = selectedTopic
    ? new URLSearchParams({ topic: selectedTopic }).toString()
    : "";
  const backHref = `/practice?${new URLSearchParams({
    egeNumber: String(task.egeNumber),
    ...(selectedTopic ? { topic: selectedTopic } : {}),
  }).toString()}`;
  const nextTaskHref = nextTaskId
    ? `/practice/${nextTaskId}${topicParams ? `?${topicParams}` : ""}`
    : null;

  return (
    <>
      <PublicPracticeDrawingLayer key={task.id} taskId={task.id} />
      <main className="relative min-h-screen overflow-hidden bg-[#f4f7f8] px-4 py-5 pb-24 text-slate-950 sm:px-6 sm:py-8 sm:pb-28">
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
            href={backHref}
            className="text-sm font-bold text-slate-700 transition hover:text-cyan-700"
          >
            ← {selectedTopic ? "К выбранной теме" : `Все задания №${task.egeNumber}`}
          </Link>
          <Link
            href="/login"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700"
          >
            Войти в курс
          </Link>
        </nav>

        <header className="relative mt-5 overflow-hidden rounded-[2rem] bg-slate-950 px-5 py-7 text-white shadow-xl sm:px-8 sm:py-9">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-400/20 blur-3xl" />
          <div className="relative">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-black text-cyan-200">
                №{task.egeNumber} ЕГЭ
              </span>
              {task.skillTag ? (
                <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-100">
                  {task.skillTag}
                </span>
              ) : null}
              {task.difficulty ? (
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                  Сложность {task.difficulty}/5
                </span>
              ) : null}
            </div>
            <h1 className="mt-5 text-3xl font-black tracking-[-0.04em] sm:text-4xl">
              {task.title}
            </h1>
          </div>
        </header>

        <section className="mt-5 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-700">
            task.statement
          </div>
          <div
            className="prose prose-slate mt-5 max-w-none [&_img]:max-w-full [&_img]:rounded-2xl [&_pre]:overflow-x-auto [&_table]:w-full"
            dangerouslySetInnerHTML={{ __html: task.statementHtml }}
          />

          {task.referenceHtml ? (
            <details className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
              <summary className="cursor-pointer font-black text-emerald-900">Открыть справочный материал</summary>
              <div className="prose prose-slate mt-4 max-w-none" dangerouslySetInnerHTML={{ __html: task.referenceHtml }} />
            </details>
          ) : null}

          {attachments.length > 0 ? (
            <div className="mt-6 rounded-2xl border border-cyan-100 bg-cyan-50/60 p-4">
              <h2 className="font-black">Файлы к заданию</h2>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {attachments.map((attachment) => (
                  <a
                    key={attachment.id}
                    href={`/api/public/task-attachments/${attachment.id}/download`}
                    download
                    className="rounded-xl border border-cyan-100 bg-white px-4 py-3 transition hover:border-cyan-300"
                  >
                    <span className="block truncate text-sm font-bold">
                      {attachment.originalName}
                    </span>
                    <span className="mt-1 block text-xs text-slate-400">
                      {attachment.extension.toUpperCase()} ·{" "}
                      {formatFileSize(attachment.sizeBytes)}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        <div className="mt-5">
          <PublicTaskSolver
            key={task.id}
            taskId={task.id}
            answerType={task.answerType}
            nextTaskHref={nextTaskHref}
            nextTaskLabel={
              selectedTopic
                ? "Следующее задание по этой теме →"
                : `Следующее задание №${task.egeNumber} →`
            }
          />
        </div>
      </div>
      </main>
    </>
  );
}
