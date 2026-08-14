import Link from "next/link";

import { LogoutButton } from "@/components/LogoutButton";
import { StudyPlanSummaryCard } from "@/components/student/StudyPlanSummaryCard";
import { getCurrentUser } from "@/lib/auth";
import { toStudyPlanView } from "@/lib/ai/studyPlanView";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { getStudentToday, type TodayItem } from "@/lib/studentDashboard";
import { getGenericVideoEmbedUrl } from "@/lib/webinarVideo";

export const dynamic = "force-dynamic";

type StudentSection = {
  href: string;
  label: string;
  title: string;
  description: string;
  accent: string;
};

const studentSections: StudentSection[] = [
  {
    href: "/student/study-plan",
    label: "01 · Маршрут",
    title: "Ближайший спринт",
    description: "Персональные шаги от учителя и прогресс выполнения.",
    accent: "bg-cyan-50 text-cyan-800",
  },
  {
    href: "/student/homeworks",
    label: "02 · Практика",
    title: "Домашние задания",
    description: "Назначенные работы, дедлайны, ответы и результаты.",
    accent: "bg-cyan-50 text-cyan-800",
  },
  {
    href: "/student/trainer",
    label: "03 · Тренажёр",
    title: "Отработать номер",
    description: "Выберите номер ЕГЭ и решайте задания подряд.",
    accent: "bg-violet-50 text-violet-800",
  },
  {
    href: "/student/variants",
    label: "04 · Экзамен",
    title: "Полные варианты",
    description: "27 заданий, таймер, автосохранение и разбор результата.",
    accent: "bg-amber-50 text-amber-800",
  },
  {
    href: "/student/results",
    label: "05 · Аналитика",
    title: "Результаты и ошибки",
    description: "Готовность к ЕГЭ, слабые номера и динамика подготовки.",
    accent: "bg-emerald-50 text-emerald-800",
  },
  {
    href: "/student/webinars",
    label: "06 · Материалы",
    title: "Вебинары и конспекты",
    description: "Записи, презентации, шпаргалки и материалы курса.",
    accent: "bg-sky-50 text-sky-800",
  },
];

