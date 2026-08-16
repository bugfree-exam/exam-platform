import Link from "next/link";
import { notFound } from "next/navigation";

import { StudentAccessCard } from "@/components/teacher/StudentAccessCard";
import { StudentAccountActions } from "@/components/teacher/StudentAccountActions";
import { StudentControlSection } from "@/components/teacher/StudentControlSection";
import { StudentHelpRequests } from "@/components/teacher/StudentHelpRequests";
import { StudentStudyPlanCard } from "@/components/teacher/StudentStudyPlanCard";
import { requireTeacherPage } from "@/lib/access";
import { formatAnswerForDisplay } from "@/lib/answer";
import { toStudyPlanView } from "@/lib/ai/studyPlanView";
import { primaryToEgeTestScore } from "@/lib/egeScore";
import { MASTERY_LABELS } from "@/lib/mastery";
import { prisma } from "@/lib/prisma";
import { getStudentAnalytics } from "@/lib/studentAnalytics";
import { getMoscowWeekRange } from "@/lib/studentOverviewPolicy";

type TeacherStudentPageProps = {
  params: Promise<{ id: string }>;
};

function formatDate(value: Date | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(value);
}

function formatDateTime(value: Date | null) {
  if (!value) return "Пока не зафиксирована";
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function getRelativeActivity(value: Date | null, now = new Date()) {
  if (!value) return "ещё не заходил";
  const minutes = Math.max(0, Math.floor((now.getTime() - value.getTime()) / 60_000));
  if (minutes < 1) return "только что";
  if (minutes < 60) return `${minutes} мин назад`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ч назад`;
  const days = Math.floor(hours / 24);
  return days < 30 ? `${days} дн. назад` : formatDate(value);
}

function formatMinutes(minutes: number) {
  if (minutes < 60) return `${minutes} мин`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} ч ${rest} мин` : `${hours} ч`;
}

function percent(part: number, total: number) {
  return total === 0 ? 0 : Math.round((part / total) * 100);
}

function resultTone(value: number) {
  if (value >= 80) return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (value >= 50) return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-rose-200 bg-rose-50 text-rose-800";
}

function activityPathLabel(path: string | null) {
  if (!path) return "страница не определена";
  if (path === "/student") return "главная";
  if (path.startsWith("/student/homeworks")) return "домашние задания";
  if (path.startsWith("/student/variants")) return "пробники";
  if (path.startsWith("/student/trainer")) return "тренажёр";
  if (path.startsWith("/student/webinars")) return "вебинары";
  if (path.startsWith("/student/errors")) return "исправление ошибок";
  return path;
}

export default async function TeacherStudentPage({ params }: TeacherStudentPageProps) {
  await requireTeacherPage();
  const { id } = await params;
  const now = new Date();
  const week = getMoscowWeekRange(now);

  const student = await prisma.user.findFirst({
    where: { id, role: "STUDENT" },
    include: {
      assignedHomeworks: {
        include: { homework: { include: { tasks: true } } },
        orderBy: { assignedAt: "desc" },
      },
      attempts: {
        where: { status: "SUBMITTED" },
        include: {
          homework: { select: { id: true, title: true, deadline: true } },
          answers: {
            include: {
              taskRevision: {
                select: { id: true, egeNumber: true, title: true, correctAnswer: true },
              },
            },
          },
        },
        orderBy: { submittedAt: "desc" },
      },
      variantAssignments: {
        include: { variant: { select: { id: true, title: true } } },
        orderBy: { assignedAt: "desc" },
      },
      variantAttempts: {
        where: { status: "SUBMITTED" },
        include: {
          variant: { select: { id: true, title: true } },
          answers: { select: { isCorrect: true, countsForMastery: true } },
        },
        orderBy: { submittedAt: "desc" },
      },
      practiceAttempts: {
        orderBy: { createdAt: "desc" },
        take: 120,
        include: { taskRevision: { select: { egeNumber: true, title: true } } },
      },
      webinarViews: {
        orderBy: { lastViewedAt: "desc" },
        include: {
          webinar: { select: { id: true, title: true, eventDate: true, egeNumber: true } },
        },
      },
      activitySessions: {
        where: { lastSeenAt: { gte: week.start, lt: week.end } },
        orderBy: { lastSeenAt: "desc" },
      },
      errorCorrections: {
        orderBy: { updatedAt: "desc" },
        include: { taskRevision: { select: { egeNumber: true, title: true } } },
      },
      studyPlans: {
        take: 20,
        orderBy: { createdAt: "desc" },
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
      },
      preparationProfile: true,
      courseEnrollments: {
        where: { isActive: true, course: { status: "PUBLISHED" } },
        take: 1,
        orderBy: { joinedAt: "desc" },
        include: {
          course: {
            include: {
              modules: { orderBy: { order: "asc" } },
              scheduleItems: { orderBy: [{ scheduledFor: "asc" }, { order: "asc" }] },
            },
          },
        },
      },
      diagnosticAttempts: { take: 1, orderBy: { startedAt: "desc" } },
      queueDecisions: {
        where: { state: "HELP_REQUESTED" },
        orderBy: { helpRequestedAt: "desc" },
        take: 10,
      },
      recoveryPeriods: {
        where: { status: "ACTIVE", endsAt: { gte: now } },
        orderBy: { startedAt: "desc" },
        take: 1,
      },
    },
  });

  if (!student) notFound();

  const [analytics, practiceTotal, practiceCorrect, practiceWeek, practiceWeekCorrect, publishedWebinars] =
    await Promise.all([
      getStudentAnalytics(student.id, "all"),
      prisma.practiceAttempt.count({ where: { studentId: student.id } }),
      prisma.practiceAttempt.count({ where: { studentId: student.id, isCorrect: true } }),
      prisma.practiceAttempt.count({
        where: { studentId: student.id, createdAt: { gte: week.start, lt: week.end } },
      }),
      prisma.practiceAttempt.count({
        where: {
          studentId: student.id,
          isCorrect: true,
          createdAt: { gte: week.start, lt: week.end },
        },
      }),
      prisma.webinar.count({ where: { status: "PUBLISHED" } }),
    ]);

  const latestHomeworkAttempt = new Map<string, (typeof student.attempts)[number]>();
  for (const attempt of student.attempts) {
    if (!latestHomeworkAttempt.has(attempt.homeworkId)) latestHomeworkAttempt.set(attempt.homeworkId, attempt);
  }
  const completedHomeworks = student.assignedHomeworks.filter((item) =>
    latestHomeworkAttempt.has(item.homeworkId),
  );
  const pendingHomeworks = student.assignedHomeworks.filter(
    (item) => !latestHomeworkAttempt.has(item.homeworkId),
  );
  const overdueHomeworks = pendingHomeworks.filter(
    (item) => item.homework.deadline && item.homework.deadline < now,
  );
  const onTimeHomeworks = completedHomeworks.filter((item) => {
    const attempt = latestHomeworkAttempt.get(item.homeworkId);
    return !item.homework.deadline || Boolean(attempt?.submittedAt && attempt.submittedAt <= item.homework.deadline);
  });

  const latestVariantAttempt = new Map<string, (typeof student.variantAttempts)[number]>();
  for (const attempt of student.variantAttempts) {
    if (!latestVariantAttempt.has(attempt.variantId)) latestVariantAttempt.set(attempt.variantId, attempt);
  }
  const overdueVariants = student.variantAssignments.filter(
    (item) => item.deadline && item.deadline < now && !latestVariantAttempt.has(item.variantId),
  );

  const activeCourse = student.courseEnrollments[0]?.course ?? null;
  const currentModule = activeCourse?.modules.find(
    (module) => module.startDate <= now && module.endDate >= now,
  );
  const passedCourseItems = activeCourse?.scheduleItems.filter((item) => item.scheduledFor < now).length ?? 0;
  const courseItemsTotal = activeCourse?.scheduleItems.length ?? 0;
  const calendarProgress = percent(passedCourseItems, courseItemsTotal);
  const plannedWeekMinutes =
    activeCourse?.scheduleItems
      .filter((item) => item.scheduledFor >= week.start && item.scheduledFor < week.end)
      .reduce((sum, item) => sum + item.estimatedMinutes, 0) ?? 0;

  const onlineMinutes = Math.round(
    student.activitySessions.reduce(
      (sum, session) => sum + Math.max(0, session.lastSeenAt.getTime() - session.startedAt.getTime()),
      0,
    ) / 60_000,
  );
  const activeDays = new Set(
    student.activitySessions.map((session) =>
      new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Moscow" }).format(session.startedAt),
    ),
  ).size;
  const weeklyPageViews = student.activitySessions.reduce((sum, item) => sum + item.pageViews, 0);

  const openCorrections = student.errorCorrections.filter((item) => item.status === "OPEN");
  const correctedCorrections = student.errorCorrections.filter((item) => item.status === "CORRECTED");
  const verifiedCorrections = student.errorCorrections.filter((item) => item.status === "VERIFIED");
  const masteredSkills = analytics.skills.filter((skill) => skill.status === "MASTERED").length;
  const riskSkills = analytics.skills.filter(
    (skill) => skill.status === "CRITICAL_GAP" || skill.status === "PRACTICE",
  );
  const homeworkAverage =
    student.attempts.length === 0
      ? 0
      : Math.round(student.attempts.reduce((sum, item) => sum + item.percent, 0) / student.attempts.length);
  const lastVariant = student.variantAttempts[0] ?? null;
  const inactiveDays = student.lastActivityAt
    ? Math.floor((now.getTime() - student.lastActivityAt.getTime()) / (24 * 60 * 60 * 1000))
    : null;

  const alerts = [
    ...(inactiveDays === null || inactiveDays >= 7
      ? [{ tone: "rose", title: "Нет регулярной активности", text: inactiveDays === null ? "Ученик ещё не входил на платформу." : `Последняя активность была ${inactiveDays} дн. назад.` }]
      : []),
    ...(overdueHomeworks.length + overdueVariants.length > 0
      ? [{ tone: "amber", title: "Есть просрочки", text: `${overdueHomeworks.length} ДЗ и ${overdueVariants.length} пробников требуют решения или перепланирования.` }]
      : []),
    ...(student.queueDecisions.length > 0
      ? [{ tone: "violet", title: "Ученик запросил помощь", text: `${student.queueDecisions.length} открытых запросов ожидают ответа.` }]
      : []),
    ...(openCorrections.length > 0
      ? [{ tone: "cyan", title: "Не завершена работа над ошибками", text: `${openCorrections.length} ошибок ещё не прошли повторное решение.` }]
      : []),
  ];

  const studyPlans = student.studyPlans.map(toStudyPlanView);

  return (
    <main className="min-h-screen bg-[#eef3f6] px-4 py-5 text-slate-950 sm:px-6 sm:py-7">
      <div className="mx-auto max-w-[1440px]">
        <header className="overflow-hidden rounded-[30px] bg-[#092535] text-white shadow-xl">
          <div className="grid gap-6 px-5 py-6 sm:px-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:px-9 lg:py-8">
            <div>
              <Link href="/teacher/students" className="text-sm font-bold text-cyan-200 hover:text-white">← Все ученики</Link>
              <div className="mt-5 flex items-start gap-4">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/10 text-xl font-black text-cyan-200">
                  {student.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "У"}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300">student.control.center</span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-bold text-slate-200">
                      {student.studentStatus === "ACTIVE" ? "Активен" : student.studentStatus === "FROZEN" ? "Заморожен" : "В архиве"}
                    </span>
                  </div>
                  <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl">{student.name}</h1>
                  <p className="mt-2 text-sm text-slate-300">{student.email} · был на платформе {getRelativeActivity(student.lastActivityAt, now)}</p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={`/teacher/students/${student.id}/activity`} className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-bold hover:bg-white/10">Полный лог активности</Link>
              <Link href={`/teacher/students/${student.id}/parent-report`} className="rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-black text-slate-950 hover:bg-cyan-200">Отчёт для родителя →</Link>
            </div>
          </div>
        </header>

        <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {[
            { label: "Общая точность", value: `${analytics.accuracy}%`, note: `${analytics.correctAnswers} из ${analytics.totalAnswers} независимых ответов` },
            { label: "Домашние задания", value: `${completedHomeworks.length}/${student.assignedHomeworks.length}`, note: `${overdueHomeworks.length} просрочено` },
            { label: "Последний пробник", value: lastVariant ? `${primaryToEgeTestScore(lastVariant.score)}/100` : "—", note: lastVariant ? formatDate(lastVariant.submittedAt) : "пока не завершал" },
            { label: "Тренажёр за неделю", value: String(practiceWeek), note: `${percent(practiceWeekCorrect, practiceWeek)}% верных ответов` },
            { label: "Освоено навыков", value: `${masteredSkills}/27`, note: `${riskSkills.length} требуют внимания` },
          ].map((item) => (
            <article key={item.label} className="rounded-2xl border border-white bg-white p-4 shadow-sm"><div className="text-xs font-bold text-slate-500">{item.label}</div><div className="mt-2 text-3xl font-black tracking-[-0.04em]">{item.value}</div><div className="mt-2 text-xs leading-5 text-slate-400">{item.note}</div></article>
          ))}
        </section>

        {alerts.length > 0 ? (
          <section className="mt-5 grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
            {alerts.map((alert) => (
              <article key={alert.title} className={`rounded-2xl border p-4 ${alert.tone === "rose" ? "border-rose-200 bg-rose-50 text-rose-950" : alert.tone === "amber" ? "border-amber-200 bg-amber-50 text-amber-950" : alert.tone === "violet" ? "border-violet-200 bg-violet-50 text-violet-950" : "border-cyan-200 bg-cyan-50 text-cyan-950"}`}>
                <div className="font-black">{alert.title}</div><p className="mt-1 text-xs leading-5 opacity-80">{alert.text}</p>
              </article>
            ))}
          </section>
        ) : (
          <section className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-900">Критических сигналов нет: ученик активен, просрочки и незакрытые запросы отсутствуют.</section>
        )}

        <section className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <article className="rounded-3xl border border-white bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-700">preparation.context</div><h2 className="mt-2 text-xl font-black">Цель, курс и текущая неделя</h2></div>{student.recoveryPeriods[0] ? <span className="rounded-full bg-fuchsia-100 px-3 py-1.5 text-xs font-bold text-fuchsia-800">Восстановление до {formatDate(student.recoveryPeriods[0].endsAt)}</span> : null}</div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl bg-cyan-50 p-4"><div className="text-xs font-bold text-cyan-700">Цель</div><div className="mt-2 text-2xl font-black text-cyan-950">{student.preparationProfile ? `${student.preparationProfile.targetScore}+` : "Не задана"}</div><div className="mt-1 text-xs text-cyan-800">{student.preparationProfile ? `экзамен ${formatDate(student.preparationProfile.examDate)}` : "онбординг не завершён"}</div></div>
              <div className="rounded-2xl bg-violet-50 p-4"><div className="text-xs font-bold text-violet-700">Ресурс ученика</div><div className="mt-2 text-2xl font-black text-violet-950">{student.preparationProfile ? formatMinutes(student.preparationProfile.weeklyMinutes) : "—"}</div><div className="mt-1 text-xs text-violet-800">на неделю</div></div>
              <div className="rounded-2xl bg-amber-50 p-4"><div className="text-xs font-bold text-amber-700">План курса</div><div className="mt-2 text-2xl font-black text-amber-950">{formatMinutes(plannedWeekMinutes)}</div><div className="mt-1 text-xs text-amber-800">в календаре этой недели</div></div>
              <div className="rounded-2xl bg-emerald-50 p-4"><div className="text-xs font-bold text-emerald-700">На платформе</div><div className="mt-2 text-2xl font-black text-emerald-950">{formatMinutes(onlineMinutes)}</div><div className="mt-1 text-xs text-emerald-800">{activeDays} активных дней · оценочно</div></div>
            </div>
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="flex flex-wrap items-center justify-between gap-2 text-sm"><span className="font-bold">{activeCourse?.title ?? "Годовой курс не назначен"}</span><span className="text-xs text-slate-500">Календарная точка: {calendarProgress}%</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-cyan-500" style={{ width: `${calendarProgress}%` }} /></div><div className="mt-2 text-xs text-slate-500">{currentModule ? `Текущий модуль: ${currentModule.title} · до ${formatDate(currentModule.endDate)}` : activeCourse ? "Сейчас между модулями курса." : "После назначения курса здесь появится текущий модуль."}</div></div>
            {student.recoveryPeriods[0] ? <div className="mt-4 rounded-2xl border border-fuchsia-200 bg-fuchsia-50 p-4 text-sm text-fuchsia-950"><strong>Цель восстановления:</strong> {student.recoveryPeriods[0].mainGoal} · ресурс {formatMinutes(student.recoveryPeriods[0].weeklyMinutes)} · проверка {formatDateTime(student.recoveryPeriods[0].reviewAt)}.</div> : null}
          </article>

          <div className="space-y-4">
            <StudentHelpRequests studentId={student.id} requests={student.queueDecisions.map((item) => ({ id: item.id, note: item.note }))} />
            <article className="rounded-3xl border border-white bg-white p-5 shadow-sm"><div className="text-xs font-bold text-slate-500">Входная диагностика</div>{student.diagnosticAttempts[0]?.status === "COMPLETED" ? <><div className="mt-2 text-3xl font-black">{student.diagnosticAttempts[0].score}/{student.diagnosticAttempts[0].maxScore}</div><p className="mt-2 text-xs text-slate-500">Стартовая точка зафиксирована {formatDate(student.diagnosticAttempts[0].completedAt)}.</p></> : <div className="mt-2 text-sm font-bold text-amber-800">{student.diagnosticAttempts[0] ? "Начата, но не завершена" : "Ещё не начата"}</div>}</article>
          </div>
        </section>

        <div className="mt-5 space-y-4">
          <StudentControlSection title="Домашние задания" description="Выдача, дедлайны, своевременность и последний результат по каждой работе." badge={`${completedHomeworks.length}/${student.assignedHomeworks.length} выполнено`} defaultOpen>
            <div className="mb-5 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-slate-50 p-4"><div className="text-xs text-slate-500">Средний результат</div><div className="mt-1 text-2xl font-black">{homeworkAverage}%</div></div><div className="rounded-2xl bg-slate-50 p-4"><div className="text-xs text-slate-500">Сданы вовремя</div><div className="mt-1 text-2xl font-black">{onTimeHomeworks.length}/{completedHomeworks.length}</div></div><div className="rounded-2xl bg-slate-50 p-4"><div className="text-xs text-slate-500">Просрочены</div><div className="mt-1 text-2xl font-black text-rose-700">{overdueHomeworks.length}</div></div></div>
            {student.assignedHomeworks.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-7 text-center text-sm text-slate-500">Домашние задания ещё не выдавались.</div> : <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{student.assignedHomeworks.map((assignment) => { const attempt = latestHomeworkAttempt.get(assignment.homeworkId); const isOverdue = !attempt && Boolean(assignment.homework.deadline && assignment.homework.deadline < now); return <Link key={assignment.id} href={`/teacher/homeworks/${assignment.homeworkId}`} className="rounded-2xl border border-slate-200 p-4 transition hover:border-cyan-300 hover:bg-cyan-50/30"><div className="flex items-start justify-between gap-3"><div className="font-bold">{assignment.homework.title}</div><span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-bold ${attempt ? resultTone(attempt.percent) : isOverdue ? "border-rose-200 bg-rose-50 text-rose-700" : "border-slate-200 bg-slate-100 text-slate-600"}`}>{attempt ? `${Math.round(attempt.percent)}%` : isOverdue ? "Просрочено" : "Ожидает"}</span></div><div className="mt-3 text-xs leading-5 text-slate-500">{assignment.homework.tasks.length} заданий · срок {formatDate(assignment.homework.deadline)}</div>{attempt ? <div className="mt-2 text-xs font-semibold text-slate-700">Сдано {formatDateTime(attempt.submittedAt)} · {attempt.score}/{attempt.maxScore}</div> : null}</Link>; })}</div>}
          </StudentControlSection>

          <StudentControlSection title="Пробные варианты" description="Назначенные пробники, сроки, первичный и тестовый балл ЕГЭ." badge={`${student.variantAttempts.length} завершено`}>
            {student.variantAssignments.length === 0 && student.variantAttempts.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-7 text-center text-sm text-slate-500">Пробники ещё не назначались и не решались.</div> : <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{student.variantAssignments.map((assignment) => { const attempt = latestVariantAttempt.get(assignment.variantId); const overdue = !attempt && Boolean(assignment.deadline && assignment.deadline < now); return <article key={assignment.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><div className="font-bold">{assignment.variant.title}</div><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${attempt ? "bg-emerald-50 text-emerald-800" : overdue ? "bg-rose-50 text-rose-800" : "bg-slate-100 text-slate-600"}`}>{attempt ? `${primaryToEgeTestScore(attempt.score)}/100` : overdue ? "Просрочен" : "Назначен"}</span></div><div className="mt-3 text-xs text-slate-500">Срок {formatDate(assignment.deadline)}</div>{attempt ? <Link href={`/teacher/variants/attempts/${attempt.id}`} className="mt-3 inline-flex text-sm font-black text-cyan-800">Открыть ответы →</Link> : null}</article>; })}{student.variantAttempts.filter((attempt) => !student.variantAssignments.some((item) => item.variantId === attempt.variantId)).map((attempt) => <Link key={attempt.id} href={`/teacher/variants/attempts/${attempt.id}`} className="rounded-2xl border border-slate-200 p-4 hover:border-cyan-300"><div className="font-bold">{attempt.variant.title}</div><div className="mt-3 text-2xl font-black">{primaryToEgeTestScore(attempt.score)}/100</div><div className="mt-1 text-xs text-slate-500">Самостоятельно · {attempt.score}/{attempt.maxScore} · {formatDate(attempt.submittedAt)}</div></Link>)}</div>}
          </StudentControlSection>

          <StudentControlSection title="Персональная отработка" description="Самостоятельные ответы в тренажёре и работа внутри ближайшего спринта." badge={`${practiceTotal} ответов · ${percent(practiceCorrect, practiceTotal)}% верно`}>
            <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-violet-50 p-4"><div className="text-xs text-violet-700">За всё время</div><div className="mt-1 text-2xl font-black text-violet-950">{practiceTotal}</div></div><div className="rounded-2xl bg-cyan-50 p-4"><div className="text-xs text-cyan-700">На этой неделе</div><div className="mt-1 text-2xl font-black text-cyan-950">{practiceWeek}</div></div><div className="rounded-2xl bg-emerald-50 p-4"><div className="text-xs text-emerald-700">Точность недели</div><div className="mt-1 text-2xl font-black text-emerald-950">{percent(practiceWeekCorrect, practiceWeek)}%</div></div></div>
            <div className="mt-5 space-y-2">{student.practiceAttempts.slice(0, 30).map((attempt) => <div key={attempt.id} className="flex flex-col gap-2 rounded-2xl border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="font-semibold">№{attempt.taskRevision.egeNumber}. {attempt.taskRevision.title}</div><div className="mt-1 text-xs text-slate-500">{formatDateTime(attempt.createdAt)}{attempt.studyPlanId ? " · ближайший спринт" : " · самостоятельный тренажёр"}</div></div><span className={`w-fit rounded-full px-2.5 py-1 text-xs font-bold ${attempt.isCorrect ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>{attempt.isCorrect ? "Верно" : "Ошибка"}</span></div>)}{student.practiceAttempts.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">В тренажёре пока нет ответов.</div> : null}</div>
          </StudentControlSection>

          <StudentControlSection title="Вебинары и материалы" description="Фиксируются открытия страниц вебинаров, но не гарантированный досмотр внешнего видео." badge={`${student.webinarViews.length}/${publishedWebinars} открыто`}>
            {student.webinarViews.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-7 text-center text-sm text-slate-500">После деплоя здесь появятся вебинары, страницы которых открывал ученик.</div> : <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{student.webinarViews.map((view) => <article key={view.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><div className="font-bold">{view.webinar.title}</div><span className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-bold text-sky-800">{view.viewCount} откр.</span></div><div className="mt-3 text-xs leading-5 text-slate-500">Впервые {formatDateTime(view.firstViewedAt)}<br />Последний раз {formatDateTime(view.lastViewedAt)}</div>{view.webinar.egeNumber ? <div className="mt-2 text-xs font-bold text-violet-700">ЕГЭ №{view.webinar.egeNumber}</div> : null}</article>)}</div>}
          </StudentControlSection>

          <StudentControlSection title="Навыки и зависимости" description="Единая аналитика по независимым ответам из ДЗ, тренажёра, диагностики и пробников." badge={`${masteredSkills} освоено · ${riskSkills.length} в фокусе`}>
            {analytics.skills.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 p-7 text-center text-sm text-slate-500">Пока недостаточно ответов для карты освоения.</div> : <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-7">{analytics.skills.map((skill) => <article key={skill.egeNumber} className="rounded-2xl border border-slate-200 bg-slate-50 p-3"><div className="flex items-start justify-between gap-2"><div className="text-lg font-black">№{skill.egeNumber}</div><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${skill.status === "MASTERED" ? "bg-emerald-100 text-emerald-800" : skill.status === "CRITICAL_GAP" ? "bg-rose-100 text-rose-800" : skill.status === "PRACTICE" ? "bg-orange-100 text-orange-800" : "bg-slate-200 text-slate-700"}`}>{skill.percent}%</span></div><div className="mt-2 text-[11px] font-bold text-slate-600">{MASTERY_LABELS[skill.status]}</div><div className="mt-1 text-[10px] text-slate-400">{skill.correct}/{skill.total} верно</div></article>)}</div>}
          </StudentControlSection>

          <StudentControlSection title="Исправление ошибок" description="Открытые ошибки, повторно решённые задачи и контрольные подтверждения." badge={`${openCorrections.length} открыто · ${verifiedCorrections.length} подтверждено`}>
            <div className="mb-5 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-rose-50 p-4"><div className="text-xs text-rose-700">Нужно исправить</div><div className="mt-1 text-2xl font-black text-rose-950">{openCorrections.length}</div></div><div className="rounded-2xl bg-amber-50 p-4"><div className="text-xs text-amber-700">Ждут контроля</div><div className="mt-1 text-2xl font-black text-amber-950">{correctedCorrections.length}</div></div><div className="rounded-2xl bg-emerald-50 p-4"><div className="text-xs text-emerald-700">Подтверждено</div><div className="mt-1 text-2xl font-black text-emerald-950">{verifiedCorrections.length}</div></div></div>
            <div className="space-y-2">{student.errorCorrections.slice(0, 40).map((item) => <article key={item.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><div className="font-bold">№{item.taskRevision.egeNumber}. {item.taskRevision.title}</div><div className="mt-1 text-xs text-slate-500">{item.errorCause ? `Причина: ${item.errorCause}` : "Причина ещё не указана"}{item.scheduledFor ? ` · контроль ${formatDate(item.scheduledFor)}` : ""}</div></div><span className={`w-fit rounded-full px-2.5 py-1 text-xs font-bold ${item.status === "VERIFIED" ? "bg-emerald-50 text-emerald-800" : item.status === "CORRECTED" ? "bg-amber-50 text-amber-800" : "bg-rose-50 text-rose-800"}`}>{item.status === "VERIFIED" ? "Подтверждено" : item.status === "CORRECTED" ? "Исправлено" : "Открыто"}</span></div></article>)}{student.errorCorrections.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">Ошибки для отдельной коррекции пока не зафиксированы.</div> : null}</div>
          </StudentControlSection>

          <StudentControlSection title="Активность на платформе" description="Сессии текущей недели: время оценочно учитывается только при активной вкладке." badge={`${activeDays} дней · ${formatMinutes(onlineMinutes)}`}>
            <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-slate-50 p-4"><div className="text-xs text-slate-500">Сессий</div><div className="mt-1 text-2xl font-black">{student.activitySessions.length}</div></div><div className="rounded-2xl bg-slate-50 p-4"><div className="text-xs text-slate-500">Активных дней</div><div className="mt-1 text-2xl font-black">{activeDays}</div></div><div className="rounded-2xl bg-slate-50 p-4"><div className="text-xs text-slate-500">Переходов</div><div className="mt-1 text-2xl font-black">{weeklyPageViews}</div></div></div>
            <div className="mt-5 space-y-2">{student.activitySessions.map((session) => <div key={session.id} className="flex flex-col gap-1 rounded-2xl border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between"><div className="font-semibold">{formatDateTime(session.startedAt)}</div><div className="text-xs text-slate-500">{formatMinutes(Math.max(1, Math.round((session.lastSeenAt.getTime() - session.startedAt.getTime()) / 60_000)))} · {session.pageViews} переходов · {activityPathLabel(session.lastPath)}</div></div>)}{student.activitySessions.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">На этой неделе сессий не зафиксировано.</div> : null}</div><Link href={`/teacher/students/${student.id}/activity`} className="mt-4 inline-flex text-sm font-black text-cyan-800">Открыть полный журнал →</Link>
          </StudentControlSection>

          <StudentControlSection title="Ближайший спринт" description="Персональный короткий план: генерация, редактирование, публикация и прогресс контроля." badge={studyPlans[0] ? `${studyPlans[0].progress.percent}% текущего плана` : "не создан"}>
            <StudentStudyPlanCard studentId={student.id} initialPlans={studyPlans} />
          </StudentControlSection>

          <StudentControlSection title="Подробная история ответов в ДЗ" description="Ответ ученика и эталон по каждой отправленной попытке." badge={`${student.attempts.length} попыток`}>
            <div className="space-y-3">{student.attempts.map((attempt, index) => <details key={attempt.id} className="group overflow-hidden rounded-2xl border border-slate-200 open:border-cyan-200"><summary className="cursor-pointer list-none p-4 [&::-webkit-details-marker]:hidden"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="font-bold">{index + 1}. {attempt.homework.title}</div><div className="mt-1 text-xs text-slate-500">{formatDateTime(attempt.submittedAt)} · {attempt.answers.filter((item) => item.isCorrect).length}/{attempt.answers.length} верно</div></div><span className={`w-fit rounded-full border px-3 py-1 text-xs font-bold ${resultTone(attempt.percent)}`}>{Math.round(attempt.percent)}% · {attempt.score}/{attempt.maxScore}</span></div></summary><div className="space-y-3 border-t border-slate-200 bg-slate-50 p-4">{attempt.answers.map((answer) => <article key={answer.id} className={`rounded-2xl border p-4 ${answer.isCorrect ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}`}><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0 flex-1"><div className="font-bold">№{answer.taskRevision.egeNumber}. {answer.taskRevision.title}</div><div className="mt-3 grid gap-2 md:grid-cols-2"><div className="rounded-xl bg-white/80 p-3"><div className="text-xs text-slate-400">Ответ ученика</div><div className="mt-1 break-words font-mono text-sm font-bold">{formatAnswerForDisplay(answer.rawAnswer)}</div></div><div className="rounded-xl bg-white/80 p-3"><div className="text-xs text-slate-400">Правильный ответ</div><div className="mt-1 break-words font-mono text-sm font-bold">{formatAnswerForDisplay(answer.taskRevision.correctAnswer)}</div></div></div></div><span className={`w-fit rounded-full px-2.5 py-1 text-xs font-bold ${answer.isCorrect ? "bg-emerald-700 text-white" : "bg-rose-700 text-white"}`}>{answer.isCorrect ? "Верно" : "Ошибка"}</span></div></article>)}</div></details>)}{student.attempts.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">Отправленных попыток пока нет.</div> : null}</div>
          </StudentControlSection>

          <StudentControlSection title="Доступ и управление аккаунтом" description="Пароль, доступ к вебинарам, заморозка и архивирование ученика.">
            <div className="grid gap-5 xl:grid-cols-[390px_minmax(0,1fr)]"><StudentAccessCard studentId={student.id} email={student.email} lastActivityLabel={formatDateTime(student.lastActivityAt)} /><StudentAccountActions studentId={student.id} studentName={student.name} studentEmail={student.email} studentStatus={student.studentStatus} archivedAt={student.archivedAt?.toISOString() ?? null} /></div>
          </StudentControlSection>
        </div>

        <footer className="px-1 py-8 text-xs text-slate-400">Полный контроль ученика · данные обновляются после учебных действий и следующего открытия страницы.</footer>
      </div>
    </main>
  );
}
