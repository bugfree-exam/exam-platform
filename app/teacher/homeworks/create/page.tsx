import Link from "next/link";

import { HomeworkForm } from "@/components/homeworks/HomeworkForm";
import { prisma } from "@/lib/prisma";

export default async function CreateHomeworkPage() {
  const [tasks, students] = await Promise.all([
    prisma.task.findMany({
      where: {
        isArchived: false,
      },
      select: {
        id: true,
        egeNumber: true,
        title: true,
        difficulty: true,
        isArchived: true,
      },
      orderBy: [{ egeNumber: "asc" }, { createdAt: "desc" }],
    }),

    prisma.user.findMany({
      where: {
        role: "STUDENT",
      },
      select: {
        id: true,
        name: true,
        email: true,
        studentStatus: true,
      },
      orderBy: {
        name: "asc",
      },
    }),
  ]);

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8">
          <Link
            href="/teacher/homeworks"
            className="text-sm font-medium text-cyan-700 hover:text-cyan-900"
          >
            ← Домашние задания
          </Link>

          <h1 className="mt-3 text-3xl font-bold text-slate-950">
            Создание домашнего задания
          </h1>

          <p className="mt-2 text-slate-600">
            Собери ДЗ из задач базы и выдай его ученикам.
          </p>
        </header>

        <HomeworkForm tasks={tasks} students={students} />
      </div>
    </main>
  );
}
