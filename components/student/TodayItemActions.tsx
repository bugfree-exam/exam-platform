"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function TodayItemActions({
  itemKey,
  href,
  checkHref,
  action,
  external = false,
}: {
  itemKey: string;
  href: string;
  checkHref?: string;
  action: string;
  external?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<"tomorrow" | "help" | null>(null);
  const [message, setMessage] = useState("");

  async function decide(kind: "tomorrow" | "help") {
    setPending(kind);
    setMessage("");
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    try {
      const response = await fetch("/api/student/today/decision", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemKey,
          state: kind === "help" ? "HELP_REQUESTED" : "SNOOZED",
          scheduledFor: kind === "tomorrow" ? tomorrow.toISOString() : null,
          note: kind === "help" ? "Ученик запросил помощь из очереди «Сегодня»" : null,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) throw new Error(body.message ?? "Не удалось сохранить действие");
      if (kind === "help") setMessage("Запрос помощи сохранён — учитель увидит его в карточке ученика.");
      else router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось сохранить действие");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="mt-4">
      <div className="flex flex-wrap gap-2">
        <Link href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined} className="rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white">{action}</Link>
        <button type="button" onClick={() => decide("tomorrow")} disabled={Boolean(pending)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-600">{pending === "tomorrow" ? "Переносим…" : "На завтра"}</button>
        {checkHref ? <Link href={checkHref} className="rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2.5 text-xs font-bold text-cyan-800">Уже умею — проверить</Link> : null}
        <button type="button" onClick={() => decide("help")} disabled={Boolean(pending)} className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2.5 text-xs font-bold text-violet-800">{pending === "help" ? "Отправляем…" : "Нужна помощь"}</button>
      </div>
      {message ? <p className="mt-2 text-xs leading-5 text-slate-600">{message}</p> : null}
    </div>
  );
}
