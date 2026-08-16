import Link from "next/link";
import { notFound } from "next/navigation";

import { CopyReportButton } from "@/components/homeworks/CopyReportButton";
import { PrintReportButton } from "@/components/reports/PrintReportButton";
import { requireTeacherPage } from "@/lib/access";
import { primaryToEgeTestScore } from "@/lib/egeScore";
import { prisma } from "@/lib/prisma";
import { getStudentAnalytics } from "@/lib/studentAnalytics";

type ParentReportPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ period?: string }>;
};

const REPORT_PERIODS = [
  { value: "all", label: "За всё время" },
  { value: "7d", label: "Последние 7 дней" },
  { value: "30d", label: "Последние 30 дней" },
  { value: "month", label: "Текущий месяц" },
] as const;

type ReportPeriod = (typeof REPORT_PERIODS)[number]["value"];

function getReportPeriod(value: string | undefined): ReportPeriod {
  return value === "7d" || value === "30d" || value === "month" ? value : "all";
}

function getPeriodInfo(period: ReportPeriod, now = new Date()) {
  if (period === "all") return { start: null as Date | null, end: now, label: "за всё время" };
  if (period === "month") return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now, label: "за текущий месяц" };
  const start = new Date(now);
  start.setDate(start.getDate() - (period === "7d" ? 7 : 30));
  return { start, end: now, label: period === "7d" ? "за последние 7 дней" : "за последние 30 дней" };
}

function inPeriod(value: Date | null, start: Date | null, end: Date) {
  if (!value) return false;
  return (!start || value >= start) && value <= end;
}

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
  if (!value) return "—";
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function percent(part: number, total: number) {
  return total === 0 ? 0 : Math.round((part / total) * 100);
}

