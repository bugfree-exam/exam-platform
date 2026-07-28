import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PublicTaskSolver } from "@/components/practice/PublicTaskSolver";
import { prisma } from "@/lib/prisma";

type PracticeTaskPageProps = {
  params: Promise<{
    id: string;
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
}: PracticeTaskPageProps) {
  const { id } = await params;
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
  });

  if (!task) {
    notFound();
  }

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
            href="/practice"
            className="text-sm font-bold text-slate-700 transition hover:text-cyan-700"
          >
            ← Все задания
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

          {task.attachments.length > 0 ? (
            <div className="mt-6 rounded-2xl border border-cyan-100 bg-cyan-50/60 p-4">
              <h2 className="font-black">Файлы к заданию</h2>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {task.attachments.map((attachment) => (
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
            taskId={task.id}
            answerType={task.answerType}
          />
        </div>
      </div>
    </main>
  );
}
