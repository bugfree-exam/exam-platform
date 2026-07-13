import Link from "next/link";

import { LogoutButton } from "@/components/LogoutButton";
import { getCurrentUser } from "@/lib/auth";

export default async function StudentPage() {
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
              Кабинет ученика
            </h1>
            <p className="mt-2 text-slate-600">
              {user?.name} · {user?.email}
            </p>
          </div>

          <LogoutButton />
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          <Link
            href="/student/homeworks"
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="text-sm font-medium text-slate-500">
              Домашние задания
            </div>
            <h2 className="mt-2 text-xl font-bold text-slate-950">
              Мои ДЗ
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Здесь будут выданные домашние задания, попытки и результаты.
            </p>
          </Link>

          <Link
            href="/student/results"
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="text-sm font-medium text-slate-500">
              Результаты
            </div>
            <h2 className="mt-2 text-xl font-bold text-slate-950">
              Мой прогресс
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              История решений и статистика по заданиям ЕГЭ.
            </p>
          </Link>
        </section>
      </div>
    </main>
  );
}