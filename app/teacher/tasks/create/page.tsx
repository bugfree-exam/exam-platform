import Link from "next/link";

import { TaskForm } from "@/components/tasks/TaskForm";

export default function CreateTaskPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8">
          <Link
            href="/teacher/tasks"
            className="text-sm font-medium text-cyan-700 hover:text-cyan-900"
          >
            ← База заданий
          </Link>
          <h1 className="mt-3 text-3xl font-bold text-slate-950">
            Создание задачи
          </h1>
          <p className="mt-2 text-slate-600">
            Добавь условие, тип ответа и правильный ответ для автопроверки.
          </p>
        </header>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <TaskForm mode="create" />
        </section>
      </div>
    </main>
  );
}