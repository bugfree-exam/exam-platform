import Link from "next/link";

import { LogoutButton } from "@/components/LogoutButton";
import { getCurrentUser } from "@/lib/auth";

export default async function TeacherPage() {
  const user = await getCurrentUser();

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-cyan-600">
              Экзамен без багов
            </div>
            <h1 className="mt-1 text-3xl font-bold text-slate-950">
              Кабинет учителя
            </h1>
            <p className="mt-2 text-slate-600">
              {user?.name} · {user?.email}
            </p>
          </div>

          <LogoutButton />
        </header>

        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/teacher/students"
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="text-sm font-medium text-slate-500">
              Ученики
            </div>
            <h2 className="mt-2 text-xl font-bold text-slate-950">
              Доступы и прогресс
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Создание аккаунтов учеников, выдача доступов и просмотр результатов.
            </p>
          </Link>

          <Link
            href="/teacher/tasks"
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="text-sm font-medium text-slate-500">
              База заданий
            </div>
            <h2 className="mt-2 text-xl font-bold text-slate-950">
              Создание задач
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Добавление условий, правильных ответов и типов автопроверки.
            </p>
          </Link>

          <Link
            href="/teacher/homeworks"
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="text-sm font-medium text-slate-500">
              Домашние задания
            </div>
            <h2 className="mt-2 text-xl font-bold text-slate-950">
              Выдача ДЗ
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Сборка домашних заданий из базы задач и выдача ученикам.
            </p>
          </Link>

          <Link
            href="/teacher/results"
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="text-sm font-medium text-slate-500">
              Результаты
            </div>
            <h2 className="mt-2 text-xl font-bold text-slate-950">
              Проверка прогресса
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Просмотр попыток, ошибок и результатов учеников.
            </p>
          </Link>
        </section>
      </div>
    </main>
  );
}