function todayTone(kind: TodayItem["kind"]) {
  if (kind === "OVERDUE") {
    return {
      badge: "bg-rose-100 text-rose-800",
      border: "border-rose-200",
      dot: "bg-rose-500",
      label: "Просрочено",
    };
  }

  if (kind === "DUE_SOON") {
    return {
      badge: "bg-amber-100 text-amber-800",
      border: "border-amber-200",
      dot: "bg-amber-500",
      label: "Скоро дедлайн",
    };
  }

  if (kind === "PRACTICE") {
    return {
      badge: "bg-violet-100 text-violet-800",
      border: "border-violet-200",
      dot: "bg-violet-500",
      label: "Рекомендация",
    };
  }

  if (kind === "WEBINAR") {
    return {
      badge: "bg-cyan-100 text-cyan-800",
      border: "border-cyan-200",
      dot: "bg-cyan-500",
      label: "Вебинар",
    };
  }

  return {
    badge: "bg-slate-100 text-slate-700",
    border: "border-slate-200",
    dot: "bg-slate-400",
    label: "Назначено",
  };
}

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

  const [todayItems, upcomingWebinars, studyPlanRecord] = await Promise.all([
    getStudentToday(user.id),
    prisma.webinarSchedule.findMany({
      where: {
        isPublished: true,
        scheduledAt: { gte: new Date() },
      },
      orderBy: { scheduledAt: "asc" },
      take: 4,
    }),
    prisma.studentStudyPlan.findFirst({
      where: {
        studentId: user.id,
        status: "CONFIRMED",
      },
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
  ]);
  const studyPlan = studyPlanRecord ? toStudyPlanView(studyPlanRecord) : null;

  const firstName = user.name.trim().split(" ")[0] || "Ученик";
  const onboardingUrl = env.ONBOARDING_VIDEO_URL;
  const onboardingEmbedUrl = onboardingUrl
    ? getGenericVideoEmbedUrl(onboardingUrl)
    : null;

  const overdueCount = todayItems.filter((item) => item.kind === "OVERDUE").length;
  const dueSoonCount = todayItems.filter((item) => item.kind === "DUE_SOON").length;

  return (
    <main className="min-h-screen bg-[#f3f7fa] px-4 py-4 text-[#102638] sm:px-6 lg:px-8 lg:py-6">
      <div className="mx-auto max-w-[1240px]">
        <header className="flex items-center justify-between gap-4 rounded-3xl border border-white bg-white/90 px-4 py-3 shadow-sm backdrop-blur sm:px-5">
          <Link href="/student" className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#0b2436] font-mono text-sm font-bold text-cyan-300">
              {"</>"}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-black sm:text-base">
                Экзамен без багов
              </span>
              <span className="hidden font-mono text-[10px] uppercase tracking-[0.16em] text-slate-400 sm:block">
                student.workspace
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <div className="hidden text-right md:block">
              <div className="text-sm font-bold">{user.name}</div>
              <div className="text-xs text-slate-400">{user.email}</div>
            </div>
            <div className="[&_button]:rounded-xl [&_button]:border [&_button]:border-slate-200 [&_button]:bg-white [&_button]:px-3 [&_button]:py-2 [&_button]:text-sm [&_button]:font-bold [&_button]:text-slate-600">
              <LogoutButton />
            </div>
          </div>
        </header>

        <section className="mt-5 overflow-hidden rounded-[32px] bg-[#092535] px-6 py-7 text-white shadow-xl sm:px-8 lg:px-10 lg:py-9">
          <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-cyan-300">
                dashboard.today
              </div>
              <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] sm:text-5xl">
                Привет, {firstName}. Вот что важно сегодня.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                Платформа собрала дедлайны, назначенные работы, слабые номера и
                ближайшие события в одном месте. Начните с верхнего пункта.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 lg:justify-end">
              {overdueCount > 0 ? (
                <span className="rounded-full border border-rose-300/20 bg-rose-300/10 px-3 py-1.5 text-xs font-bold text-rose-200">
                  {overdueCount} просрочено
                </span>
              ) : null}
              {dueSoonCount > 0 ? (
                <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1.5 text-xs font-bold text-amber-200">
                  {dueSoonCount} скоро дедлайн
                </span>
              ) : null}
              {overdueCount === 0 && dueSoonCount === 0 ? (
                <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-xs font-bold text-emerald-200">
                  критичных задач нет
                </span>
              ) : null}
            </div>
          </div>
        </section>

        {studyPlan ? <StudyPlanSummaryCard plan={studyPlan} /> : null}

        <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]">
          <article className="rounded-[30px] border border-white bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-700">
                  next.actions
                </div>
                <h2 className="mt-2 text-2xl font-black tracking-tight">Сегодня</h2>
              </div>
              <Link href="/student/results" className="text-sm font-bold text-cyan-700 hover:text-cyan-900">
                Открыть аналитику →
              </Link>
            </div>

            {todayItems.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-emerald-200 bg-emerald-50 p-6">
                <div className="text-lg font-black text-emerald-900">На сегодня всё закрыто ✓</div>
                <p className="mt-2 text-sm leading-6 text-emerald-800">
                  Нет просроченных или срочных работ. Можно закрепить слабый номер
                  в тренажёре или решить дополнительный вариант.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href="/student/trainer" className="rounded-xl bg-emerald-900 px-4 py-2.5 text-sm font-bold text-white">
                    Открыть тренажёр
                  </Link>
                  <Link href="/student/variants" className="rounded-xl border border-emerald-300 bg-white px-4 py-2.5 text-sm font-bold text-emerald-900">
                    Решить вариант
                  </Link>
                </div>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {todayItems.map((item, index) => {
                  const tone = todayTone(item.kind);
                  const isExternal = item.kind === "WEBINAR";

                  return (
                    <div key={item.key} className={`rounded-2xl border ${tone.border} bg-slate-50/70 p-4 sm:p-5`}>
                      <div className="flex gap-4">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-sm font-black shadow-sm">
                          {index + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${tone.badge}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
                              {tone.label}
                            </span>
                          </div>
                          <h3 className="mt-2 text-base font-black sm:text-lg">{item.title}</h3>
                          <p className="mt-1 text-sm leading-6 text-slate-500">{item.description}</p>
                          <Link
                            href={item.href}
                            target={isExternal ? "_blank" : undefined}
                            rel={isExternal ? "noreferrer" : undefined}
                            className="mt-3 inline-flex rounded-xl bg-[#0b2436] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-cyan-800"
                          >
                            {item.action} →
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </article>

          <aside className="rounded-[30px] border border-white bg-white p-5 shadow-sm sm:p-6">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-violet-700">
              onboarding
            </div>
            <h2 className="mt-2 text-2xl font-black tracking-tight">Как пользоваться платформой</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Короткая инструкция поможет быстро разобраться с ДЗ, тренажёром,
              вариантами и статистикой.
            </p>

            {onboardingEmbedUrl && onboardingUrl ? (
              <>
                <div className="mt-5 overflow-hidden rounded-2xl bg-slate-950 shadow-sm">
                  <div className="aspect-video">
                    <iframe
                      src={onboardingEmbedUrl}
                      title="Как пользоваться платформой"
                      className="h-full w-full"
                      allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  </div>
                </div>
                <a
                  href={onboardingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex text-sm font-bold text-violet-700 hover:text-violet-900"
                >
                  Открыть видео отдельно →
                </a>
              </>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-500">
                Видео появится здесь после добавления ссылки преподавателем.
              </div>
            )}
          </aside>
        </section>

        <section className="mt-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-700">workspace</div>
              <h2 className="mt-2 text-2xl font-black tracking-tight">Все разделы</h2>
            </div>
            <Link href="/student/telegram" className="rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-2.5 text-sm font-bold text-cyan-800">
              ✈ Напоминания в Telegram
            </Link>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {studentSections.map((section) => (
              <Link
                key={section.href}
                href={section.href}
                className="group rounded-[26px] border border-white bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-cyan-200 hover:shadow-md sm:p-6"
              >
                <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${section.accent}`}>
                  {section.label}
                </span>
                <h3 className="mt-5 text-xl font-black tracking-tight">{section.title}</h3>
                <p className="mt-2 min-h-12 text-sm leading-6 text-slate-500">{section.description}</p>
                <div className="mt-5 border-t border-slate-100 pt-4 text-sm font-bold text-[#102638] group-hover:text-cyan-800">
                  Открыть →
                </div>
              </Link>
            ))}
          </div>
        </section>

        {upcomingWebinars.length > 0 ? (
          <section className="mt-8 rounded-[30px] border border-white bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-700">live.schedule</div>
                <h2 className="mt-2 text-2xl font-black">Ближайшие вебинары</h2>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500">МСК</span>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {upcomingWebinars.map((webinar) => (
                <a
                  key={webinar.id}
                  href={webinar.joinUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-cyan-300 hover:bg-cyan-50"
                >
                  <div className="text-xs font-bold text-cyan-700">{formatWebinarDate(webinar.scheduledAt)} МСК</div>
                  <div className="mt-2 font-black">{webinar.topic}</div>
                  {webinar.announcement ? (
                    <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">{webinar.announcement}</p>
                  ) : null}
                </a>
              ))}
            </div>
          </section>
        ) : null}

        <footer className="flex flex-col gap-2 px-1 py-8 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <span>© Экзамен без багов</span>
          <span className="font-mono">preparation_system: active</span>
        </footer>
      </div>
    </main>
  );
}
