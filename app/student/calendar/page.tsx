import Link from "next/link";

import { CalendarReplanForm } from "@/components/student/CalendarReplanForm";
import { requireStudentPage } from "@/lib/access";
import { COURSE_ITEM_LABELS } from "@/lib/coursePolicy";
import { prisma } from "@/lib/prisma";
import { getStudentJourneyOverview } from "@/lib/studentJourney";

export const dynamic = "force-dynamic";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    timeZone: "Europe/Moscow",
  }).format(value);
}

function fallbackHref(type: string) {
  if (type === "HOMEWORK") return "/student/homeworks";
  if (type === "VARIANT" || type === "CONTROL") return "/student/variants";
  if (type === "ERROR_REVIEW") return "/student/errors";
  if (type === "PRACTICE") return "/student/trainer";
  return "/student/webinars";
}

export default async function StudentCalendarPage() {
  const user = await requireStudentPage();
  const [journey, homeworks, variants] = await Promise.all([
    getStudentJourneyOverview(user.id),
    prisma.homeworkAssignment.findMany({ where: { studentId: user.id, homework: { status: "ASSIGNED", deadline: { not: null } } }, select: { id: true, homework: { select: { id: true, title: true, deadline: true } } }, orderBy: { homework: { deadline: "asc" } }, take: 20 }),
    prisma.variantAssignment.findMany({ where: { studentId: user.id, deadline: { not: null } }, select: { id: true, deadline: true, variant: { select: { id: true, title: true } } }, orderBy: { deadline: "asc" }, take: 20 }),
  ]);

  const events = [
    ...(journey.course?.scheduleItems.map((item) => ({ key: item.id, date: item.scheduledFor, title: item.title, type: COURSE_ITEM_LABELS[item.type], href: item.href || fallbackHref(item.type), primary: true })) ?? []),
    ...homeworks.flatMap((item) => item.homework.deadline ? [{ key: item.id, date: item.homework.deadline, title: item.homework.title, type: "Дедлайн ДЗ", href: `/student/homeworks/${item.homework.id}`, primary: false }] : []),
    ...variants.flatMap((item) => item.deadline ? [{ key: item.id, date: item.deadline, title: item.variant.title, type: "Дедлайн варианта", href: `/student/variants/${item.variant.id}`, primary: false }] : []),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  return <main className="min-h-screen bg-[#f3f7fa] px-4 py-6 text-[#102638] sm:px-6"><div className="mx-auto max-w-5xl"><Link href="/student" className="text-sm font-bold text-cyan-700">← В кабинет</Link><header className="mt-4 rounded-[32px] bg-[#092535] p-7 text-white sm:p-10"><div className="font-mono text-[11px] uppercase tracking-[0.18em] text-cyan-300">teacher.course.calendar</div><h1 className="mt-3 text-3xl font-black sm:text-5xl">Календарь курса</h1><p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">Основной график един для группы и задаётся преподавателем. Персональные дедлайны показаны дополнительно, но не меняют программу курса.</p></header>{journey.profile ? <section className="mt-6 rounded-[28px] bg-white p-6"><h2 className="text-xl font-black">Изменился ваш доступный ресурс?</h2><p className="mt-2 text-sm leading-6 text-slate-500">Сообщите преподавателю. Курс не перестроится автоматически: учитель увидит запрос и поможет выбрать режим восстановления или персональное исключение.</p><CalendarReplanForm weeklyMinutes={journey.profile.weeklyMinutes} /></section> : null}<section className="mt-6 space-y-3">{events.length ? events.map((event) => <Link key={`${event.type}-${event.key}`} href={event.href} className={`flex items-center gap-4 rounded-2xl border bg-white p-4 transition hover:border-cyan-300 ${event.primary ? "border-cyan-100" : "border-slate-200"}`}><div className="w-16 shrink-0 text-center"><div className="text-lg font-black">{formatDate(event.date)}</div></div><div className="min-w-0"><span className={`text-[10px] font-black uppercase tracking-wide ${event.primary ? "text-cyan-700" : "text-slate-400"}`}>{event.type}</span><h2 className="truncate font-black">{event.title}</h2></div></Link>) : <div className="rounded-2xl bg-white p-8 text-center text-slate-500">Преподаватель ещё не опубликовал события курса.</div>}</section></div></main>;
}
