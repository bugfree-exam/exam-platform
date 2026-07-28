import Link from "next/link";
import { notFound } from "next/navigation";

import { TaskForm } from "@/components/tasks/TaskForm";
import { answerToTeacherInput } from "@/lib/answer";
import { prisma } from "@/lib/prisma";

type EditTaskPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditTaskPage({ params }: EditTaskPageProps) {
  const { id } = await params;

  const task = await prisma.task.findFirst({
    where: {
      id,
      isArchived: false,
    },
    include: {
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
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8">
          <Link
            href={`/teacher/tasks/${task.id}`}
            className="text-sm font-medium text-cyan-700 hover:text-cyan-900"
          >
            ← К задаче
          </Link>
          <h1 className="mt-3 text-3xl font-bold text-slate-950">
            Редактирование задачи
          </h1>
          <p className="mt-2 text-slate-600">
            Измени условие, тип ответа или правильный ответ.
          </p>
        </header>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <TaskForm
            mode="edit"
            initialData={{
              id: task.id,
              egeNumber: task.egeNumber,
              title: task.title,
              statementHtml: task.statementHtml,
              answerType: task.answerType,
              correctAnswerText: answerToTeacherInput(task.correctAnswer),
              explanationHtml: task.explanationHtml ?? "",
              videoUrl: task.videoUrl ?? "",
              source: task.source ?? "",
              difficulty: task.difficulty,
              isPublic: task.isPublic,
              attachments: task.attachments,
            }}
          />
        </section>
      </div>
    </main>
  );
}
