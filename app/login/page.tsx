"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type LoginResponse = {
  user?: {
    id: string;
    email: string;
    name: string;
    role: "TEACHER" | "STUDENT";
  };
  message?: string;
};

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("teacher@example.com");
  const [password, setPassword] = useState("teacher123");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = (await response.json()) as LoginResponse;

      if (!response.ok || !data.user) {
        setError(data.message || "Не удалось войти");
        return;
      }

      router.replace(data.user.role === "TEACHER" ? "/teacher" : "/student");
      router.refresh();
    } catch {
      setError("Не удалось подключиться к серверу");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-50">
      <div className="mx-auto flex min-h-[calc(100vh-80px)] max-w-6xl items-center justify-center">
        <div className="grid w-full gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="flex flex-col justify-center rounded-3xl border border-white/10 bg-white/[0.04] p-8 shadow-2xl">
            <div className="mb-6 inline-flex w-fit rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-200">
              Экзамен без багов
            </div>

            <h1 className="max-w-2xl text-4xl font-bold tracking-tight md:text-5xl">
              Платформа для домашних заданий с автопроверкой
            </h1>

            <p className="mt-5 max-w-xl text-lg leading-8 text-slate-300">
              Ученики получают задания ЕГЭ, отправляют ответы, а система
              автоматически проверяет результат и сохраняет попытки.
            </p>

            <div className="mt-8 grid gap-3 text-sm text-slate-300 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div className="text-2xl font-bold text-white">27</div>
                <div>типов заданий ЕГЭ</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div className="text-2xl font-bold text-white">auto</div>
                <div>проверка ответов</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div className="text-2xl font-bold text-white">MVP</div>
                <div>быстрый запуск курса</div>
              </div>
            </div>
          </section>

          <section className="rounded-3xl bg-white p-6 text-slate-900 shadow-2xl">
            <h2 className="text-2xl font-bold">Вход в платформу</h2>
            <p className="mt-2 text-sm text-slate-500">
              Используй тестовые аккаунты из seed.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Почта
                </label>
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
                  placeholder="teacher@example.com"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Пароль
                </label>
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
                  placeholder="teacher123"
                />
              </div>

              {error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-xl bg-slate-950 px-4 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? "Входим..." : "Войти"}
              </button>
            </form>

            <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
              <div className="font-semibold text-slate-800">
                Тестовые доступы:
              </div>
              <div className="mt-2">
                Учитель: <b>teacher@example.com</b> / <b>teacher123</b>
              </div>
              <div>
                Ученик: <b>student@example.com</b> / <b>student123</b>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}