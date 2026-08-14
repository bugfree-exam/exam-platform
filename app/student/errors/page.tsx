import Link from "next/link";

import { ErrorCorrectionForm } from "@/components/student/ErrorCorrectionForm";
import { requireStudentPage } from "@/lib/access";
import { getStudentErrorQueue } from "@/lib/studentErrors";

export const dynamic = "force-dynamic";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("ru-RU", { timeZone: "Europe/Moscow", day: "2-digit", month: "long" }).format(value);
}

export default async function StudentErrorsPage() {
  const user = await requireStudentPage();
  const errors = await getStudentErrorQueue(user.id);
  const open = errors.filter((item) => item.correction?.status !== "CORRECTED" && item.correction?.status !== "VERIFIED");
  const corrected = errors.filter((item) => item.correction?.status === "CORRECTED" || item.correction?.status === "VERIFIED");
  const now = new Date();

  return (
    <main className="min-h-screen bg-[#f3f7fa] px-4 py-6 text-[#102638] sm:px-6">
      <div className="mx-auto max-w-5xl">
        <Link href="/student" className="text-sm font-bold text-cyan-700">← В кабинет</Link>
        <header className="mt-4 rounded-[32px] bg-[#092535] p-7 text-white sm:p-10">
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-cyan-300">error.correction.loop</div>
          <h1 className="mt-3 text-3xl font-black sm:text-5xl">Исправление ошибок</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">Ошибка закрывается только после нового верного решения. Через неделю платформа предложит контрольное повторение, чтобы проверить устойчивость навыка.</p>
          <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold"><span className="rounded-full bg-rose-300/10 px-3 py-1.5 text-rose-200">Открыто: {open.length}</span><span className="rounded-full bg-emerald-300/10 px-3 py-1.5 text-emerald-200">Исправлено: {corrected.length}</span></div>
        </header>

        {open.length === 0 ? (
          <section className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-7"><h2 className="text-xl font-black text-emerald-900">Открытых ошибок нет ✓</h2><p className="mt-2 text-sm leading-6 text-emerald-800">Новые ошибки из диагностики, ДЗ, тренажёра и вариантов автоматически появятся здесь.</p></section>
        ) : (
          <section className="mt-6 space-y-4">
            {open.map((item) => (
              <article key={item.evidenceKey} className="rounded-3xl border border-white bg-white p-5 shadow-sm sm:p-7">
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold"><span className="rounded-full bg-rose-100 px-2.5 py-1 text-rose-800">№{item.egeNumber}</span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">{item.sourceLabel} · {formatDate(item.occurredAt)}</span></div>
                <h2 className="mt-4 text-xl font-black">{item.title}</h2>
                <div className="prose prose-slate mt-4 max-w-none text-sm" dangerouslySetInnerHTML={{ __html: item.statementHtml }} />
                {item.referenceHtml ? <div className="prose prose-slate mt-3 max-w-none rounded-2xl bg-slate-50 p-4 text-sm" dangerouslySetInnerHTML={{ __html: item.referenceHtml }} /> : null}
                <p className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800">Предыдущий ответ: <strong className="font-mono">{item.previousAnswer}</strong></p>
                <ErrorCorrectionForm evidenceKey={item.evidenceKey} />
              </article>
            ))}
          </section>
        )}

        {corrected.length > 0 ? <section className="mt-8"><h2 className="text-xl font-black">Контрольные повторения</h2><div className="mt-3 grid gap-3 sm:grid-cols-2">{corrected.map((item) => { const isVerified = item.correction?.status === "VERIFIED"; const isDue = Boolean(item.correction?.scheduledFor && item.correction.scheduledFor <= now); return <article key={item.evidenceKey} className="rounded-2xl border border-emerald-200 bg-white p-5"><div className="text-xs font-bold text-emerald-700">{isVerified ? "Навык подтверждён" : "Исправлено"} · №{item.egeNumber}</div><h3 className="mt-2 font-black">{item.title}</h3><p className="mt-2 text-xs leading-5 text-slate-500">{isVerified ? "Новая независимая задача решена верно." : `Контроль: ${item.correction?.scheduledFor ? formatDate(item.correction.scheduledFor) : "дата уточняется"}`}</p>{!isVerified && isDue ? <Link href={`/student/trainer/${item.egeNumber}?mode=control`} className="mt-4 inline-flex text-sm font-black text-cyan-700">Проверить на новой задаче →</Link> : !isVerified ? <span className="mt-4 inline-flex text-xs font-bold text-slate-400">Сначала выдержите паузу</span> : null}</article>; })}</div></section> : null}
      </div>
    </main>
  );
}
