import Link from "next/link";

import { FinishRecoveryButton, RecoveryModeForm } from "@/components/student/RecoveryModeForm";
import { requireStudentPage } from "@/lib/access";
import { getStudentJourneyOverview } from "@/lib/studentJourney";

export const dynamic = "force-dynamic";
function formatDate(value: Date) { return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "long", timeZone: "Europe/Moscow" }).format(value); }

export default async function StudentRecoveryPage() {
  const user = await requireStudentPage();
  const { recovery } = await getStudentJourneyOverview(user.id);
  return <main className="min-h-screen bg-[#f3f7fa] px-4 py-6 text-[#102638] sm:px-6"><div className="mx-auto max-w-3xl"><Link href="/student" className="text-sm font-bold text-cyan-700">← В кабинет</Link><header className="mt-4 rounded-[32px] bg-[#092535] p-7 text-white sm:p-10"><div className="font-mono text-[11px] uppercase tracking-[0.18em] text-cyan-300">recovery.mode</div><h1 className="mt-3 text-3xl font-black sm:text-5xl">Вернуться в ритм без чувства долга</h1><p className="mt-4 text-sm leading-7 text-slate-300">Платформа временно уберёт некритичные пункты из «Сегодня», оставит одну цель недели и максимум две короткие задачи в день.</p></header>{recovery ? <section className="mt-6 rounded-[28px] border border-emerald-200 bg-emerald-50 p-7"><div className="text-sm font-black text-emerald-700">Режим восстановления активен до {formatDate(recovery.endsAt)}</div><h2 className="mt-3 text-2xl font-black text-emerald-950">{recovery.mainGoal}</h2><p className="mt-3 text-sm text-emerald-800">Ресурс: {recovery.weeklyMinutes} минут на неделю. Проверка ритма — {formatDate(recovery.reviewAt)}.</p><div className="mt-5 flex flex-wrap gap-3"><Link href="/student" className="rounded-xl bg-emerald-900 px-4 py-2.5 text-sm font-black text-white">Открыть короткую очередь</Link><FinishRecoveryButton /></div></section> : <RecoveryModeForm />}</div></main>;
}
