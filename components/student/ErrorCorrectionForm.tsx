"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import {
  LEARNING_ERROR_CAUSES,
  learningErrorCauseLabels,
  type LearningErrorCauseValue,
} from "@/lib/ai/errorCauses";

export function ErrorCorrectionForm({ evidenceKey }: { evidenceKey: string }) {
  const router = useRouter();
  const [errorCause, setErrorCause] = useState<LearningErrorCauseValue | "">("");
  const [reflection, setReflection] = useState("");
  const [correctedAnswer, setCorrectedAnswer] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!errorCause) return;
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/student/errors/correction", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ evidenceKey, errorCause, reflection, correctedAnswer }),
      });
      const body = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) throw new Error(body.message ?? "Не удалось проверить коррекцию");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось проверить коррекцию");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-5 space-y-4 border-t border-slate-200 pt-5">
      <label className="block">
        <span className="text-xs font-black uppercase tracking-wide text-slate-500">1. Почему возникла ошибка?</span>
        <select required value={errorCause} onChange={(event) => setErrorCause(event.target.value as LearningErrorCauseValue)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
          <option value="">Выберите причину</option>
          {LEARNING_ERROR_CAUSES.map((cause) => <option key={cause} value={cause}>{learningErrorCauseLabels[cause]}</option>)}
        </select>
      </label>
      <label className="block">
        <span className="text-xs font-black uppercase tracking-wide text-slate-500">2. Что сделаете иначе?</span>
        <textarea required minLength={10} value={reflection} onChange={(event) => setReflection(event.target.value)} rows={3} placeholder="Например: сначала выпишу условие, затем проверю границы…" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
      </label>
      <label className="block">
        <span className="text-xs font-black uppercase tracking-wide text-slate-500">3. Решите заново и запишите ответ</span>
        <textarea required value={correctedAnswer} onChange={(event) => setCorrectedAnswer(event.target.value)} rows={2} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-mono text-sm" />
      </label>
      {message ? <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{message}</p> : null}
      <button disabled={pending || !errorCause || reflection.trim().length < 10} className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white disabled:opacity-50">{pending ? "Проверяем…" : "Проверить исправление"}</button>
    </form>
  );
}
