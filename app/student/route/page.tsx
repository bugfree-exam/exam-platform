import Link from "next/link";

import { requireStudentPage } from "@/lib/access";
import { COURSE_ITEM_LABELS } from "@/lib/coursePolicy";
import { getStudentJourneyOverview } from "@/lib/studentJourney";

export const dynamic = "force-dynamic";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(value);
}

function fallbackHref(type: string, egeNumbers: number[]) {
  if (type === "PRACTICE" && egeNumbers[0]) return `/student/trainer/${egeNumbers[0]}`;
  if (type === "HOMEWORK") return "/student/homeworks";
  if (type === "VARIANT" || type === "CONTROL") return "/student/variants";
  if (type === "ERROR_REVIEW") return "/student/errors";
  return "/student/webinars";
}

export default async function StudentRoutePage() {
  const user = await requireStudentPage();
  const journey = await getStudentJourneyOverview(user.id);

  if (!journey.course) {
    return <main className="min-h-screen bg-[#f3f7fa] px-4 py-8"><div className="mx-auto max-w-3xl rounded-[32px] bg-white p-8"><h1 className="text-3xl font-black">Годовой маршрут готовит преподаватель</h1><p className="mt-3 leading-7 text-slate-600">Когда курс будет опубликован, здесь появится единая последовательность тем, календарь и контрольные точки для всей группы.</p><Link href="/student" className="mt-6 inline-flex rounded-xl bg-cyan-700 px-5 py-3 text-sm font-black text-white">Вернуться в кабинет</Link></div></main>;
  }

  const now = new Date();
  return (
    <main className="min-h-screen bg-[#f3f7fa] px-4 py-6 text-[#102638] sm:px-6">
      <div className="mx-auto max-w-5xl">
        <Link href="/student" className="text-sm font-bold text-cyan-700">← В кабинет</Link>
        <header className="mt-4 rounded-[32px] bg-[#092535] p-7 text-white sm:p-10">
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-cyan-300">teacher.authored.route</div>
          <h1 className="mt-3 text-3xl font-black sm:text-5xl">{journey.course.title}</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">{journey.course.description || "Единый авторский маршрут курса: последовательность, даты и контрольные точки определяет преподаватель."}</p>
          <div className="mt-5 flex flex-wrap gap-3 text-xs font-bold"><span className="rounded-xl bg-white/10 px-3 py-2">{formatDate(journey.course.startDate)} — {formatDate(journey.course.endDate)}</span>{journey.profile ? <span className="rounded-xl bg-white/10 px-3 py-2">Личная цель: {journey.profile.targetScore}+ баллов</span> : null}<Link href="/student/calendar" className="rounded-xl bg-white px-3 py-2 text-slate-950">Открыть календарь</Link></div>
        </header>

        <section className="mt-6 rounded-2xl border border-cyan-200 bg-cyan-50 p-5 text-sm leading-6 text-cyan-950"><strong>Как работает персонализация:</strong> диагностика показывает ваши пробелы, а ошибки и восстановление помогают пройти этот маршрут. Сама программа и порядок тем остаются общими для курса.</section>

        <section className="mt-6 space-y-4">
          {journey.course.modules.map((module) => {
            const active = module.startDate <= now && module.endDate >= now;
            const numbers = module.egeNumbers as number[];
            return <article key={module.id} className={`rounded-[26px] border p-5 sm:p-6 ${active ? "border-cyan-300 bg-cyan-50" : "border-slate-200 bg-white"}`}><div className="flex gap-4"><div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl font-black ${active ? "bg-cyan-700 text-white" : "bg-slate-100 text-slate-600"}`}>{module.order}</div><div className="min-w-0 flex-1"><div className="text-xs font-bold uppercase tracking-wide text-slate-400">{formatDate(module.startDate)} — {formatDate(module.endDate)}{active ? " · сейчас" : ""}</div><h2 className="mt-1 text-xl font-black">{module.title}</h2>{module.description ? <p className="mt-2 text-sm leading-6 text-slate-600">{module.description}</p> : null}<div className="mt-3 flex flex-wrap gap-2">{numbers.map((number) => <span key={number} className="rounded-lg bg-white px-3 py-2 text-xs font-black text-cyan-800">Задание №{number}</span>)}</div>{module.scheduleItems.length ? <div className="mt-5 space-y-2 border-t border-slate-200 pt-4">{module.scheduleItems.map((item) => { const itemNumbers = item.egeNumbers as number[]; return <Link key={item.id} href={item.href || fallbackHref(item.type, itemNumbers)} className="flex flex-col gap-2 rounded-xl bg-white p-3 transition hover:shadow-sm sm:flex-row sm:items-center"><span className="w-32 shrink-0 text-xs font-black text-cyan-700">{formatDate(item.scheduledFor)}</span><span className="min-w-0 flex-1"><span className="block text-[10px] font-black uppercase tracking-wide text-slate-400">{COURSE_ITEM_LABELS[item.type]}</span><span className="block truncate font-bold">{item.title}</span></span><span className="text-sm font-black text-cyan-800">Открыть →</span></Link>; })}</div> : null}</div></div></article>;
          })}
        </section>
      </div>
    </main>
  );
}
