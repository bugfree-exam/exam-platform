"use client";

import Link from "next/link";
import { useState } from "react";

type StudentAccessCardProps = {
  studentId: string;
  email: string;
  lastActivityLabel: string;
};

type ResetPasswordResponse = {
  temporaryPassword?: string;
  message?: string;
};

export function StudentAccessCard({
  studentId,
  email,
  lastActivityLabel,
}: StudentAccessCardProps) {
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [message, setMessage] = useState("");

  async function copyText(value: string, successMessage: string) {
    try {
      await navigator.clipboard.writeText(value);
      setMessage(successMessage);
    } catch {
      setMessage("Не удалось скопировать автоматически");
    }
  }

  async function resetPassword() {
    const confirmed = window.confirm(
      "Текущий пароль перестанет работать. Создать ученику новый временный пароль?"
    );

    if (!confirmed) return;

    setIsResetting(true);
    setMessage("");

    try {
      const response = await fetch(
        `/api/teacher/students/${studentId}/reset-password`,
        {
          method: "POST",
        }
      );

      const data = (await response.json()) as ResetPasswordResponse;

      if (!response.ok || !data.temporaryPassword) {
        setMessage(data.message || "Не удалось заменить пароль");
        return;
      }

      setTemporaryPassword(data.temporaryPassword);
      setIsPasswordVisible(false);
      setMessage(
        "Пароль обновлён. Скопируйте его сейчас: после обновления страницы он больше не будет показан."
      );
    } catch {
      setMessage("Не удалось подключиться к серверу");
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div>
        <h2 className="text-xl font-bold text-slate-950">Доступ к платформе</h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          Пароль хранится только в виде защищённого хеша, поэтому посмотреть
          действующий пароль нельзя. При необходимости можно выдать новый.
        </p>
      </div>

      <div className="mt-5 space-y-4">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Логин
          </div>

          <div className="mt-2 flex gap-2">
            <div className="min-w-0 flex-1 truncate rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 font-mono text-sm text-slate-800">
              {email}
            </div>

            <button
              type="button"
              onClick={() => copyText(email, "Логин скопирован")}
              className="rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 transition hover:border-cyan-300 hover:text-cyan-700"
            >
              Копировать
            </button>
          </div>
        </div>

        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Новый временный пароль
          </div>

          <div className="mt-2 flex gap-2">
            <div className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 font-mono text-sm text-slate-800">
              {temporaryPassword
                ? isPasswordVisible
                  ? temporaryPassword
                  : "••••••••••••"
                : "Пароль не создавался"}
            </div>

            {temporaryPassword ? (
              <button
                type="button"
                onClick={() => setIsPasswordVisible((value) => !value)}
                className="rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 transition hover:border-cyan-300 hover:text-cyan-700"
              >
                {isPasswordVisible ? "Скрыть" : "Показать"}
              </button>
            ) : null}
          </div>

          {temporaryPassword ? (
            <button
              type="button"
              onClick={() =>
                copyText(
                  `Ссылка: ${window.location.origin}/login\nЛогин: ${email}\nПароль: ${temporaryPassword}`,
                  "Данные для входа скопированы"
                )
              }
              className="mt-2 w-full rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-2.5 text-sm font-semibold text-cyan-800 transition hover:bg-cyan-100"
            >
              Скопировать данные для входа
            </button>
          ) : null}
        </div>

        <button
          type="button"
          onClick={resetPassword}
          disabled={isResetting}
          className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isResetting ? "Создаём новый пароль..." : "Выдать новый пароль"}
        </button>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="text-xs font-medium text-slate-400">
            Последняя активность
          </div>
          <div className="mt-1 text-sm font-semibold text-slate-700">
            {lastActivityLabel}
          </div>
        </div>

        <Link
          href={`/teacher/students/${studentId}/activity`}
          className="flex w-full items-center justify-between rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm font-semibold text-cyan-800 transition hover:bg-cyan-100"
        >
          <span>Подробная активность ученика</span>
          <span aria-hidden="true">→</span>
        </Link>

        {message ? (
          <div
            role="status"
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs leading-5 text-slate-600"
          >
            {message}
          </div>
        ) : null}
      </div>
    </article>
  );
}
