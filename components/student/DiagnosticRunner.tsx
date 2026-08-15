"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type DiagnosticTask = {
  id: string;
  egeNumber: number;
  title: string;
  statementHtml: string;
  answerType: string;
  attachments: Array<{ id: string; originalName: string }>;
};

export function StartDiagnosticButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function start() {
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/student/diagnostic", { method: "POST" });
      const body = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) throw new Error(body.message ?? "Не удалось начать диагностику");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось начать диагностику");
    } finally {
      setPending(false);
    }
  }

  return <div className="mt-6"><button onClick={start} disabled={pending} className="rounded-2xl bg-cyan-700 px-6 py-3.5 text-sm font-black text-white disabled:opacity-50">{pending ? "Готовим задания…" : "Начать диагностику →"}</button>{message ? <p className="mt-3 text-sm text-rose-700">{message}</p> : null}</div>;
}

export function DiagnosticRunner({ diagnosticId, tasks }: { diagnosticId: string; tasks: DiagnosticTask[] }) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    try {
      const response = await fetch(`/api/student/diagnostic/${diagnosticId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const body = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) throw new Error(body.message ?? "Не удалось завершить диагностику");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось завершить диагностику");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-5">
      {tasks.map((task, index) => (
        <article key={task.id} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-center justify-between gap-3"><span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-black text-cyan-800">{index + 1} из {tasks.length}</span><span className="font-mono text-xs text-slate-400">ЕГЭ №{task.egeNumber}</span></div>
          <h2 className="mt-4 text-xl font-black">{task.title}</h2>
          <div className="prose prose-slate mt-4 max-w-none text-sm" dangerouslySetInnerHTML={{ __html: task.statementHtml }} />
          {task.attachments.length ? <div className="mt-4 flex flex-wrap gap-2">{task.attachments.map((file) => <a key={file.id} href={`/api/task-attachments/${file.id}/download`} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-cyan-800">Скачать: {file.originalName}</a>)}</div> : null}
          <label className="mt-5 block text-sm font-black">Ваш ответ<input value={answers[task.id] ?? ""} onChange={(event) => setAnswers((current) => ({ ...current, [task.id]: event.target.value }))} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-mono font-normal" placeholder={task.answerType.includes("PAIR") ? "Каждая пара с новой строки" : "Введите ответ"} /></label>
        </article>
      ))}
      <div className="sticky bottom-20 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur sm:bottom-4"><p className="mb-3 text-xs leading-5 text-slate-500">Можно оставить незнакомое задание пустым — это честнее случайной догадки. Результат зафиксирует точку старта, но не изменит порядок авторского курса.</p>{message ? <p className="mb-3 text-sm text-rose-700">{message}</p> : null}<button disabled={pending} className="w-full rounded-xl bg-slate-950 px-5 py-3.5 text-sm font-black text-white disabled:opacity-50">{pending ? "Сохраняем результат…" : "Завершить входной контроль"}</button></div>
    </form>
  );
}
