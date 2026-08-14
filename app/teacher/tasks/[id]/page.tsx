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
  searchParams: Promise<{ version?: string }>;
};

export default async function TaskPage({ params, searchParams }: TaskPageProps) {
  const { id } = await params;
  const query = await searchParams;
  const requestedVersion = Number(query.version);

  const task = await prisma.task.findFirst({
    where: {
      id,
      isArchived: false,
    },
    include: {
      revisions: {
        orderBy: { version: "desc" },
        include: {
          attachments: {
            orderBy: { order: "asc" },
            include: { attachment: true },
          },
        },
      },
    },
  });

  if (!task) {
    notFound();
  }

  const revision =
    task.revisions.find((item) => item.version === requestedVersion) ??
    task.revisions.find((item) => item.id === task.currentRevisionId) ??
    task.revisions[0];

  if (!revision) notFound();
  const isCurrent = revision.id === task.currentRevisionId;

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
              {revision.title}
            </h1>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">
                №{revision.egeNumber}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                {getAnswerTypeLabel(revision.answerType)}
              </span>
              {revision.difficulty ? (
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                  Сложность {revision.difficulty}/5
                </span>
              ) : null}
              {revision.skillTag ? (
                <span className="rounded-full bg-violet-100 px-3 py-1 text-sm font-medium text-violet-800">
                  Навык: {revision.skillTag}
                </span>
              ) : null}
              <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-800">
                Версия v{revision.version}{isCurrent ? " · текущая" : " · архивная"}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <Link
              href={`/teacher/tasks/${task.id}/edit`}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Создать новую версию
            </Link>
            <DeleteTaskButton taskId={task.id} />
          </div>
      </header>

        <section className="mb-5 rounded-3xl border border-violet-200 bg-violet-50 p-5">
          <h2 className="font-bold text-violet-950">История версий</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {task.revisions.map((item) => (
              <Link
                key={item.id}
                href={`/teacher/tasks/${task.id}?version=${item.version}`}
                className={`rounded-xl border px-3 py-2 text-xs font-bold ${
                  item.id === revision.id
                    ? "border-violet-500 bg-violet-700 text-white"
                    : "border-violet-200 bg-white text-violet-800"
                }`}
              >
                v{item.version} · {item.changeNote || "Без комментария"}
              </Link>
            ))}
          </div>
          <p className="mt-3 text-xs text-violet-800">
            Снимок создан {new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short" }).format(revision.createdAt)}. Его содержимое нельзя изменить или удалить.
          </p>
        </section>

        <section className="space-y-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-950">Условие</h2>
            <div
              className="prose prose-slate mt-4 max-w-none"
              dangerouslySetInnerHTML={{ __html: revision.statementHtml }}
            />
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-950">
              Правильный ответ
            </h2>
            <div className="mt-4 rounded-2xl bg-slate-50 p-4 font-mono text-sm text-slate-800">
              {formatAnswerForDisplay(revision.correctAnswer)}
            </div>
          </div>

          {revision.referenceHtml ? (
            <div className="rounded-3xl border border-cyan-200 bg-cyan-50/50 p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">Справочный материал до решения</h2>
              <div className="prose prose-slate mt-4 max-w-none" dangerouslySetInnerHTML={{ __html: revision.referenceHtml }} />
            </div>
          ) : null}

          {revision.hintHtml ? (
            <div className="rounded-3xl border border-amber-200 bg-amber-50/50 p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">Подсказка после первой ошибки</h2>
              <div className="prose prose-slate mt-4 max-w-none" dangerouslySetInnerHTML={{ __html: revision.hintHtml }} />
            </div>
          ) : null}

          {revision.explanationHtml ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">
                Решение / пояснение
              </h2>
              <div
                className="prose prose-slate mt-4 max-w-none"
                dangerouslySetInnerHTML={{ __html: revision.explanationHtml }}
              />
            </div>
          ) : null}

          {revision.attachments.length > 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">Материалы версии</h2>
              <div className="mt-3 space-y-2">
                {revision.attachments.map((link) => (
                  <a key={link.attachment.id} href={`/api/task-attachments/${link.attachment.id}/download`} className="block rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-cyan-800">
                    {link.attachment.originalName}
                  </a>
                ))}
              </div>
            </div>
          ) : null}

          {(revision.videoUrl || revision.source) ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">
                Дополнительные данные
              </h2>
              <div className="mt-4 space-y-2 text-sm text-slate-600">
                {revision.videoUrl ? (
                  <div>
                    Видео:{" "}
                    <a
                      href={revision.videoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-cyan-700 hover:text-cyan-900"
                    >
                      открыть
                    </a>
                  </div>
                ) : null}

                {revision.source ? <div>Источник: {revision.source}</div> : null}
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