function formatMinutes(minutes: number) {
  if (minutes < 60) return `${minutes} мин`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} ч ${rest} мин` : `${hours} ч`;
}

function resultTone(value: number) {
  if (value >= 80) return "bg-emerald-50 text-emerald-800";
  if (value >= 50) return "bg-amber-50 text-amber-800";
  return "bg-rose-50 text-rose-800";
}

export default async function ParentReportPage({ params, searchParams }: ParentReportPageProps) {
  await requireTeacherPage();
  const { id } = await params;
  const query = await searchParams;
  const now = new Date();
  const selectedPeriod = getReportPeriod(query.period);
  const period = getPeriodInfo(selectedPeriod, now);

  const student = await prisma.user.findFirst({
    where: { id, role: "STUDENT" },
    include: {
      preparationProfile: true,
      courseEnrollments: {
        where: { isActive: true, course: { status: "PUBLISHED" } },
        take: 1,
        orderBy: { joinedAt: "desc" },
        include: {
          course: {
            include: {
              modules: { orderBy: { order: "asc" } },
              scheduleItems: { orderBy: { scheduledFor: "asc" } },
            },
          },
        },
      },
      diagnosticAttempts: {
        where: { status: "COMPLETED" },
        take: 1,
        orderBy: { completedAt: "desc" },
      },
      assignedHomeworks: {
        where: { homework: { status: { not: "ARCHIVED" } } },
        include: { homework: { include: { tasks: true } } },
        orderBy: { assignedAt: "desc" },
      },
      attempts: {
        where: { status: "SUBMITTED", homework: { status: { not: "ARCHIVED" } } },
        include: {
          homework: { select: { id: true, title: true, deadline: true } },
          answers: {
            select: { isCorrect: true, taskRevision: { select: { egeNumber: true } } },
          },
        },
        orderBy: { submittedAt: "desc" },
      },
      variantAttempts: {
        where: { status: "SUBMITTED" },
        include: { variant: { select: { title: true } } },
        orderBy: { submittedAt: "desc" },
      },
      practiceAttempts: {
        include: { taskRevision: { select: { egeNumber: true } } },
        orderBy: { createdAt: "desc" },
      },
      webinarViews: {
        include: { webinar: { select: { title: true, egeNumber: true } } },
        orderBy: { lastViewedAt: "desc" },
      },
      activitySessions: { orderBy: { lastSeenAt: "desc" } },
      errorCorrections: { orderBy: { updatedAt: "desc" } },
    },
  });

  if (!student) notFound();

  const analytics = await getStudentAnalytics(student.id, "all");
  const latestAttemptByHomework = new Map<string, (typeof student.attempts)[number]>();
  for (const attempt of student.attempts) {
    if (!latestAttemptByHomework.has(attempt.homeworkId)) latestAttemptByHomework.set(attempt.homeworkId, attempt);
  }

  const homeworkRows = student.assignedHomeworks
    .map((assignment) => ({
      assignment,
      attempt: latestAttemptByHomework.get(assignment.homeworkId) ?? null,
    }))
    .filter(({ assignment, attempt }) =>
      selectedPeriod === "all" ||
      inPeriod(assignment.assignedAt, period.start, period.end) ||
      inPeriod(assignment.homework.deadline, period.start, period.end) ||
      inPeriod(attempt?.submittedAt ?? null, period.start, period.end),
    );
  const submittedHomeworks = homeworkRows.filter((item) => item.attempt);
  const overdueHomeworks = homeworkRows.filter(
    (item) => !item.attempt && item.assignment.homework.deadline && item.assignment.homework.deadline < now,
  );
  const homeworkAverage = submittedHomeworks.length
    ? Math.round(submittedHomeworks.reduce((sum, item) => sum + (item.attempt?.percent ?? 0), 0) / submittedHomeworks.length)
    : 0;
  const onTimeHomeworks = submittedHomeworks.filter((item) =>
    !item.assignment.homework.deadline || Boolean(item.attempt?.submittedAt && item.attempt.submittedAt <= item.assignment.homework.deadline),
  );

  const variants = student.variantAttempts.filter((item) =>
    inPeriod(item.submittedAt, period.start, period.end),
  );
  const practice = student.practiceAttempts.filter((item) =>
    inPeriod(item.createdAt, period.start, period.end),
  );
  const webinarViews = student.webinarViews.filter((item) =>
    inPeriod(item.lastViewedAt, period.start, period.end),
  );
  const sessions = student.activitySessions.filter((item) =>
    inPeriod(item.lastSeenAt, period.start, period.end),
  );
  const activityMinutes = Math.round(
    sessions.reduce(
      (sum, item) => sum + Math.max(0, item.lastSeenAt.getTime() - item.startedAt.getTime()),
      0,
    ) / 60_000,
  );
  const activeDays = new Set(
    sessions.map((item) =>
      new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Moscow" }).format(item.startedAt),
    ),
  ).size;

  const course = student.courseEnrollments[0]?.course ?? null;
  const currentModule = course?.modules.find((item) => item.startDate <= now && item.endDate >= now) ?? null;
  const passedCourseItems = course?.scheduleItems.filter((item) => item.scheduledFor < now).length ?? 0;
  const calendarProgress = percent(passedCourseItems, course?.scheduleItems.length ?? 0);
  const latestVariant = student.variantAttempts[0] ?? null;
  const masteredSkills = analytics.skills.filter((item) => item.status === "MASTERED");
  const focusSkills = analytics.focusSkills;
  const openCorrections = student.errorCorrections.filter((item) => item.status === "OPEN").length;
  const awaitingControl = student.errorCorrections.filter((item) => item.status === "CORRECTED").length;
  const verifiedCorrections = student.errorCorrections.filter((item) => item.status === "VERIFIED").length;

  const positiveSignals = [
    ...(homeworkRows.length > 0 && overdueHomeworks.length === 0 ? ["нет просроченных домашних заданий"] : []),
    ...(homeworkAverage >= 80 ? [`средний результат ДЗ ${homeworkAverage}%`] : []),
    ...(practice.length >= 5 ? [`${practice.length} ответов в личной практике`] : []),
    ...(masteredSkills.length > 0 ? [`${masteredSkills.length} навыков подтверждены`] : []),
  ];
  const attentionSignals = [
    ...(overdueHomeworks.length > 0 ? [`закрыть ${overdueHomeworks.length} просроченных ДЗ`] : []),
    ...(activeDays === 0 ? ["вернуть регулярную активность на платформе"] : []),
    ...(openCorrections > 0 ? [`исправить ${openCorrections} открытых ошибок`] : []),
    ...(focusSkills.length > 0 ? [`повторить задания ${focusSkills.map((item) => `№${item.egeNumber}`).join(", ")}`] : []),
  ];

  const conclusion = attentionSignals.length === 0
    ? "Подготовка идёт в рабочем ритме. Важно сохранить регулярность, продолжать идти по годовому курсу и закреплять уже освоенные темы."
    : `Главная задача на следующий период — ${attentionSignals.join("; ")}. Платформа и преподаватель уже видят эти точки и могут корректировать персональную отработку.`;

  const reportText = [
    `Отчёт о подготовке: ${student.name}`,
    `Период: ${period.label}`,
    `Дата: ${formatDate(now)}`,
    "",
    student.preparationProfile ? `Цель: ${student.preparationProfile.targetScore}+ баллов, ресурс ${formatMinutes(student.preparationProfile.weeklyMinutes)} в неделю` : "Цель и недельный ресурс пока не зафиксированы",
    course ? `Курс: ${course.title}${currentModule ? `, текущая тема «${currentModule.title}»` : ""}` : "Годовой курс пока не назначен",
    latestVariant ? `Последний пробник: ${primaryToEgeTestScore(latestVariant.score)}/100` : "Пробники пока не завершались",
    "",
    `Активность ${period.label}: ${activeDays} активных дней, ориентировочно ${formatMinutes(activityMinutes)} на платформе`,
    `Домашние задания: ${submittedHomeworks.length}/${homeworkRows.length} сдано, средний результат ${homeworkAverage}%`,
    `Личная практика: ${practice.length} ответов, ${percent(practice.filter((item) => item.isCorrect).length, practice.length)}% верно`,
    `Пробники: ${variants.length}`,
    `Открыто вебинаров: ${webinarViews.length}`,
    "",
    positiveSignals.length ? `Что получается: ${positiveSignals.join("; ")}.` : "Положительная динамика появится после накопления учебных действий.",
    `Вывод: ${conclusion}`,
  ].join("\n");

  return (
    <main className="min-h-screen bg-[#eef3f6] px-4 py-6 text-slate-950 print:bg-white print:px-0 print:py-0 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link href={`/teacher/students/${student.id}`} className="text-sm font-bold text-cyan-800">← К центру контроля</Link>
          <div className="flex flex-wrap gap-2"><CopyReportButton text={reportText} /><PrintReportButton /></div>
        </div>

        <section className="mb-5 rounded-3xl border border-white bg-white p-5 shadow-sm print:hidden">
          <div className="text-sm font-bold text-slate-600">Период отчёта</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {REPORT_PERIODS.map((item) => (
              <Link key={item.value} href={`/teacher/students/${student.id}/parent-report${item.value === "all" ? "" : `?period=${item.value}`}`} className={selectedPeriod === item.value ? "rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white" : "rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600"}>{item.label}</Link>
            ))}
          </div>
        </section>

        <article className="overflow-hidden rounded-[32px] bg-white shadow-sm print:rounded-none print:shadow-none">
          <header className="bg-[#092535] px-6 py-7 text-white print:bg-white print:px-0 print:text-slate-950 sm:px-9 sm:py-9">
            <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-cyan-300 print:text-cyan-700">Экзамен без багов · отчёт о подготовке</div>
            <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div><h1 className="text-3xl font-black tracking-[-0.04em] sm:text-4xl">{student.name}</h1><p className="mt-2 text-sm text-slate-300 print:text-slate-500">Состояние подготовки {period.label}</p></div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 print:border-slate-200 print:bg-slate-50"><div className="text-xs text-slate-400">Дата отчёта</div><div className="mt-1 font-bold">{formatDate(now)}</div></div>
            </div>
          </header>

          <div className="px-6 py-7 sm:px-9 sm:py-9 print:px-0">
            <section className="grid gap-3 md:grid-cols-3 print:grid-cols-3">
              <div className="rounded-2xl bg-cyan-50 p-4"><div className="text-xs font-bold text-cyan-700">Цель</div><div className="mt-2 text-3xl font-black text-cyan-950">{student.preparationProfile ? `${student.preparationProfile.targetScore}+` : "—"}</div><div className="mt-1 text-xs text-cyan-800">{student.preparationProfile ? `${formatMinutes(student.preparationProfile.weeklyMinutes)} в неделю` : "ещё не задана"}</div></div>
              <div className="rounded-2xl bg-violet-50 p-4"><div className="text-xs font-bold text-violet-700">Последний пробник</div><div className="mt-2 text-3xl font-black text-violet-950">{latestVariant ? `${primaryToEgeTestScore(latestVariant.score)}/100` : "—"}</div><div className="mt-1 text-xs text-violet-800">{latestVariant ? formatDate(latestVariant.submittedAt) : "пока не завершал"}</div></div>
              <div className="rounded-2xl bg-emerald-50 p-4"><div className="text-xs font-bold text-emerald-700">Общая точность</div><div className="mt-2 text-3xl font-black text-emerald-950">{analytics.accuracy}%</div><div className="mt-1 text-xs text-emerald-800">по независимым ответам</div></div>
            </section>

            <section className="mt-6 rounded-3xl border border-slate-200 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-black">Годовой курс</h2><p className="mt-1 text-sm text-slate-500">{course?.title ?? "Курс пока не назначен"}</p></div><span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">Календарная точка {calendarProgress}%</span></div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-cyan-500" style={{ width: `${calendarProgress}%` }} /></div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl bg-slate-50 p-4"><div className="text-xs text-slate-500">Текущий модуль</div><div className="mt-1 font-bold">{currentModule?.title ?? "Сейчас между модулями"}</div></div><div className="rounded-2xl bg-slate-50 p-4"><div className="text-xs text-slate-500">Стартовая диагностика</div><div className="mt-1 font-bold">{student.diagnosticAttempts[0] ? `${student.diagnosticAttempts[0].score}/${student.diagnosticAttempts[0].maxScore}` : "ещё не завершена"}</div></div></div>
            </section>

            <section className="mt-6">
              <h2 className="text-xl font-black">Учебный ритм {period.label}</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5 print:grid-cols-5">
                {[
                  { label: "Активных дней", value: String(activeDays), note: formatMinutes(activityMinutes) },
                  { label: "ДЗ сдано", value: `${submittedHomeworks.length}/${homeworkRows.length}`, note: `${homeworkAverage}% в среднем` },
                  { label: "Личная практика", value: String(practice.length), note: `${percent(practice.filter((item) => item.isCorrect).length, practice.length)}% верно` },
                  { label: "Пробники", value: String(variants.length), note: variants[0] ? `${primaryToEgeTestScore(variants[0].score)}/100 последний` : "нет за период" },
                  { label: "Вебинары", value: String(webinarViews.length), note: "страниц открыто" },
                ].map((item) => <div key={item.label} className="rounded-2xl bg-slate-50 p-4"><div className="text-xs text-slate-500">{item.label}</div><div className="mt-1 text-2xl font-black">{item.value}</div><div className="mt-1 text-[11px] text-slate-400">{item.note}</div></div>)}
              </div>
              <p className="mt-3 text-xs leading-5 text-slate-400">Время на платформе является оценочным. Открытие вебинара подтверждает доступ к записи и материалам, но не гарантирует полный досмотр внешнего видео.</p>
            </section>

            <section className="mt-6 grid gap-4 lg:grid-cols-2 print:grid-cols-2">
              <article className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5"><h2 className="text-lg font-black text-emerald-950">Что получается</h2>{positiveSignals.length ? <ul className="mt-3 space-y-2 text-sm leading-6 text-emerald-900">{positiveSignals.map((item) => <li key={item}>✓ {item}</li>)}</ul> : <p className="mt-3 text-sm leading-6 text-emerald-900">Для уверенного вывода нужно накопить больше выполненных работ.</p>}</article>
              <article className="rounded-3xl border border-amber-200 bg-amber-50 p-5"><h2 className="text-lg font-black text-amber-950">Что требует внимания</h2>{attentionSignals.length ? <ul className="mt-3 space-y-2 text-sm leading-6 text-amber-900">{attentionSignals.map((item) => <li key={item}>→ {item}</li>)}</ul> : <p className="mt-3 text-sm leading-6 text-amber-900">Критических вопросов на текущий момент нет.</p>}</article>
            </section>

            <section className="mt-6 rounded-3xl bg-[#092535] p-6 text-white print:border print:border-slate-200 print:bg-white print:text-slate-950"><div className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300 print:text-cyan-700">Итог преподавателю и родителю</div><p className="mt-3 text-sm leading-7 text-slate-200 print:text-slate-700">{conclusion}</p></section>

            <section className="mt-7 border-t border-slate-200 pt-6">
              <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-black">Домашние задания</h2><p className="mt-1 text-sm text-slate-500">Краткая детализация за выбранный период.</p></div><span className="text-xs font-bold text-slate-500">Вовремя: {onTimeHomeworks.length}/{submittedHomeworks.length}</span></div>
              {homeworkRows.length === 0 ? <div className="mt-4 rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">В выбранном периоде домашних заданий нет.</div> : <div className="mt-4 space-y-2">{homeworkRows.map(({ assignment, attempt }) => { const weakNumbers = attempt ? Array.from(new Set(attempt.answers.filter((item) => !item.isCorrect).map((item) => item.taskRevision.egeNumber))).sort((a, b) => a - b) : []; return <div key={assignment.id} className="flex flex-col gap-2 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="font-bold">{assignment.homework.title}</div><div className="mt-1 text-xs text-slate-500">Срок {formatDate(assignment.homework.deadline)}{weakNumbers.length ? ` · повторить ${weakNumbers.map((item) => `№${item}`).join(", ")}` : ""}</div></div><span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${attempt ? resultTone(attempt.percent) : "bg-rose-50 text-rose-800"}`}>{attempt ? `${Math.round(attempt.percent)}% · ${attempt.score}/${attempt.maxScore}` : "Не сдано"}</span></div>; })}</div>}
            </section>

            <section className="mt-7 grid gap-4 border-t border-slate-200 pt-6 lg:grid-cols-2 print:grid-cols-2">
              <div><h2 className="text-xl font-black">Актуальный профиль навыков</h2><p className="mt-1 text-sm text-slate-500">Состояние за всё время, а не только за период отчёта.</p><div className="mt-4 flex flex-wrap gap-2">{masteredSkills.length ? masteredSkills.slice(0, 10).map((item) => <span key={item.egeNumber} className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800">№{item.egeNumber} освоено</span>) : <span className="text-sm text-slate-500">Подтверждённых навыков пока нет.</span>}</div></div>
              <div><h2 className="text-xl font-black">Работа над ошибками</h2><div className="mt-4 grid grid-cols-3 gap-2"><div className="rounded-2xl bg-rose-50 p-3 text-center"><div className="text-xl font-black text-rose-900">{openCorrections}</div><div className="text-[10px] text-rose-700">открыто</div></div><div className="rounded-2xl bg-amber-50 p-3 text-center"><div className="text-xl font-black text-amber-900">{awaitingControl}</div><div className="text-[10px] text-amber-700">ждут контроля</div></div><div className="rounded-2xl bg-emerald-50 p-3 text-center"><div className="text-xl font-black text-emerald-900">{verifiedCorrections}</div><div className="text-[10px] text-emerald-700">подтверждено</div></div></div></div>
            </section>

            {variants.length > 0 ? <section className="mt-7 border-t border-slate-200 pt-6"><h2 className="text-xl font-black">Пробники за период</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">{variants.map((item) => <div key={item.id} className="rounded-2xl border border-slate-200 p-4"><div className="font-bold">{item.variant.title}</div><div className="mt-3 flex items-end justify-between"><div><div className="text-3xl font-black">{primaryToEgeTestScore(item.score)}/100</div><div className="mt-1 text-xs text-slate-500">{item.score}/{item.maxScore} первичных</div></div><div className="text-xs text-slate-400">{formatDate(item.submittedAt)}</div></div></div>)}</div></section> : null}

            <footer className="mt-8 border-t border-slate-200 pt-5 text-xs leading-5 text-slate-400">Отчёт сформирован автоматически по данным платформы «Экзамен без багов». Последнее обновление: {formatDateTime(now)}. Период: {period.label}.</footer>
          </div>
        </article>
      </div>
    </main>
  );
}
