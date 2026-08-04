import {
  AttemptStatus,
  HomeworkStatus,
  StudentAccountStatus,
  UserRole,
  WebinarStatus,
} from "@prisma/client";
import Link from "next/link";

import { LogoutButton } from "@/components/LogoutButton";
import { requireTeacherPage } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function formatDateTime(value: Date | null) {
  if (!value) return "Дата не указана";

  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(value);
}

function getRelativeTime(value: Date | null, now: Date) {
  if (!value) return "Активность не зафиксирована";

  const minutes = Math.max(
    0,
    Math.floor((now.getTime() - value.getTime()) / 60_000)
  );

  if (minutes < 1) return "только что";
  if (minutes < 60) return `${minutes} мин. назад`;

  const hours = Math.floor(minutes / 60);

  if (hours < 24) return `${hours} ч. назад`;

  const days = Math.floor(hours / 24);

  if (days === 1) return "вчера";
  if (days < 30) return `${days} дн. назад`;

  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(value);
}

function getPercentStyle(percent: number) {
  if (percent >= 80) {
    return {
      badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
      bar: "bg-emerald-500",
    };
  }

  if (percent >= 50) {
    return {
      badge: "border-amber-200 bg-amber-50 text-amber-700",
      bar: "bg-amber-500",
    };
  }

  return {
    badge: "border-rose-200 bg-rose-50 text-rose-700",
    bar: "bg-rose-500",
  };
}

function getDeadlineMeta(deadline: Date | null, now: Date) {
  if (!deadline) {
    return {
      label: "Без дедлайна",
      className: "border-slate-200 bg-slate-100 text-slate-500",
    };
  }

  if (deadline.getTime() < now.getTime()) {
    return {
      label: `Просрочено · ${formatDateTime(deadline)}`,
      className: "border-rose-200 bg-rose-50 text-rose-700",
    };
  }

  return {
    label: `До ${formatDateTime(deadline)}`,
    className: "border-amber-200 bg-amber-50 text-amber-700",
  };
}

