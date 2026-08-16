import Link from "next/link";

import { LogoutButton } from "@/components/LogoutButton";
import { StudyPlanSummaryCard } from "@/components/student/StudyPlanSummaryCard";
import { TodayItemActions } from "@/components/student/TodayItemActions";
import { toStudyPlanView } from "@/lib/ai/studyPlanView";
import { getCurrentUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { getStudentBacklog, getStudentToday, type TodayItem } from "@/lib/studentDashboard";
import { getStudentJourneyOverview } from "@/lib/studentJourney";
import { getMoscowDayRange } from "@/lib/coursePolicy";
import { getGenericVideoEmbedUrl } from "@/lib/webinarVideo";

export const dynamic = "force-dynamic";

const sections = [
  { href: "/student/route", label: "Курс", title: "Маршрут до экзамена", description: "Единая авторская программа: темы, последовательность и контрольные точки.", accent: "bg-cyan-50 text-cyan-800" },
  { href: "/student/skills", label: "Карта", title: "Навыки и зависимости", description: "Что подтверждено, что изучать сейчас и какая база нужна дальше.", accent: "bg-violet-50 text-violet-800" },
  { href: "/student/calendar", label: "Ритм", title: "Календарь", description: "Дедлайны, учебные недели и честное перепланирование ресурса.", accent: "bg-amber-50 text-amber-800" },
  { href: "/student/errors", label: "Коррекция", title: "Исправление ошибок", description: "Причина ошибки, повторное решение и контроль через неделю.", accent: "bg-rose-50 text-rose-800" },
  { href: "/student/study-plan", label: "Учитель", title: "Ближайший спринт", description: "Подтверждённые учителем персональные шаги на ближайший период.", accent: "bg-emerald-50 text-emerald-800" },
  { href: "/student/homeworks", label: "Практика", title: "Домашние задания", description: "Назначенные работы, дедлайны, ответы и результаты.", accent: "bg-cyan-50 text-cyan-800" },
  { href: "/student/trainer", label: "Тренажёр", title: "Отработать номер", description: "Целенаправленная практика по выбранному номеру ЕГЭ.", accent: "bg-violet-50 text-violet-800" },
  { href: "/student/variants", label: "Экзамен", title: "Полные варианты", description: "27 заданий, таймер, автосохранение и разбор результата.", accent: "bg-amber-50 text-amber-800" },
  { href: "/student/results", label: "Динамика", title: "Результаты", description: "Готовность, слабые номера и подтверждённое освоение.", accent: "bg-emerald-50 text-emerald-800" },
  { href: "/student/webinars", label: "Материалы", title: "Вебинары и конспекты", description: "Записи, презентации, шпаргалки и материалы курса.", accent: "bg-sky-50 text-sky-800" },
] as const;

const toneByKind: Record<TodayItem["kind"], { label: string; badge: string; border: string }> = {
  THEORY: { label: "Теория", badge: "bg-sky-100 text-sky-800", border: "border-sky-200" },
  PRACTICE: { label: "Практика", badge: "bg-violet-100 text-violet-800", border: "border-violet-200" },
  HOMEWORK: { label: "Домашняя работа", badge: "bg-amber-100 text-amber-800", border: "border-amber-200" },
  WEBINAR: { label: "Вебинар", badge: "bg-cyan-100 text-cyan-800", border: "border-cyan-200" },
  VARIANT: { label: "Вариант", badge: "bg-emerald-100 text-emerald-800", border: "border-emerald-200" },
  CONTROL: { label: "Контроль", badge: "bg-rose-100 text-rose-800", border: "border-rose-200" },
  ERROR_REVIEW: { label: "Работа над ошибками", badge: "bg-rose-100 text-rose-800", border: "border-rose-200" },
  OTHER: { label: "По графику", badge: "bg-slate-100 text-slate-700", border: "border-slate-200" },
};

function formatWebinarDate(value: Date) {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

export default async function StudentPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const now = new Date();
  const tomorrow = getMoscowDayRange(now).end;

  const [todayItems, backlogItems, upcomingWebinars, studyPlanRecord, journey] = await Promise.all([
    getStudentToday(user.id, now),
    getStudentBacklog(user.id, now),
    prisma.webinarSchedule.findMany({
      where: { isPublished: true, scheduledAt: { gte: tomorrow } },
      orderBy: { scheduledAt: "asc" },
      take: 4,
    }),
    prisma.studentStudyPlan.findFirst({
      where: { studentId: user.id, status: "CONFIRMED" },
      orderBy: { confirmedAt: "desc" },
      include: {
        generation: { select: { provider: true } },
        practiceAttempts: {
          select: {
            studyPlanActionIndex: true,
            studyPlanAttemptKind: true,
            errorCause: true,
            isCorrect: true,
            countsForMastery: true,
            createdAt: true,
          },
        },
      },
    }),
    getStudentJourneyOverview(user.id),
  ]);
  const studyPlan = studyPlanRecord ? toStudyPlanView(studyPlanRecord) : null;
  const firstName = user.name.trim().split(" ")[0] || "Ученик";
  const onboardingUrl = env.ONBOARDING_VIDEO_URL;
  const onboardingEmbedUrl = onboardingUrl ? getGenericVideoEmbedUrl(onboardingUrl) : null;
  const startSteps = [Boolean(journey.profile), journey.diagnostic?.status === "COMPLETED", Boolean(journey.course)];
  const completedStartSteps = startSteps.filter(Boolean).length;

  return (
    <main className="min-h-screen bg-[#f3f7fa] px-4 py-4 text-[#102638] sm:px-6 lg:px-8 lg:py-6">
      <div className="mx-auto max-w-[1240px]">
        <header className="flex items-center justify-between gap-4 rounded-3xl border border-white bg-white/90 px-4 py-3 shadow-sm backdrop-blur sm:px-5">
          <Link href="/student" className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#0b2436] font-mono text-sm font-bold text-cyan-300">{"</>"}</span>
            <span><span className="block text-sm font-black sm:text-base">Экзамен без багов</span><span className="hidden font-mono text-[10px] uppercase tracking-[0.16em] text-slate-400 sm:block">student.workspace</span></span>
          </Link>
          <div className="flex items-center gap-3"><div className="hidden text-right md:block"><div className="text-sm font-bold">{user.name}</div><div className="text-xs text-slate-400">{user.email}</div></div><div className="[&_button]:rounded-xl [&_button]:border [&_button]:border-slate-200 [&_button]:bg-white [&_button]:px-3 [&_button]:py-2 [&_button]:text-sm [&_button]:font-bold [&_button]:text-slate-600"><LogoutButton /></div></div>
        </header>

        <section className="mt-5 overflow-hidden rounded-[32px] bg-[#092535] px-6 py-7 text-white shadow-xl sm:px-8 lg:px-10 lg:py-9">
          <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
            <div><div className="font-mono text-[11px] uppercase tracking-[0.18em] text-cyan-300">dashboard.today</div><h1 className="mt-3 text-3xl font-black tracking-[-0.04em] sm:text-5xl">{firstName}, вот план курса на сегодня.</h1><p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">Здесь собраны учебные действия из годового графика и опубликованные вебинары на текущую дату. Рекомендации и долги не подменяют основной план.</p></div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="flex items-center justify-between"><span className="text-xs font-bold text-slate-300">Самостоятельный старт</span><span className="font-mono text-xs text-cyan-300">{completedStartSteps}/3</span></div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-cyan-300" style={{ width: `${(completedStartSteps / 3) * 100}%` }} /></div>
              <ol className="mt-4 space-y-2 text-xs">{["Цель и ресурс", "Единый входной контроль", "Годовой курс опубликован"].map((label, index) => <li key={label} className={startSteps[index] ? "text-emerald-300" : "text-slate-300"}>{startSteps[index] ? "✓" : `${index + 1}.`} {label}</li>)}</ol>
              {completedStartSteps < 3 ? <Link href={!journey.profile ? "/student/start" : journey.diagnostic?.status !== "COMPLETED" ? "/student/diagnostic" : "/student/route"} className="mt-4 inline-flex rounded-xl bg-cyan-300 px-4 py-2.5 text-xs font-black text-slate-950">Продолжить старт →</Link> : <p className="mt-4 text-xs leading-5 text-emerald-200">Старт завершён. Ваш прогресс оценивается внутри авторского курса.</p>}
            </div>
          </div>
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(330px,0.65fr)]">
          <article className="rounded-[30px] border border-white bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div><div className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-700">course.schedule.today</div><h2 className="mt-2 text-2xl font-black">Сегодня</h2><p className="mt-1 text-sm text-slate-500">Только пункты, которые стоят в календаре курса на сегодняшнюю дату.</p></div>
              <div className="flex gap-2">{journey.recovery ? <Link href="/student/recovery" className="rounded-xl bg-fuchsia-50 px-3 py-2 text-xs font-black text-fuchsia-800">Режим восстановления</Link> : null}<Link href="/student/calendar" className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700">Весь календарь</Link></div>
            </div>
            {todayItems.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-emerald-200 bg-emerald-50 p-6"><h3 className="text-lg font-black text-emerald-900">По графику на сегодня всё ✓</h3><p className="mt-2 text-sm leading-6 text-emerald-800">Дополнительных обязательных действий система не добавляет. Можно отдохнуть или открыть материалы курса по желанию.</p><Link href="/student/route" className="mt-4 inline-flex rounded-xl bg-emerald-900 px-4 py-2.5 text-sm font-bold text-white">Посмотреть маршрут</Link></div>
            ) : (
              <div className="mt-5 space-y-3">
                {todayItems.map((item, index) => {
                  const tone = toneByKind[item.kind];
                  return <article key={item.key} className={`rounded-2xl border ${tone.border} bg-slate-50/70 p-4 sm:p-5`}><div className="flex gap-4"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-sm font-black shadow-sm">{index + 1}</div><div className="min-w-0 flex-1"><span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${tone.badge}`}>{tone.label} · ~{item.estimatedMinutes} мин</span><h3 className="mt-2 text-base font-black sm:text-lg">{item.title}</h3><p className="mt-1 text-sm leading-6 text-slate-500">{item.description}</p><details className="mt-2 text-xs leading-5 text-slate-500"><summary className="cursor-pointer font-bold text-cyan-800">Почему это сейчас?</summary><p className="mt-1">{item.why}</p></details><TodayItemActions itemKey={item.key} href={item.href} action={item.action} external={item.external} allowSnooze={false} helpNote={`Нужна помощь по пункту курса «${item.title}»`} /></div></div></article>;
                })}
              </div>
            )}
          </article>

          <aside className="space-y-5">
            <article className="rounded-[30px] border border-white bg-white p-5 shadow-sm sm:p-6"><div className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-700">teacher.authored.route</div><h2 className="mt-2 text-2xl font-black">{journey.course?.title || "Годовой курс"}</h2>{journey.course ? <><p className="mt-3 text-sm leading-6 text-slate-500">Единая последовательность тем и дат, которую ведёт преподаватель.</p>{journey.profile ? <div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-cyan-50 p-4"><div className="text-xs text-cyan-700">Ваша цель</div><div className="mt-1 text-2xl font-black text-cyan-950">{journey.profile.targetScore}+</div></div><div className="rounded-2xl bg-violet-50 p-4"><div className="text-xs text-violet-700">Ваш ресурс</div><div className="mt-1 text-2xl font-black text-violet-950">{Math.round(journey.profile.weeklyMinutes / 60)} ч/нед.</div></div></div> : null}<div className="mt-4 flex flex-wrap gap-2"><Link href="/student/route" className="rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white">Весь маршрут</Link><Link href="/student/skills" className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-black text-slate-700">Карта навыков</Link></div></> : <p className="mt-3 text-sm leading-6 text-slate-500">Преподаватель ещё готовит общий маршрут курса.</p>}</article>
            <article className="rounded-[30px] border border-white bg-white p-5 shadow-sm sm:p-6"><div className="font-mono text-[10px] uppercase tracking-[0.18em] text-violet-700">onboarding.help</div><h2 className="mt-2 text-xl font-black">Как устроена платформа</h2><p className="mt-2 text-sm leading-6 text-slate-500">Короткая инструкция по ДЗ, тренажёру, вариантам и статистике.</p>{onboardingEmbedUrl && onboardingUrl ? <><div className="mt-4 overflow-hidden rounded-2xl bg-slate-950"><div className="aspect-video"><iframe src={onboardingEmbedUrl} title="Как пользоваться платформой" className="h-full w-full" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share" allowFullScreen /></div></div><a href={onboardingUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-xs font-bold text-violet-700">Открыть отдельно →</a></> : <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-xs leading-5 text-slate-500">Видео появится после добавления ссылки преподавателем.</div>}</article>
          </aside>
        </section>

        {backlogItems.length > 0 ? <section className="mt-5 rounded-[28px] border border-amber-200 bg-amber-50 p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="font-mono text-[10px] uppercase tracking-[0.18em] text-amber-700">separate.backlog</div><h2 className="mt-2 text-xl font-black text-amber-950">Нужно обсудить или перепланировать</h2><p className="mt-1 text-sm leading-6 text-amber-800">Эти долги не подмешиваются в «Сегодня». Закройте их отдельно или попросите учителя помочь с восстановлением.</p></div><Link href="/student/recovery" className="rounded-xl bg-white px-4 py-2.5 text-xs font-black text-amber-900">Режим восстановления</Link></div><div className="mt-4 grid gap-3 md:grid-cols-2">{backlogItems.map((item) => <Link key={item.key} href={item.href} className="rounded-2xl border border-amber-200 bg-white p-4 transition hover:border-amber-400"><div className="text-xs font-bold text-amber-700">{item.description}</div><div className="mt-1 font-black text-slate-950">{item.title}</div></Link>)}</div></section> : null}

        {studyPlan ? <section className="mt-5"><div className="mb-3 px-1"><h2 className="text-xl font-black">Ближайший спринт от учителя</h2><p className="mt-1 text-sm text-slate-500">Это короткая персональная поддержка. Она дополняет, но не перестраивает общий годовой курс.</p></div><StudyPlanSummaryCard plan={studyPlan} /></section> : null}

        <section className="mt-8">
          <div className="flex flex-wrap items-end justify-between gap-4"><div><div className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-700">workspace</div><h2 className="mt-2 text-2xl font-black">Все разделы</h2></div><Link href="/student/telegram" className="rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-2.5 text-sm font-bold text-cyan-800">✈ Напоминания в Telegram</Link></div>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">{sections.map((section) => <Link key={section.href} href={section.href} className="group rounded-[24px] border border-white bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-cyan-200 hover:shadow-md"><span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${section.accent}`}>{section.label}</span><h3 className="mt-4 text-lg font-black">{section.title}</h3><p className="mt-2 min-h-16 text-sm leading-6 text-slate-500">{section.description}</p><div className="mt-4 border-t border-slate-100 pt-3 text-sm font-bold group-hover:text-cyan-800">Открыть →</div></Link>)}</div>
        </section>

        {upcomingWebinars.length > 0 ? <section className="mt-8 rounded-[30px] border border-white bg-white p-5 shadow-sm sm:p-6"><div className="flex items-end justify-between"><div><div className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-700">live.schedule</div><h2 className="mt-2 text-2xl font-black">Ближайшие вебинары</h2></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500">МСК</span></div><div className="mt-5 grid gap-3 md:grid-cols-2">{upcomingWebinars.map((webinar) => <a key={webinar.id} href={webinar.joinUrl} target="_blank" rel="noreferrer" className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-cyan-300 hover:bg-cyan-50"><div className="text-xs font-bold text-cyan-700">{formatWebinarDate(webinar.scheduledAt)} МСК</div><div className="mt-2 font-black">{webinar.topic}</div>{webinar.announcement ? <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">{webinar.announcement}</p> : null}</a>)}</div></section> : null}
        <footer className="flex flex-col gap-2 px-1 py-8 text-xs text-slate-400 sm:flex-row sm:justify-between"><span>© Экзамен без багов</span><span className="font-mono">preparation_system: active</span></footer>
      </div>
    </main>
  );
}
