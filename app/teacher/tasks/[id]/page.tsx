import Link from "next/link";
import { notFound } from "next/navigation";

import {
  formatAnswerForDisplay,
  getAnswerTypeLabel,
} from "@/lib/answer";
import { prisma } from "@/lib/prisma";
import { DeleteTaskButton } from "@/components/tasks/DeleteTaskButton";

type TaskPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function TaskPage({ params }: TaskPageProps) {
  const { id } = await params;

  const task = await prisma.task.findFirst({
    where: {
      id,
      isArchived: false,
    },
  });

  if (!task) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 flex items-start justify-between gap-4">
          <div>
            <Link
              href="/teacher/tasks"
              className="text-sm font-medium text-cyan-700 hover:text-cyan-900"
            >
              ← База заданий
            </Link>
            <h1 className="mt-3 text-3xl font-bold text-slate-950">
              {task.title}
            </h1>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">
                №{task.egeNumber}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                {getAnswerTypeLabel(task.answerType)}
              </span>
              {task.difficulty ? (
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                  Сложность {task.difficulty}/5
                </span>
              ) : null}
              {task.skillTag ? (
                <span className="rounded-full bg-violet-100 px-3 py-1 text-sm font-medium text-violet-800">
                  Навык: {task.skillTag}
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex gap-2">
            <Link
              href={`/teacher/tasks/${task.id}/edit`}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Редактировать
            </Link>
            <DeleteTaskButton taskId={task.id} />
          </div>
        </header>

        <section className="space-y-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-950">Условие</h2>
            <div
              className="prose prose-slate mt-4 max-w-none"
              dangerouslySetInnerHTML={{ __html: task.statementHtml }}
            />
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-950">
              Правильный ответ
            </h2>
            <div className="mt-4 rounded-2xl bg-slate-50 p-4 font-mono text-sm text-slate-800">
              {formatAnswerForDisplay(task.correctAnswer)}
            </div>
          </div>

          {task.explanationHtml ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">
                Решение / пояснение
              </h2>
              <div
                className="prose prose-slate mt-4 max-w-none"
                dangerouslySetInnerHTML={{ __html: task.explanationHtml }}
              />
            </div>
          ) : null}

          {(task.videoUrl || task.source) ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">
                Дополнительные данные
              </h2>
              <div className="mt-4 space-y-2 text-sm text-slate-600">
                {task.videoUrl ? (
                  <div>
                    Видео:{" "}
                    <a
                      href={task.videoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-cyan-700 hover:text-cyan-900"
                    >
                      открыть
                    </a>
                  </div>
                ) : null}

                {task.source ? <div>Источник: {task.source}</div> : null}
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
