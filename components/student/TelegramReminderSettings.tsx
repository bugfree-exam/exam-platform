"use client";

import { useEffect, useState } from "react";

type TelegramStatus = {
  available: boolean;
  linked: boolean;
  username: string | null;
  linkedAt: string | null;
  notificationsEnabled: boolean;
};

export function TelegramReminderSettings() {
  const [status, setStatus] = useState<TelegramStatus | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");

  async function loadStatus() {
    const response = await fetch("/api/student/telegram", {
      cache: "no-store",
    });
    const data = (await response.json().catch(() => null)) as
      | TelegramStatus
      | { message?: string }
      | null;

    if (!response.ok || !data || !("available" in data)) {
      throw new Error(
        data && "message" in data && data.message
          ? data.message
          : "Не удалось проверить Telegram"
      );
    }

    setStatus(data);
  }

  useEffect(() => {
    void loadStatus().catch((loadError) => {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Не удалось проверить Telegram"
      );
    });
  }, []);

  async function connect() {
    setIsPending(true);
    setError("");

    try {
      const response = await fetch("/api/student/telegram", {
        method: "POST",
      });
      const data = (await response.json().catch(() => null)) as
        | { deepLink?: string; message?: string }
        | null;

      if (!response.ok || !data?.deepLink) {
        throw new Error(data?.message || "Не удалось создать ссылку");
      }

      window.open(data.deepLink, "_blank", "noopener,noreferrer");
    } catch (connectError) {
      setError(
        connectError instanceof Error
          ? connectError.message
          : "Не удалось подключить Telegram"
      );
    } finally {
      setIsPending(false);
    }
  }

  async function disconnect() {
    setIsPending(true);
    setError("");

    try {
      const response = await fetch("/api/student/telegram", {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as
          | { message?: string }
          | null;
        throw new Error(data?.message || "Не удалось отключить Telegram");
      }

      await loadStatus();
    } catch (disconnectError) {
      setError(
        disconnectError instanceof Error
          ? disconnectError.message
          : "Не удалось отключить Telegram"
      );
    } finally {
      setIsPending(false);
    }
  }

  if (!status) {
    return (
      <div className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">
        {error || "Проверяю подключение…"}
      </div>
    );
  }

  if (!status.available) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <div className="font-bold text-amber-900">
          Telegram-бот ещё не активирован
        </div>
        <p className="mt-2 text-sm leading-6 text-amber-800">
          Как только преподаватель завершит настройку бота, здесь появится
          кнопка подключения.
        </p>
      </div>
    );
  }

  if (status.linked) {
    return (
      <div>
        <div className="flex flex-col gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="font-bold text-emerald-900">
              Telegram подключён ✓
            </div>
            <p className="mt-1 text-sm text-emerald-800">
              {status.username ? `@${status.username}` : "Аккаунт Telegram"}
              {status.notificationsEnabled
                ? " · напоминания включены"
                : " · напоминания выключены"}
            </p>
          </div>

          <button
            type="button"
            disabled={isPending}
            onClick={() => void disconnect()}
            className="rounded-xl border border-emerald-300 bg-white px-4 py-2.5 text-sm font-bold text-emerald-900 transition hover:border-emerald-500 disabled:opacity-60"
          >
            {isPending ? "Отключаю…" : "Отключить"}
          </button>
        </div>

        {error ? (
          <div className="mt-3 text-sm font-medium text-rose-700">{error}</div>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
        <div>
          <h2 className="text-xl font-black">Подключить Telegram</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Нажми кнопку, затем Start в открывшемся Telegram. Ссылка одноразовая
            и действует 15 минут.
          </p>
        </div>

        <button
          type="button"
          disabled={isPending}
          onClick={() => void connect()}
          className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-cyan-700 disabled:opacity-60"
        >
          {isPending ? "Создаю ссылку…" : "Подключить Telegram"}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void loadStatus().catch(() => undefined)}
          className="text-sm font-bold text-cyan-700 hover:text-cyan-900"
        >
          Я нажал Start — проверить подключение
        </button>
      </div>

      {error ? (
        <div className="mt-3 text-sm font-medium text-rose-700">{error}</div>
      ) : null}
    </div>
  );
}
