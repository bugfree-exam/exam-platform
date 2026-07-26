import Link from "next/link";
import { redirect } from "next/navigation";

import { requireStudentPage } from "@/lib/access";
import { prisma } from "@/lib/prisma";

function getTaskWord(value: number) {
  const lastTwo = value % 100;
  const last = value % 10;

  if (lastTwo >= 11 && lastTwo <= 14) return "заданий";
  if (last === 1) return "задание";
  if (last >= 2 && last <= 4) return "задания";

  return "заданий";
}

function getHomeworkWord(value: number) {
  const lastTwo = value % 100;
  const last = value % 10;

  if (lastTwo >= 11 && lastTwo <= 14) return "работ";
  if (last === 1) return "работа";
  if (last >= 2 && last <= 4) return "работы";

  return "работ";
}

function formatAssignedDate(value: Date) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(value);
}

function formatSubmittedDate(value: Date | null) {
  if (!value) return "Дата выполнения не указана";

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function getResultStyle(percent: number) {
  if (percent >= 80) {
    return {
      label: "Отличный результат",
      badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
      bar: "bg-emerald-500",
      icon: "text-emerald-600",
    };
  }

  if (percent >= 50) {
    return {
      label: "Есть что улучшить",
      badge: "border-amber-200 bg-amber-50 text-amber-700",
      bar: "bg-amber-500",
      icon: "text-amber-600",
    };
  }

  return {
    label: "Нужен разбор ошибок",
    badge: "border-rose-200 bg-rose-50 text-rose-700",
    bar: "bg-rose-500",
    icon: "text-rose-600",
  };
}

export default async function StudentHomeworksPage() {
  const user = await requireStudentPage();

  if (!user) {
    redirect("/login");
  }

  const assignments = await prisma.homeworkAssignment.findMany({
    where: {
      studentId: user.id,
      homework: {
        status: {
          not: "ARCHIVED",
        },
      },
    },
    include: {
      homework: {
        include: {
          tasks: true,
          attempts: {
            where: {
              studentId: user.id,
              status: "SUBMITTED",
            },
            orderBy: {
              submittedAt: "desc",
            },
            take: 1,
          },
        },
      },
    },
    orderBy: {
      assignedAt: "desc",
    },
  });

  const pendingAssignments = assignments.filter(
    (assignment) => !assignment.homework.attempts[0]
  );

  const completedAssignments = assignments.filter(
    (assignment) => Boolean(assignment.homework.attempts[0])
  );

  const completedPercents = completedAssignments.map(
    (assignment) => assignment.homework.attempts[0]?.percent ?? 0
  );

  const averageCompletedPercent =
    completedPercents.length === 0
      ? 0
      : Math.round(
          completedPercents.reduce((sum, percent) => sum + percent, 0) /
            completedPercents.length
        );

  const totalTasks = assignments.reduce(
    (sum, assignment) => sum + assignment.homework.tasks.length,
    0
  );

  const completedTasks = completedAssignments.reduce(
    (sum, assignment) => sum + assignment.homework.tasks.length,
    0
  );

  const completionPercent =
    assignments.length === 0
      ? 0
      : Math.round((completedAssignments.length / assignments.length) * 100);

  const nextAssignment = pendingAssignments[0] ?? null;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f4f7f8] px-4 py-5 text-slate-950 sm:px-6 sm:py-8">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.32]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(15,23,42,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.045) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="pointer-events-none absolute -left-32 top-24 h-80 w-80 rounded-full bg-cyan-300/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 top-[34rem] h-96 w-96 rounded-full bg-violet-300/15 blur-3xl" />

      <div className="relative mx-auto max-w-7xl">
        <nav className="mb-5 flex items-center justify-between gap-4 rounded-2xl border border-white/80 bg-white/80 px-4 py-3 shadow-sm backdrop-blur sm:px-5">
          <Link href="/student" className="group flex min-w-0 items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-950 font-mono text-sm font-bold text-cyan-300">
              &lt;/&gt;
            </span>

            <span className="min-w-0">
              <span className="block truncate text-sm font-bold text-slate-950">
                Экзамен без багов
              </span>
              <span className="block truncate font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">
                student.workspace
              </span>
            </span>
          </Link>

          <Link
            href="/student"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-cyan-300 hover:text-cyan-800"
          >
            <span aria-hidden="true">←</span>
            <span className="hidden sm:inline">В кабинет</span>
          </Link>
        </nav>

        <header className="relative overflow-hidden rounded-[2rem] bg-slate-950 px-5 py-7 text-white shadow-xl shadow-slate-950/10 sm:px-8 sm:py-9 lg:px-10">
          <div
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
          />

          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-1/3 h-40 w-40 rounded-full bg-violet-500/20 blur-3xl" />

          <div className="relative grid gap-8 lg:grid-cols-[1fr_360px] lg:items-end">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-cyan-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
                  homework.queue
                </span>

                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-slate-300">
                  {pendingAssignments.length} ждут выполнения
                </span>
              </div>

              <h1 className="mt-5 max-w-3xl text-3xl font-black tracking-[-0.04em] sm:text-4xl lg:text-5xl">
                Мои домашние задания
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                Сначала — актуальные работы, которые нужно выполнить. Ниже —
                завершённые домашние задания с результатами и возможностью
                вернуться к разбору.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">
                Выполнено работ
              </div>

              <div className="mt-3 flex items-end justify-between gap-4">
                <div className="text-5xl font-black tracking-[-0.06em] text-white">
                  {completionPercent}
                  <span className="ml-1 text-2xl text-cyan-300">%</span>
                </div>

                <div className="text-right">
                  <div className="text-sm font-bold text-white">
                    {completedAssignments.length}/{assignments.length}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    домашних работ
                  </div>
                </div>
              </div>

              <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-cyan-400 transition-all"
                  style={{ width: `${Math.min(completionPercent, 100)}%` }}
                />
              </div>

              <div className="mt-3 flex justify-between font-mono text-[10px] text-slate-500">
                <span>assigned</span>
                <span>submitted</span>
              </div>
            </div>
          </div>
        </header>

        {assignments.length === 0 ? (
          <section className="mt-6 overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
            <div className="mx-auto max-w-xl text-center">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-slate-950 font-mono text-xl text-cyan-300">
                ✓
              </div>

              <div className="mt-5 font-mono text-[11px] uppercase tracking-[0.18em] text-cyan-700">
                очередь пуста
              </div>

              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                Пока нет выданных домашних заданий
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-600">
                Когда преподаватель добавит новую работу, она сразу появится на
                этой странице.
              </p>

              <Link
                href="/student"
                className="mt-6 inline-flex items-center justify-center rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-cyan-700"
              >
                Вернуться в кабинет
              </Link>
            </div>
          </section>
        ) : (
          <>
            <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.17em] text-slate-400">
                      Всего работ
                    </div>
                    <div className="mt-3 text-3xl font-black tracking-tight text-slate-950">
                      {assignments.length}
                    </div>
                  </div>

                  <span className="rounded-xl bg-cyan-50 px-2.5 py-1 font-mono text-xs font-bold text-cyan-700">
                    all
                  </span>
                </div>

                <p className="mt-3 text-sm text-slate-500">
                  Активных домашних заданий
                </p>
              </article>

              <article className="rounded-3xl border border-amber-200 bg-amber-50/70 p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.17em] text-amber-700">
                      Нужно выполнить
                    </div>
                    <div className="mt-3 text-3xl font-black tracking-tight text-slate-950">
                      {pendingAssignments.length}
                    </div>
                  </div>

                  <span className="rounded-xl bg-white/80 px-2.5 py-1 font-mono text-xs font-bold text-amber-700">
                    todo
                  </span>
                </div>

                <p className="mt-3 text-sm text-amber-800/70">
                  {pendingAssignments.length === 0
                    ? "Все работы выполнены"
                    : "Работы без отправленной попытки"}
                </p>
              </article>

              <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.17em] text-slate-400">
                      Средний результат
                    </div>
                    <div className="mt-3 text-3xl font-black tracking-tight text-slate-950">
                      {averageCompletedPercent}%
                    </div>
                  </div>

                  <span className="rounded-xl bg-emerald-50 px-2.5 py-1 font-mono text-xs font-bold text-emerald-700">
                    avg
                  </span>
                </div>

                <p className="mt-3 text-sm text-slate-500">
                  По завершённым работам
                </p>
              </article>

              <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.17em] text-slate-400">
                      Объём практики
                    </div>
                    <div className="mt-3 text-3xl font-black tracking-tight text-slate-950">
                      {totalTasks}
                    </div>
                  </div>

                  <span className="rounded-xl bg-violet-50 px-2.5 py-1 font-mono text-xs font-bold text-violet-700">
                    task
                  </span>
                </div>

                <p className="mt-3 text-sm text-slate-500">
                  {completedTasks} уже в выполненных работах
                </p>
              </article>
            </section>

            {nextAssignment ? (
              <section className="mt-6 overflow-hidden rounded-[2rem] border border-cyan-200 bg-white shadow-sm">
                <div className="grid lg:grid-cols-[1fr_310px]">
                  <div className="p-5 sm:p-7">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-2 rounded-full bg-cyan-50 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
                        Следующая работа
                      </span>

                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                        {nextAssignment.homework.tasks.length}{" "}
                        {getTaskWord(nextAssignment.homework.tasks.length)}
                      </span>
                    </div>

                    <h2 className="mt-4 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                      {nextAssignment.homework.title}
                    </h2>

                    {nextAssignment.homework.description ? (
                      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                        {nextAssignment.homework.description}
                      </p>
                    ) : (
                      <p className="mt-3 text-sm leading-6 text-slate-500">
                        Открой работу, изучи задания и отправь ответы на
                        проверку.
                      </p>
                    )}

                    <div className="mt-5 flex flex-wrap items-center gap-4 text-sm">
                      <span className="text-slate-500">
                        Выдано{" "}
                        <strong className="font-semibold text-slate-800">
                          {formatAssignedDate(nextAssignment.assignedAt)}
                        </strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col justify-between bg-slate-950 p-5 text-white sm:p-7">
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300">
                        recommended.action
                      </div>
                      <div className="mt-3 text-xl font-black">
                        Можно приступать
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-400">
                        Эта работа выдана последней среди ещё не выполненных.
                      </p>
                    </div>

                    <Link
                      href={`/student/homeworks/${nextAssignment.homework.id}`}
                      className="mt-6 inline-flex items-center justify-center rounded-xl bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-white"
                    >
                      Начать выполнение →
                    </Link>
                  </div>
                </div>
              </section>
            ) : (
              <section className="mt-6 rounded-[2rem] border border-emerald-200 bg-emerald-50 p-6 sm:p-8">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-700">
                      queue.complete
                    </div>
                    <h2 className="mt-2 text-2xl font-black text-slate-950">
                      Все актуальные работы выполнены
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-emerald-900/70">
                      Можно посмотреть результаты и вернуться к разбору ошибок.
                    </p>
                  </div>

                  <Link
                    href="/student/results"
                    className="inline-flex shrink-0 items-center justify-center rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-800"
                  >
                    Открыть прогресс →
                  </Link>
                </div>
              </section>
            )}

            {pendingAssignments.length > 0 ? (
              <section className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-amber-700">
                      todo.assignments
                    </div>
                    <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                      Нужно выполнить
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      Работы, по которым ещё нет отправленной попытки.
                    </p>
                  </div>

                  <div className="rounded-xl bg-amber-50 px-3 py-2 font-mono text-xs font-bold text-amber-700">
                    {pendingAssignments.length}{" "}
                    {getHomeworkWord(pendingAssignments.length)}
                  </div>
                </div>

                <div className="mt-6 grid gap-4 lg:grid-cols-2">
                  {pendingAssignments.map((assignment, index) => {
                    const homework = assignment.homework;
                    const isRecommended =
                      nextAssignment?.id === assignment.id;

                    return (
                      <Link
                        key={assignment.id}
                        href={`/student/homeworks/${homework.id}`}
                        className={`group relative overflow-hidden rounded-3xl border p-5 transition hover:-translate-y-0.5 hover:shadow-lg ${
                          isRecommended
                            ? "border-cyan-200 bg-cyan-50/40"
                            : "border-slate-200 bg-white hover:border-cyan-200"
                        }`}
                      >
                        <div className="absolute right-4 top-4 font-mono text-[10px] text-slate-300">
                          {String(index + 1).padStart(2, "0")}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pr-10">
                          <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                            Не выполнено
                          </span>

                          {isRecommended ? (
                            <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-bold text-cyan-700">
                              Следующая
                            </span>
                          ) : null}
                        </div>

                        <h3 className="mt-4 pr-6 text-xl font-black leading-tight text-slate-950 transition group-hover:text-cyan-800">
                          {homework.title}
                        </h3>

                        {homework.description ? (
                          <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
                            {homework.description}
                          </p>
                        ) : (
                          <p className="mt-3 text-sm leading-6 text-slate-500">
                            Открой работу, чтобы посмотреть условия заданий.
                          </p>
                        )}

                        <div className="mt-6 flex flex-wrap items-end justify-between gap-4 border-t border-slate-200/80 pt-4">
                          <div>
                            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400">
                              Выдано
                            </div>
                            <div className="mt-1 text-sm font-semibold text-slate-700">
                              {formatAssignedDate(assignment.assignedAt)}
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-2xl font-black text-slate-950">
                              {homework.tasks.length}
                            </div>
                            <div className="text-xs text-slate-400">
                              {getTaskWord(homework.tasks.length)}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 flex items-center justify-between">
                          <span className="text-sm font-bold text-cyan-700">
                            Открыть работу
                          </span>
                          <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-950 text-white transition group-hover:bg-cyan-700">
                            →
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {completedAssignments.length > 0 ? (
              <section className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-700">
                      submitted.history
                    </div>
                    <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                      Выполненные работы
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      Результаты последних отправленных попыток. Работу можно
                      открыть снова для просмотра ответов.
                    </p>
                  </div>

                  <Link
                    href="/student/results"
                    className="text-sm font-bold text-cyan-700 transition hover:text-cyan-900"
                  >
                    Вся аналитика →
                  </Link>
                </div>

                <div className="mt-6 space-y-3">
                  {completedAssignments.map((assignment, index) => {
                    const homework = assignment.homework;
                    const latestAttempt = homework.attempts[0];
                    const percent = latestAttempt?.percent ?? 0;
                    const resultStyle = getResultStyle(percent);

                    return (
                      <Link
                        key={assignment.id}
                        href={`/student/homeworks/${homework.id}`}
                        className="group block rounded-3xl border border-slate-200 bg-slate-50/60 p-4 transition hover:border-cyan-200 hover:bg-white hover:shadow-md sm:p-5"
                      >
                        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_180px_150px] lg:items-center">
                          <div className="flex min-w-0 items-start gap-4">
                            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-100 font-mono text-sm font-black text-emerald-700">
                              ✓
                            </div>

                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-slate-400">
                                  Работа {String(index + 1).padStart(2, "0")}
                                </span>
                                <span
                                  className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${resultStyle.badge}`}
                                >
                                  {resultStyle.label}
                                </span>
                              </div>

                              <h3 className="mt-2 truncate text-lg font-black text-slate-950 transition group-hover:text-cyan-800">
                                {homework.title}
                              </h3>

                              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                                <span>
                                  {homework.tasks.length}{" "}
                                  {getTaskWord(homework.tasks.length)}
                                </span>
                                <span>
                                  Выполнено{" "}
                                  {formatSubmittedDate(
                                    latestAttempt?.submittedAt ?? null
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-slate-500">
                                Результат
                              </span>
                              <span className={`font-black ${resultStyle.icon}`}>
                                {percent}%
                              </span>
                            </div>

                            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                              <div
                                className={`h-full rounded-full ${resultStyle.bar}`}
                                style={{
                                  width: `${Math.min(percent, 100)}%`,
                                }}
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-3 lg:justify-end">
                            <div className="text-right">
                              <div className="text-2xl font-black text-slate-950">
                                {latestAttempt?.score ?? 0}/
                                {latestAttempt?.maxScore ?? 0}
                              </div>
                              <div className="text-xs text-slate-400">
                                баллов
                              </div>
                            </div>

                            <span className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 transition group-hover:border-cyan-200 group-hover:bg-cyan-50 group-hover:text-cyan-700">
                              →
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}