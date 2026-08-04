"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type ScheduleEvent = {
  id: string;
  topic: string;
  announcement: string | null;
  joinUrl: string;
  scheduledAt: string;
  isPublished: boolean;
};

type FormState = {
  id: string | null;
  topic: string;
  announcement: string;
  joinUrl: string;
  eventDate: string;
  eventTime: string;
  isPublished: boolean;
};

const emptyForm: FormState = {
  id: null,
  topic: "",
  announcement: "",
  joinUrl: "",
  eventDate: "",
  eventTime: "",
  isPublished: true,
};

function moscowInputParts(iso: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";

  return {
    eventDate: `${get("year")}-${get("month")}-${get("day")}`,
    eventTime: `${get("hour")}:${get("minute")}`,
  };
}

function formatEventDate(iso: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function WebinarScheduleManager({ events }: { events: ScheduleEvent[] }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const isEditing = Boolean(form.id);
  const minDate = useMemo(() => {
    const now = new Date();
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Moscow",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
  }, []);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function startEdit(event: ScheduleEvent) {
    const inputParts = moscowInputParts(event.scheduledAt);
    setForm({
      id: event.id,
      topic: event.topic,
      announcement: event.announcement ?? "",
      joinUrl: event.joinUrl,
      isPublished: event.isPublished,
      ...inputParts,
    });
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError("");

    try {
      const response = await fetch(
        form.id ? `/api/webinar-schedule/${form.id}` : "/api/webinar-schedule",
        {
          method: form.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        setError(data.message || "Не удалось сохранить событие");
        return;
      }

      setForm(emptyForm);
      router.refresh();
    } catch {
      setError("Не удалось подключиться к серверу");
    } finally {
      setIsSaving(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Удалить это событие из расписания?")) return;

    setDeletingId(id);
    setError("");
    try {
      const response = await fetch(`/api/webinar-schedule/${id}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.message || "Не удалось удалить событие");
        return;
      }
      if (form.id === id) setForm(emptyForm);
      router.refresh();
    } catch {
      setError("Не удалось подключиться к серверу");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-start">
      <form
        onSubmit={submit}
        className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:sticky lg:top-6"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan-700">
              Moscow_time
            </p>
            <h2 className="mt-2 text-xl font-bold text-slate-950">
              {isEditing ? "Редактировать событие" : "Добавить вебинар"}
            </h2>
          </div>
          {isEditing ? (
            <button
              type="button"
              onClick={() => setForm(emptyForm)}
              className="text-sm font-semibold text-slate-500 hover:text-slate-950"
            >
              Отмена
            </button>
          ) : null}
        </div>

        <div className="mt-6 space-y-5">
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Тема</span>
            <input
              required
              maxLength={200}
              value={form.topic}
              onChange={(event) => update("topic", event.target.value)}
              placeholder="Например: Алгоритмы для задания №26"
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Дата</span>
              <input
                required
                type="date"
                min={form.id ? undefined : minDate}
                value={form.eventDate}
                onChange={(event) => update("eventDate", event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">
                Время по МСК
              </span>
              <input
                required
                type="time"
                value={form.eventTime}
                onChange={(event) => update("eventTime", event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">
              Ссылка для подключения
            </span>
            <input
              required
              type="url"
              maxLength={1000}
              value={form.joinUrl}
              onChange={(event) => update("joinUrl", event.target.value)}
              placeholder="https://..."
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">
              Краткий анонс
            </span>
            <textarea
              rows={4}
              maxLength={1500}
              value={form.announcement}
              onChange={(event) => update("announcement", event.target.value)}
              placeholder="Что разберём и к чему подготовиться"
              className="mt-2 w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm leading-6 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            />
          </label>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <input
              type="checkbox"
              checked={form.isPublished}
              onChange={(event) => update("isPublished", event.target.checked)}
              className="mt-0.5 h-4 w-4 accent-cyan-700"
            />
            <span>
              <span className="block text-sm font-semibold text-slate-800">
                Показывать ученикам
              </span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">
                Снимите галочку, чтобы сохранить событие скрытым.
              </span>
            </span>
          </label>
        </div>

        {error ? (
          <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isSaving}
          className="mt-6 w-full rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-60"
        >
          {isSaving
            ? "Сохранение…"
            : isEditing
              ? "Сохранить изменения"
              : "Добавить в расписание"}
        </button>
      </form>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-400">
              schedule
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-950">
              Все события
            </h2>
          </div>
          <span className="rounded-full bg-white px-3 py-1.5 text-sm font-bold text-slate-600 shadow-sm">
            {events.length}
          </span>
        </div>

        {events.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
            Расписание пока пустое. Добавьте первый вебинар.
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((event) => (
              <article
                key={event.id}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                          event.isPublished
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {event.isPublished ? "Опубликовано" : "Скрыто"}
                      </span>
                      <span className="text-sm font-semibold text-cyan-700">
                        {formatEventDate(event.scheduledAt)} МСК
                      </span>
                    </div>
                    <h3 className="mt-3 text-lg font-bold text-slate-950">
                      {event.topic}
                    </h3>
                    {event.announcement ? (
                      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">
                        {event.announcement}
                      </p>
                    ) : null}
                    <a
                      href={event.joinUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 block truncate text-sm font-semibold text-cyan-700 hover:text-cyan-900"
                    >
                      {event.joinUrl}
                    </a>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(event)}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:border-slate-300 hover:text-slate-950"
                    >
                      Изменить
                    </button>
                    <button
                      type="button"
                      disabled={deletingId === event.id}
                      onClick={() => void remove(event.id)}
                      className="rounded-xl border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
