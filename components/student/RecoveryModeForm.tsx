"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function RecoveryModeForm() {
  const router = useRouter();
  const [reason, setReason] = useState("OVERLOAD");
  const [weeklyMinutes, setWeeklyMinutes] = useState(180);
  const [mainGoal, setMainGoal] = useState("Вернуться к трём коротким занятиям");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/student/recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, weeklyMinutes, mainGoal }),
      });
      const body = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) throw new Error(body.message ?? "Не удалось включить восстановление");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось включить восстановление");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4 rounded-[28px] border border-slate-200 bg-white p-6">
      <label className="block text-sm font-black">Что сбило ритм?<select value={reason} onChange={(event) => setReason(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal"><option value="OVERLOAD">Накопилась перегрузка</option><option value="ILLNESS">Болезнь или восстановление</option><option value="SCHOOL_LOAD">Высокая нагрузка в школе</option><option value="LOW_MOTIVATION">Потерялся ритм и мотивация</option><option value="OTHER">Другая причина</option></select></label>
      <label className="block text-sm font-black">Сколько минут реально есть на эту неделю?<input type="number" min="60" max="900" step="30" value={weeklyMinutes} onChange={(event) => setWeeklyMinutes(Number(event.target.value))} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal" /></label>
      <label className="block text-sm font-black">Одна главная цель недели<input value={mainGoal} onChange={(event) => setMainGoal(event.target.value)} maxLength={200} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal" /></label>
      {message ? <p className="text-sm text-rose-700">{message}</p> : null}
      <button disabled={pending} className="w-full rounded-xl bg-slate-950 px-5 py-3.5 text-sm font-black text-white disabled:opacity-50">{pending ? "Пересобираем неделю…" : "Включить режим на 7 дней"}</button>
    </form>
  );
}

export function FinishRecoveryButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  async function finish() {
    setPending(true);
    await fetch("/api/student/recovery", { method: "PATCH" });
    router.refresh();
    setPending(false);
  }
  return <button onClick={finish} disabled={pending} className="rounded-xl border border-emerald-300 bg-white px-4 py-2.5 text-sm font-black text-emerald-900">{pending ? "Завершаем…" : "Ритм восстановлен"}</button>;
}
