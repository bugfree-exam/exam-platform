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

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const isSubmitDisabled =
    isLoading || email.trim().length === 0 || password.length === 0;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      setError("Введите почту и пароль");
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: normalizedEmail,
          password,
        }),
      });

      const data = (await response
        .json()
        .catch(() => ({}))) as LoginResponse;

      if (!response.ok || !data.user) {
        setError(data.message || "Неверная почта или пароль");
        return;
      }

      router.replace(data.user.role === "TEACHER" ? "/teacher" : "/student");
      router.refresh();
    } catch {
      setError(
        "Не удалось подключиться к серверу. Проверьте интернет и попробуйте ещё раз."
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f4f7f8] px-4 py-5 text-slate-950 sm:px-6 sm:py-8">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.32]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(15,23,42,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.045) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="pointer-events-none absolute -left-32 top-20 h-80 w-80 rounded-full bg-cyan-300/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 bottom-10 h-96 w-96 rounded-full bg-violet-300/15 blur-3xl" />

      <div className="relative mx-auto flex min-h-[calc(100vh-40px)] max-w-7xl items-center sm:min-h-[calc(100vh-64px)]">
        <div className="grid w-full overflow-hidden rounded-[2rem] border border-white/80 bg-white shadow-xl shadow-slate-950/10 lg:grid-cols-[minmax(0,1.08fr)_minmax(420px,0.92fr)]">
          <section className="relative overflow-hidden bg-slate-950 px-6 py-8 text-white sm:px-9 sm:py-10 lg:flex lg:min-h-[680px] lg:flex-col lg:justify-between lg:px-12 lg:py-12">
            <div
              className="pointer-events-none absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
                backgroundSize: "28px 28px",
              }}
            />

            <div className="pointer-events-none absolute -right-28 -top-24 h-80 w-80 rounded-full bg-cyan-400/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-28 left-1/4 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" />

            <div className="relative">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-cyan-300 font-mono text-sm font-black text-slate-950">
                  &lt;/&gt;
                </span>

                <div>
                  <div className="font-bold text-white">Экзамен без багов</div>
                  <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">
                    learning.platform
                  </div>
                </div>
              </div>

              <div className="mt-10 max-w-2xl lg:mt-16">
                <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-cyan-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
                  secure.access
                </span>

                <h1 className="mt-5 text-3xl font-black tracking-[-0.04em] sm:text-4xl lg:text-5xl">
                  Всё для подготовки — в одном кабинете
                </h1>

                <p className="mt-5 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">
                  Домашние задания, записи вебинаров, учебные материалы,
                  автопроверка ответов и понятная статистика прогресса.
                </p>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3 lg:mt-12">
                <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                  <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-cyan-300">
                    practice
                  </div>
                  <div className="mt-2 text-sm font-bold text-white">
                    Домашние задания
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    Практика по актуальным номерам ЕГЭ
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                  <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-cyan-300">
                    materials
                  </div>
                  <div className="mt-2 text-sm font-bold text-white">
                    Вебинары и конспекты
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    Все материалы курса под рукой
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                  <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-cyan-300">
                    analytics
                  </div>
                  <div className="mt-2 text-sm font-bold text-white">
                    Личный прогресс
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    Результаты и разбор ошибок
                  </p>
                </div>
              </div>
            </div>

            <div className="relative mt-10 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/10 pt-5 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500 lg:mt-12">
              <span>course.workspace</span>
              <span className="hidden h-1 w-1 rounded-full bg-slate-700 sm:block" />
              <span>personal.access</span>
              <span className="hidden h-1 w-1 rounded-full bg-slate-700 sm:block" />
              <span>exam.ready</span>
            </div>
          </section>

          <section className="flex items-center px-5 py-8 sm:px-9 sm:py-10 lg:px-12">
            <div className="mx-auto w-full max-w-md">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-700">
                account.login
              </div>

              <h2 className="mt-2 text-3xl font-black tracking-[-0.03em] text-slate-950">
                Вход в платформу
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-500">
                Введите данные, которые вы получили от преподавателя.
              </p>

              <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-bold text-slate-700"
                  >
                    Электронная почта
                  </label>

                  <input
                    id="email"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      if (error) setError("");
                    }}
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    spellCheck={false}
                    required
                    disabled={isLoading}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
                    placeholder="name@example.com"
                  />
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-4">
                    <label
                      htmlFor="password"
                      className="block text-sm font-bold text-slate-700"
                    >
                      Пароль
                    </label>

                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      disabled={isLoading}
                      className="text-xs font-bold text-cyan-700 transition hover:text-cyan-900 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-controls="password"
                      aria-pressed={showPassword}
                    >
                      {showPassword ? "Скрыть пароль" : "Показать пароль"}
                    </button>
                  </div>

                  <input
                    id="password"
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      if (error) setError("");
                    }}
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    disabled={isLoading}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
                    placeholder="Введите пароль"
                  />
                </div>

                {error ? (
                  <div
                    role="alert"
                    aria-live="polite"
                    className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-rose-600 text-xs font-black text-white"
                    >
                      !
                    </span>
                    <span>{error}</span>
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={isSubmitDisabled}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3.5 text-sm font-black text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <span
                        aria-hidden="true"
                        className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
                      />
                      Выполняется вход...
                    </>
                  ) : (
                    <>
                      Войти в кабинет
                      <span aria-hidden="true">→</span>
                    </>
                  )}
                </button>
              </form>

              <div className="mt-7 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white text-sm shadow-sm">
                    ?
                  </span>

                  <div>
                    <div className="text-sm font-bold text-slate-800">
                      Не получается войти?
                    </div>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Проверьте раскладку клавиатуры и правильность почты. Если
                      данные всё равно не подходят, обратитесь к преподавателю.
                    </p>
                  </div>
                </div>
              </div>

              <p className="mt-6 text-center text-xs leading-5 text-slate-400">
                Доступ к платформе предоставляется ученикам курса и
                преподавателям.
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}