export default async function TeacherPage() {
  const user = await requireTeacherPage();
  const now = new Date();

  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const inactiveThreshold = new Date(now);
  inactiveThreshold.setDate(inactiveThreshold.getDate() - 7);

  const [
    studentGroups,
    activeTasksCount,
    publishedVariantsCount,
    homeworkGroups,
    webinarGroups,
    weeklyAttempts,
    recentAttempts,
    inactiveStudents,
    activeAssignments,
    submittedAttempts,
    upcomingWebinarsCount,
  ] = await Promise.all([
    prisma.user.groupBy({
      by: ["studentStatus"],
      where: {
        role: UserRole.STUDENT,
      },
      _count: {
        _all: true,
      },
    }),
    prisma.task.count({
      where: {
        isArchived: false,
      },
    }),
    prisma.examVariant.count({
      where: {
        status: "PUBLISHED",
      },
    }),
    prisma.homework.groupBy({
      by: ["status"],
      _count: {
        _all: true,
      },
    }),
    prisma.webinar.groupBy({
      by: ["status"],
      _count: {
        _all: true,
      },
    }),
    prisma.attempt.aggregate({
      where: {
        status: AttemptStatus.SUBMITTED,
        submittedAt: {
          gte: sevenDaysAgo,
        },
      },
      _count: {
        _all: true,
      },
      _avg: {
        percent: true,
      },
    }),
    prisma.attempt.findMany({
      where: {
        status: AttemptStatus.SUBMITTED,
      },
      select: {
        id: true,
        homeworkId: true,
        percent: true,
        score: true,
        maxScore: true,
        submittedAt: true,
        student: {
          select: {
            id: true,
            name: true,
            studentStatus: true,
          },
        },
        homework: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: {
        submittedAt: "desc",
      },
      take: 6,
    }),
    prisma.user.findMany({
      where: {
        role: UserRole.STUDENT,
        studentStatus: {
          in: [
            StudentAccountStatus.ACTIVE,
            StudentAccountStatus.FROZEN,
          ],
        },
        OR: [
          {
            lastActivityAt: null,
          },
          {
            lastActivityAt: {
              lt: inactiveThreshold,
            },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        lastActivityAt: true,
        studentStatus: true,
      },
      orderBy: {
        lastActivityAt: "asc",
      },
    }),
    prisma.homeworkAssignment.findMany({
      where: {
        student: {
          studentStatus: {
            in: [
              StudentAccountStatus.ACTIVE,
              StudentAccountStatus.FROZEN,
            ],
          },
        },
        homework: {
          status: HomeworkStatus.ASSIGNED,
        },
      },
      select: {
        id: true,
        assignedAt: true,
        studentId: true,
        homeworkId: true,
        student: {
          select: {
            id: true,
            name: true,
          },
        },
        homework: {
          select: {
            id: true,
            title: true,
            deadline: true,
          },
        },
      },
      orderBy: {
        assignedAt: "desc",
      },
    }),
    prisma.attempt.findMany({
      where: {
        status: AttemptStatus.SUBMITTED,
        homework: {
          status: HomeworkStatus.ASSIGNED,
        },
      },
      select: {
        studentId: true,
        homeworkId: true,
      },
    }),
    prisma.webinarSchedule.count({
      where: {
        isPublished: true,
        scheduledAt: { gte: now },
      },
    }),
  ]);

  const studentCountMap = new Map(
    studentGroups.map((item) => [item.studentStatus, item._count._all])
  );

  const homeworkCountMap = new Map(
    homeworkGroups.map((item) => [item.status, item._count._all])
  );

  const webinarCountMap = new Map(
    webinarGroups.map((item) => [item.status, item._count._all])
  );

  const activeStudentsCount =
    studentCountMap.get(StudentAccountStatus.ACTIVE) ?? 0;
  const frozenStudentsCount =
    studentCountMap.get(StudentAccountStatus.FROZEN) ?? 0;
  const archivedStudentsCount =
    studentCountMap.get(StudentAccountStatus.ARCHIVED) ?? 0;
  const currentStudentsCount = activeStudentsCount + frozenStudentsCount;

  const activeHomeworksCount =
    homeworkCountMap.get(HomeworkStatus.ASSIGNED) ?? 0;
  const draftHomeworksCount = homeworkCountMap.get(HomeworkStatus.DRAFT) ?? 0;

  const publishedWebinarsCount =
    webinarCountMap.get(WebinarStatus.PUBLISHED) ?? 0;
  const draftWebinarsCount = webinarCountMap.get(WebinarStatus.DRAFT) ?? 0;

  const submittedPairSet = new Set(
    submittedAttempts.map(
      (attempt) => `${attempt.studentId}:${attempt.homeworkId}`
    )
  );

  const allPendingAssignments = activeAssignments
    .filter(
      (assignment) =>
        !submittedPairSet.has(
          `${assignment.studentId}:${assignment.homeworkId}`
        )
    )
    .sort((a, b) => {
      const aOverdue =
        a.homework.deadline && a.homework.deadline.getTime() < now.getTime()
          ? 0
          : 1;
      const bOverdue =
        b.homework.deadline && b.homework.deadline.getTime() < now.getTime()
          ? 0
          : 1;

      if (aOverdue !== bOverdue) return aOverdue - bOverdue;

      const aDeadline = a.homework.deadline?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const bDeadline = b.homework.deadline?.getTime() ?? Number.MAX_SAFE_INTEGER;

      if (aDeadline !== bDeadline) return aDeadline - bDeadline;

      return b.assignedAt.getTime() - a.assignedAt.getTime();
    });

  const pendingAssignments = allPendingAssignments.slice(0, 6);
  const overdueAssignmentsCount = allPendingAssignments.filter(
    (assignment) =>
      assignment.homework.deadline &&
      assignment.homework.deadline.getTime() < now.getTime()
  ).length;

  const weeklyAttemptsCount = weeklyAttempts._count._all;
  const weeklyAveragePercent = Math.round(weeklyAttempts._avg.percent ?? 0);

  const navigationCards = [
    {
      href: "/teacher/students",
      code: "01",
      title: "Ученики",
      description: "Доступы, статусы, активность и персональный прогресс.",
      value: currentStudentsCount,
      unit: "текущих",
    },
    {
      href: "/teacher/tasks",
      code: "02",
      title: "База заданий",
      description: "Условия, ответы, вложения и типы автопроверки.",
      value: activeTasksCount,
      unit: "активных",
    },
    {
      href: "/teacher/variants",
      code: "03",
      title: "Варианты ЕГЭ",
      description: "Конструктор вариантов и подробные попытки учеников.",
      value: publishedVariantsCount,
      unit: "опубликовано",
    },
    {
      href: "/teacher/homeworks",
      code: "04",
      title: "Домашние задания",
      description: "Создание, редактирование и история всех подборок.",
      value: activeHomeworksCount,
      unit: "выдано",
    },
    {
      href: "/teacher/homeworks/review",
      code: "05",
      title: "Контроль ДЗ",
      description: "Кто ещё не сдал, просрочки и ученики для внимания.",
      value: allPendingAssignments.length,
      unit: "ожидают",
    },
    {
      href: "/teacher/results",
      code: "06",
      title: "Результаты",
      description: "Последние попытки, ошибки и общая динамика решений.",
      value: weeklyAttemptsCount,
      unit: "за 7 дней",
    },
    {
      href: "/teacher/webinars",
      code: "07",
      title: "Вебинары",
      description: "Записи, конспекты, материалы и управление публикациями.",
      value: publishedWebinarsCount,
      unit: "опубликовано",
    },
    {
      href: "/teacher/webinar-schedule",
      code: "08",
      title: "Расписание вебинаров",
      description: "Даты живых встреч, анонсы и ссылки для подключения.",
      value: upcomingWebinarsCount,
      unit: "предстоит",
    },
  ];

  return (
    <main className="min-h-screen bg-slate-100/70 px-4 py-5 text-slate-950 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <nav className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-900 font-mono text-sm font-bold text-cyan-300">
              &lt;/&gt;
            </span>

            <div className="min-w-0">
              <div className="truncate font-bold text-slate-950">
                Экзамен без багов
              </div>
              <div className="truncate text-xs text-slate-400">
                Учительский кабинет · {user.email}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-500 md:inline">
              {formatDate(now)}
            </span>
            <LogoutButton />
          </div>
        </nav>

        <header className="relative mt-5 overflow-hidden rounded-[2rem] bg-slate-900 p-6 text-white shadow-lg sm:p-8 lg:p-10">
          <div className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-1/3 h-40 w-40 rounded-full bg-violet-500/10 blur-3xl" />

          <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-end">
            <div>
              <span className="inline-flex rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs font-semibold text-slate-300">
                Рабочая панель
              </span>

              <h1 className="mt-5 max-w-3xl text-3xl font-black tracking-[-0.04em] sm:text-4xl lg:text-5xl">
                Добро пожаловать, {user.name}
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                Здесь собраны ключевые показатели курса, последние действия
                учеников и задачи, которые требуют вашего внимания.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/teacher/homeworks/create"
                  className="inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-white"
                >
                  Создать ДЗ <span aria-hidden="true">→</span>
                </Link>

                <Link
                  href="/teacher/students/create"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Добавить ученика
                </Link>

                <Link
                  href="/teacher/tasks"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Открыть базу задач
                </Link>
              </div>
            </div>

            <aside className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Рабочий фокус
              </div>

              <div className="mt-4 space-y-3">
                <Link
                  href="/teacher/homeworks/review"
                  className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-black/10 px-4 py-3 transition hover:bg-white/[0.06]"
                >
                  <div>
                    <div className="text-sm font-semibold text-white">
                      Просроченные ДЗ
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      Нужна проверка или напоминание
                    </div>
                  </div>
                  <span className="text-2xl font-black text-rose-300">
                    {overdueAssignmentsCount}
                  </span>
                </Link>

                <Link
                  href="/teacher/students"
                  className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-black/10 px-4 py-3 transition hover:bg-white/[0.06]"
                >
                  <div>
                    <div className="text-sm font-semibold text-white">
                      Нет активности 7+ дней
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      Активные и замороженные ученики
                    </div>
                  </div>
                  <span className="text-2xl font-black text-amber-300">
                    {inactiveStudents.length}
                  </span>
                </Link>

                <Link
                  href="/teacher/webinars"
                  className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-black/10 px-4 py-3 transition hover:bg-white/[0.06]"
                >
                  <div>
                    <div className="text-sm font-semibold text-white">
                      Черновики вебинаров
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      Материалы ещё не опубликованы
                    </div>
                  </div>
                  <span className="text-2xl font-black text-cyan-300">
                    {draftWebinarsCount}
                  </span>
                </Link>
              </div>
            </aside>
          </div>
        </header>

        <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-slate-500">
                  Текущие ученики
                </div>
                <div className="mt-2 text-3xl font-black tracking-tight">
                  {currentStudentsCount}
                </div>
              </div>
              <span className="rounded-xl bg-cyan-50 px-2.5 py-1 font-mono text-xs font-bold text-cyan-700">
                users
              </span>
            </div>
            <div className="mt-3 text-xs text-slate-400">
              {activeStudentsCount} активных · {frozenStudentsCount} заморожено ·{" "}
              {archivedStudentsCount} в архиве
            </div>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-slate-500">
                  Активные ДЗ
                </div>
                <div className="mt-2 text-3xl font-black tracking-tight">
                  {activeHomeworksCount}
                </div>
              </div>
              <span className="rounded-xl bg-violet-50 px-2.5 py-1 font-mono text-xs font-bold text-violet-700">
                hw
              </span>
            </div>
            <div className="mt-3 text-xs text-slate-400">
              {draftHomeworksCount} черновиков · {allPendingAssignments.length} назначений без сдачи
            </div>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-slate-500">
                  Решений за 7 дней
                </div>
                <div className="mt-2 text-3xl font-black tracking-tight">
                  {weeklyAttemptsCount}
                </div>
              </div>
              <span className="rounded-xl bg-emerald-50 px-2.5 py-1 font-mono text-xs font-bold text-emerald-700">
                run
              </span>
            </div>
            <div className="mt-3 text-xs text-slate-400">
              Средний результат: {weeklyAveragePercent}%
            </div>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-slate-500">
                  Учебный контент
                </div>
                <div className="mt-2 text-3xl font-black tracking-tight">
                  {activeTasksCount}
                </div>
              </div>
              <span className="rounded-xl bg-amber-50 px-2.5 py-1 font-mono text-xs font-bold text-amber-700">
                db
              </span>
            </div>
            <div className="mt-3 text-xs text-slate-400">
              Активных задач · {publishedWebinarsCount} вебинаров опубликовано
            </div>
          </article>
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
                  Контроль
                </div>
                <h2 className="mt-1 text-xl font-bold text-slate-950">
                  Требует внимания
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Работы без отправленной попытки, сначала просроченные.
                </p>
              </div>

              <Link
                href="/teacher/homeworks/review"
                className="shrink-0 text-sm font-semibold text-cyan-700 transition hover:text-cyan-900"
              >
                Весь контроль →
              </Link>
            </div>

            {pendingAssignments.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/60 p-8 text-center">
                <div className="font-semibold text-emerald-800">
                  Все текущие назначения имеют решения
                </div>
                <p className="mt-1 text-sm text-emerald-700/70">
                  Сейчас нет домашних заданий, требующих напоминания.
                </p>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {pendingAssignments.map((assignment) => {
                  const deadlineMeta = getDeadlineMeta(
                    assignment.homework.deadline,
                    now
                  );

                  return (
                    <div
                      key={assignment.id}
                      className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <Link
                          href={`/teacher/students/${assignment.student.id}`}
                          className="font-semibold text-slate-900 transition hover:text-cyan-700"
                        >
                          {assignment.student.name}
                        </Link>
                        <div className="mt-1 line-clamp-1 text-sm text-slate-500">
                          {assignment.homework.title}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3 sm:justify-end">
                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${deadlineMeta.className}`}
                        >
                          {deadlineMeta.label}
                        </span>

                        <Link
                          href={`/teacher/homeworks/${assignment.homework.id}`}
                          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-cyan-200 hover:text-cyan-700"
                          aria-label={`Открыть ${assignment.homework.title}`}
                        >
                          →
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">
                  Activity log
                </div>
                <h2 className="mt-1 text-xl font-bold text-slate-950">
                  Последние решения
                </h2>
              </div>

              <Link
                href="/teacher/results"
                className="shrink-0 text-sm font-semibold text-cyan-700 transition hover:text-cyan-900"
              >
                Все результаты →
              </Link>
            </div>

            {recentAttempts.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
                Отправленных решений пока нет.
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {recentAttempts.map((attempt) => {
                  const percent = Math.round(attempt.percent);
                  const style = getPercentStyle(percent);

                  return (
                    <div
                      key={attempt.id}
                      className="rounded-2xl border border-slate-200 p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <Link
                            href={`/teacher/students/${attempt.student.id}`}
                            className="font-semibold text-slate-900 transition hover:text-cyan-700"
                          >
                            {attempt.student.name}
                          </Link>
                          <Link
                            href={`/teacher/homeworks/${attempt.homework.id}`}
                            className="mt-1 block line-clamp-1 text-sm text-slate-500 transition hover:text-slate-800"
                          >
                            {attempt.homework.title}
                          </Link>
                        </div>

                        <span
                          className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-bold ${style.badge}`}
                        >
                          {percent}%
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                        <span>{formatDateTime(attempt.submittedAt)}</span>
                        <span>
                          {attempt.score}/{attempt.maxScore} баллов
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </article>
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)]">
          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Ученики
                </div>
                <h2 className="mt-1 text-xl font-bold text-slate-950">
                  Давно не заходили
                </h2>
              </div>

              <Link
                href="/teacher/students"
                className="text-sm font-semibold text-cyan-700 transition hover:text-cyan-900"
              >
                Список →
              </Link>
            </div>

            {inactiveStudents.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/60 p-6 text-center text-sm text-emerald-700">
                Все текущие ученики проявляли активность за последние 7 дней.
              </div>
            ) : (
              <div className="mt-5 space-y-2">
                {inactiveStudents.slice(0, 5).map((student) => (
                  <Link
                    key={student.id}
                    href={`/teacher/students/${student.id}`}
                    className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 px-4 py-3 transition hover:border-cyan-200 hover:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-800">
                        {student.name}
                      </div>
                      <div className="mt-0.5 truncate text-xs text-slate-400">
                        {student.email}
                      </div>
                    </div>
                    <span className="shrink-0 text-xs font-medium text-slate-500">
                      {getRelativeTime(student.lastActivityAt, now)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Навигация
              </div>
              <h2 className="mt-1 text-xl font-bold text-slate-950">
                Разделы кабинета
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Основные инструменты для ежедневной работы с курсом.
              </p>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {navigationCards.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex min-h-48 flex-col rounded-2xl border border-slate-200 bg-slate-50/60 p-4 transition hover:-translate-y-0.5 hover:border-cyan-200 hover:bg-white hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-mono text-xs font-bold text-slate-300">
                      {item.code}
                    </span>
                    <span className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-400 transition group-hover:border-cyan-200 group-hover:text-cyan-700">
                      ↗
                    </span>
                  </div>

                  <h3 className="mt-4 font-bold text-slate-900">
                    {item.title}
                  </h3>
                  <p className="mt-2 flex-1 text-xs leading-5 text-slate-500">
                    {item.description}
                  </p>

                  <div className="mt-4 border-t border-slate-200 pt-3">
                    <span className="text-xl font-black text-slate-900">
                      {item.value}
                    </span>
                    <span className="ml-2 text-xs text-slate-400">
                      {item.unit}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
