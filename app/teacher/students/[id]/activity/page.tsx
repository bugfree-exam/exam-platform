import Link from "next/link";
import { notFound } from "next/navigation";

import { requireTeacherPage } from "@/lib/access";
import { prisma } from "@/lib/prisma";

type ActivityPageProps = {
  params: Promise<{ id: string }>;
};

type ActivitySessionRow = {
  id: string;
  startedAt: Date;
  lastSeenAt: Date;
  lastPath: string | null;
  pageViews: number;
};

type TimelineItem = {
  id: string;
  at: Date;
  type: "homework" | "variant" | "practice";
  title: string;
  details: string;
};

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function formatDuration(ms: number) {
  const minutes = Math.max(1, Math.round(ms / 60_000));
  if (minutes < 60) return `${minutes} мин`;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} ч ${rest} мин` : `${hours} ч`;
}

function getPathLabel(path: string | null) {
  if (!path) return "Страница не определена";
  if (path === "/student") return "Главная ученика";
  if (path.startsWith("/student/homeworks/")) return "Домашнее задание";
  if (path.startsWith("/student/variants/")) return "Пробный вариант";
  if (path.startsWith("/student/trainer/")) return "Тренажёр";
  if (path.startsWith("/student/study-plan")) return "Ближайший спринт";
  if (path.startsWith("/student/webinars")) return "Вебинары";
  return path;
}

export default async function StudentActivityPage({ params }: ActivityPageProps) {
  await requireTeacherPage();
  const { id } = await params;

  const student = await prisma.user.findFirst({
    where: { id, role: "STUDENT" },
    select: {
      id: true,
      name: true,
      email: true,
      lastActivityAt: true,
      attempts: {
        where: { status: "SUBMITTED" },
        orderBy: { submittedAt: "desc" },
        take: 80,
        select: {
          id: true,
          submittedAt: true,
          percent: true,
          answers: { select: { id: true } },
          homework: { select: { title: true } },
        },
      },
      variantAttempts: {
        where: { status: "SUBMITTED" },
        orderBy: { submittedAt: "desc" },
        take: 50,
        select: {
          id: true,
          submittedAt: true,
          percent: true,
          score: true,
          maxScore: true,
          answers: { select: { id: true } },
          variant: { select: { title: true } },
        },
      },
      practiceAttempts: {
        orderBy: { createdAt: "desc" },
        take: 150,
        select: {
          id: true,
          createdAt: true,
          isCorrect: true,
          taskRevision: { select: { egeNumber: true, title: true } },
        },
      },
    },
  });

  if (!student) notFound();

  const sessions = await prisma.$queryRaw<ActivitySessionRow[]>`
    SELECT "id", "startedAt", "lastSeenAt", "lastPath", "pageViews"
    FROM "StudentActivitySession"
    WHERE "studentId" = ${student.id}
    ORDER BY "startedAt" DESC
    LIMIT 100
  `;

  const totalOnlineMs = sessions.reduce(
    (sum, session) => sum + Math.max(0, session.lastSeenAt.getTime() - session.startedAt.getTime()),
    0
  );

  const activeDays = new Set(
    sessions.map((session) =>
      new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Moscow" }).format(session.startedAt)
    )
  ).size;

  const pageViews = sessions.reduce((sum, session) => sum + session.pageViews, 0);
  const solvedTasks =
    student.attempts.reduce((sum, item) => sum + item.answers.length, 0) +
    student.variantAttempts.reduce((sum, item) => sum + item.answers.length, 0) +
    student.practiceAttempts.length;

  const timeline: TimelineItem[] = [
    ...student.attempts.flatMap<TimelineItem>((attempt) =>
      attempt.submittedAt
        ? [
            {
              id: `homework-${attempt.id}`,
              at: attempt.submittedAt,
              type: "homework",
              title: `Сдал ДЗ «${attempt.homework.title}»`,
              details: `${attempt.answers.length} заданий · результат ${Math.round(attempt.percent)}%`,
            },
          ]
        : []
    ),
    ...student.variantAttempts.flatMap<TimelineItem>((attempt) =>
      attempt.submittedAt
        ? [
            {
              id: `variant-${attempt.id}`,
              at: attempt.submittedAt,
              type: "variant",
              title: `Завершил вариант «${attempt.variant.title}»`,
              details: `${attempt.answers.length} заданий · ${attempt.score}/${attempt.maxScore} · ${Math.round(attempt.percent)}%`,
            },
          ]
        : []
    ),
    ...student.practiceAttempts.map<TimelineItem>((attempt) => ({
      id: `practice-${attempt.id}`,
      at: attempt.createdAt,
      type: "practice",
      title: `Тренажёр: №${attempt.taskRevision.egeNumber} — ${attempt.taskRevision.title}`,
      details: attempt.isCorrect ? "Ответ верный" : "Допущена ошибка",
    })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 120);

  return (
    <main className="min-h-screen bg-slate-100/70 px-4 py-6 text-slate-950 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <Link
            href={`/teacher/students/${student.id}`}
            className="text-sm font-semibold text-cyan-700 hover:text-cyan-900"
          >
            ← К карточке ученика
          </Link>
          <div className="mt-5">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">
              activity.log
            </div>
            <h1 className="mt-1 text-3xl font-black">Активность: {student.name}</h1>
            <p className="mt-2 text-sm text-slate-500">
              Сессии на платформе и реальные учебные действия. Время является оценочным:
              heartbeat учитывается только пока вкладка активна.
            </p>
          </div>
        </header>

        <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Сессий за период</div>
            <div className="mt-2 text-3xl font-black">{sessions.length}</div>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Примерно онлайн</div>
            <div className="mt-2 text-3xl font-black">{sessions.length ? formatDuration(totalOnlineMs) : "—"}</div>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Активных дней</div>
            <div className="mt-2 text-3xl font-black">{activeDays}</div>
            <div className="mt-2 text-xs text-slate-400">{pageViews} переходов по страницам</div>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Учебных действий</div>
            <div className="mt-2 text-3xl font-black">{solvedTasks}</div>
            <div className="mt-2 text-xs text-slate-400">Ответы в ДЗ, вариантах и тренажёре</div>
          </article>
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-xl font-bold">Сессии на платформе</h2>
            <p className="mt-1 text-sm text-slate-500">Последние 100 входов/вкладок ученика.</p>

            {sessions.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
                Новая статистика начнёт собираться после следующего входа ученика.
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {sessions.map((session) => (
                  <div key={session.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="font-semibold">{formatDateTime(session.startedAt)}</div>
                      <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-600">
                        {formatDuration(session.lastSeenAt.getTime() - session.startedAt.getTime())}
                      </span>
                    </div>
                    <div className="mt-2 text-xs leading-5 text-slate-500">
                      {session.pageViews} переходов · последняя страница: {getPathLabel(session.lastPath)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-xl font-bold">Лог учебных действий</h2>
            <p className="mt-1 text-sm text-slate-500">Сданные ДЗ, варианты и ответы в тренажёре.</p>

            {timeline.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
                Учебных действий пока нет.
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {timeline.map((item) => (
                  <div key={item.id} className="flex gap-4 rounded-2xl border border-slate-200 p-4">
                    <div
                      className={
                        item.type === "homework"
                          ? "mt-1 h-3 w-3 shrink-0 rounded-full bg-cyan-500"
                          : item.type === "variant"
                            ? "mt-1 h-3 w-3 shrink-0 rounded-full bg-violet-500"
                            : "mt-1 h-3 w-3 shrink-0 rounded-full bg-emerald-500"
                      }
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                        <div className="font-semibold text-slate-900">{item.title}</div>
                        <div className="shrink-0 text-xs text-slate-400">{formatDateTime(item.at)}</div>
                      </div>
                      <div className="mt-1 text-sm text-slate-500">{item.details}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </article>
        </section>
      </div>
    </main>
  );
}
