"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function CalendarReplanForm({ weeklyMinutes }: { weeklyMinutes: number }) {
  const router = useRouter();
  const [minutes, setMinutes] = useState(weeklyMinutes);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/student/calendar/replan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weeklyMinutes: minutes, reason }),
      });
      const body = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) throw new Error(body.message ?? "Не удалось перестроить маршрут");
      setReason("");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось перестроить маршрут");
    } finally {
      setPending(false);
    }
  }

  return <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-[180px_1fr_auto]"><select value={minutes} onChange={(event) => setMinutes(Number(event.target.value))} className="rounded-xl border border-slate-200 px-3 py-2.5">{[120, 180, 240, 300, 360, 480, 600, 720].map((value) => <option key={value} value={value}>{value / 60} ч/нед.</option>)}</select><input required minLength={3} maxLength={300} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Почему изменился график?" className="rounded-xl border border-slate-200 px-3 py-2.5" /><button disabled={pending} className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white">{pending ? "Строим…" : "Перепланировать"}</button>{message ? <p className="text-sm text-rose-700 sm:col-span-3">{message}</p> : null}</form>;
}
