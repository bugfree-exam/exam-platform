import Link from "next/link";

import { CalendarReplanForm } from "@/components/student/CalendarReplanForm";
import { requireStudentPage } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { getStudentJourneyOverview } from "@/lib/studentJourney";

export const dynamic = "force-dynamic";
function formatDate(value: Date) { return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short", timeZone: "Europe/Moscow" }).format(value); }

export default async function StudentCalendarPage() {
  const user = await requireStudentPage();
  const [journey, homeworks, variants, decisions] = await Promise.all([
    getStudentJourneyOverview(user.id),
    prisma.homeworkAssignment.findMany({ where: { studentId: user.id, homework: { status: "ASSIGNED", deadline: { not: null } } }, select: { id: true, homework: { select: { id: true, title: true, deadline: true } } }, orderBy: { homework: { deadline: "asc" } }, take: 20 }),
    prisma.variantAssignment.findMany({ where: { studentId: user.id, deadline: { not: null } }, select: { id: true, deadline: true, variant: { select: { id: true, title: true } } }, orderBy: { deadline: "asc" }, take: 20 }),
    prisma.studentQueueDecision.findMany({ where: { studentId: user.id, state: "SNOOZED", scheduledFor: { not: null } }, orderBy: { scheduledFor: "asc" }, take: 20 }),
  ]);
  if (!journey.profile) return <main className="min-h-screen bg-[#f3f7fa] p-8"><div className="mx-auto max-w-3xl rounded-3xl bg-white p-8"><h1 className="text-3xl font-black">Календарю нужны ваши настройки</h1><Link href="/student/start" className="mt-5 inline-flex rounded-xl bg-cyan-700 px-4 py-3 text-sm font-black text-white">Настроить подготовку →</Link></div></main>;
  const events = [
    ...(journey.roadmap?.milestones.map((item) => ({ key: item.id, date: item.weekStart, title: item.title, type: "Маршрут", href: "/student/route" })) ?? []),
    ...homeworks.flatMap((item) => item.homework.deadline ? [{ key: item.id, date: item.homework.deadline, title: item.homework.title, type: "ДЗ", href: `/student/homeworks/${item.homework.id}` }] : []),
    ...variants.flatMap((item) => item.deadline ? [{ key: item.id, date: item.deadline, title: item.variant.title, type: "Вариант", href: `/student/variants/${item.variant.id}` }] : []),
    ...decisions.flatMap((item) => item.scheduledFor ? [{ key: item.id, date: item.scheduledFor, title: item.note || "Перенесённая задача", type: "Перенос", href: "/student" }] : []),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());
  return <main className="min-h-screen bg-[#f3f7fa] px-4 py-6 text-[#102638] sm:px-6"><div className="mx-auto max-w-5xl"><Link href="/student" className="text-sm font-bold text-cyan-700">← В кабинет</Link><header className="mt-4 rounded-[32px] bg-[#092535] p-7 text-white sm:p-10"><div className="font-mono text-[11px] uppercase tracking-[0.18em] text-cyan-300">schedule.replan</div><h1 className="mt-3 text-3xl font-black sm:text-5xl">Календарь подготовки</h1><p className="mt-4 text-sm leading-7 text-slate-300">Дедлайн — сигнал к планированию, а не штраф. Если ресурс изменился, пересоберите будущие недели честно.</p></header><section className="mt-6 rounded-[28px] bg-white p-6"><h2 className="text-xl font-black">Изменился график?</h2><p className="mt-2 text-sm text-slate-500">Прошлая версия маршрута сохранится в истории, а новая учтёт актуальный недельный ресурс.</p><CalendarReplanForm weeklyMinutes={journey.profile.weeklyMinutes} /></section><section className="mt-6 space-y-3">{events.length ? events.map((event) => <Link key={`${event.type}-${event.key}`} href={event.href} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-cyan-300"><div className="w-16 shrink-0 text-center"><div className="text-lg font-black">{formatDate(event.date)}</div></div><div className="min-w-0"><span className="text-[10px] font-black uppercase tracking-wide text-cyan-700">{event.type}</span><h2 className="truncate font-black">{event.title}</h2></div></Link>) : <div className="rounded-2xl bg-white p-8 text-center text-slate-500">Событий пока нет. Завершите диагностику, чтобы построить маршрут.</div>}</section></div></main>;
}
