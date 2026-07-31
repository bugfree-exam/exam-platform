import Link from "next/link";
import { redirect } from "next/navigation";

import { formatAnswerForDisplay } from "@/lib/answer";
import { requireStudentPage } from "@/lib/access";
import { primaryToEgeTestScore } from "@/lib/egeScore";
import { prisma } from "@/lib/prisma";

function getResultStyle(percent: number) {
  if (percent >= 80) {
    return {
      label: "Уверенно",
      badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
      bar: "bg-emerald-500",
      dot: "bg-emerald-400",
    };
  }

  if (percent >= 50) {
    return {
      label: "В процессе",
      badge: "border-amber-200 bg-amber-50 text-amber-700",
      bar: "bg-amber-500",
      dot: "bg-amber-400",
    };
  }

  return {
    label: "Нужна практика",
    badge: "border-rose-200 bg-rose-50 text-rose-700",
    bar: "bg-rose-500",
    dot: "bg-rose-400",
  };
}

function getAttemptWord(value: number) {
  const lastTwo = value % 100;
  const last = value % 10;

  if (lastTwo >= 11 && lastTwo <= 14) return "попыток";
  if (last === 1) return "попытка";
  if (last >= 2 && last <= 4) return "попытки";

  return "попыток";
}

function getAnswerWord(value: number) {
  const lastTwo = value % 100;
  const last = value % 10;

  if (lastTwo >= 11 && lastTwo <= 14) return "ответов";
  if (last === 1) return "ответ";
  if (last >= 2 && last <= 4) return "ответа";

  return "ответов";
}

function formatDate(value: Date | null) {
  if (!value) return "Дата сдачи не указана";

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

export default async function StudentResultsPage() {
  const user = await requireStudentPage();

  if (!user) {
    redirect("/login");
  }

  const [homeworkAttempts, practiceAttempts, variantAttempts] =
    await Promise.all([
    prisma.attempt.findMany({
      where: {
        studentId: user.id,
        status: "SUBMITTED",
      },
      include: {
        homework: {
          select: {
            id: true,
            title: true,
          },
        },
        answers: {
          include: {
            task: {
              select: {
                id: true,
                egeNumber: true,
                title: true,
                correctAnswer: true,
              },
            },
          },
        },
      },
      orderBy: {
        submittedAt: "desc",
      },
    }),
    prisma.practiceAttempt.findMany({
      where: {
        studentId: user.id,
      },
      include: {
        task: {
          select: {
            id: true,
            egeNumber: true,
            title: true,
            correctAnswer: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
    prisma.variantAttempt.findMany({
      where: {
        studentId: user.id,
        status: "SUBMITTED",
      },
      include: {
        variant: {
          select: {
            id: true,
            title: true,
          },
        },
        answers: {
          include: {
            task: {
              select: {
                id: true,
                egeNumber: true,
                title: true,
                correctAnswer: true,
              },
            },
          },
        },
      },
      orderBy: {
        submittedAt: "desc",
      },
    }),
  ]);

  const attempts = [
    ...homeworkAttempts.map((attempt) => ({
      id: attempt.id,
      source: "HOMEWORK" as const,
      title: attempt.homework.title,
      href: `/student/homeworks/${attempt.homeworkId}`,
      score: attempt.score,
      maxScore: attempt.maxScore,
      percent: attempt.percent,
      egeTestScore: null,
      submittedAt: attempt.submittedAt,
      answers: attempt.answers,
    })),
    ...practiceAttempts.map((attempt) => ({
      id: attempt.id,
      source: "PRACTICE" as const,
      title: `Тренажёр · задание №${attempt.task.egeNumber}`,
      href: `/student/trainer/${attempt.task.egeNumber}?task=${attempt.taskId}`,
      score: attempt.isCorrect ? 1 : 0,
      maxScore: 1,
      percent: attempt.isCorrect ? 100 : 0,
      egeTestScore: null,
      submittedAt: attempt.createdAt,
      answers: [
        {
          id: `practice-${attempt.id}`,
          taskId: attempt.taskId,
          rawAnswer: attempt.rawAnswer,
          normalizedAnswer: attempt.normalizedAnswer,
          isCorrect: attempt.isCorrect,
          task: attempt.task,
        },
      ],
    })),
    ...variantAttempts.map((attempt) => ({
      id: attempt.id,
      source: "VARIANT" as const,
      title: attempt.variant.title,
      href: `/student/variants/${attempt.variantId}/results/${attempt.id}`,
      score: attempt.score,
      maxScore: attempt.maxScore,
      percent: attempt.percent,
      egeTestScore: primaryToEgeTestScore(attempt.score),
      submittedAt: attempt.submittedAt,
      answers: attempt.answers,
    })),
  ].sort(
    (first, second) =>
      (second.submittedAt?.getTime() ?? 0) -
      (first.submittedAt?.getTime() ?? 0)
  );

  const totalAttempts = attempts.length;

  const averagePercent =
    totalAttempts === 0
      ? 0
      : Math.round(
          attempts.reduce((sum, attempt) => sum + attempt.percent, 0) /
            totalAttempts
        );

  const totalAnswers = attempts.reduce(
    (sum, attempt) => sum + attempt.answers.length,
    0
  );

  const totalCorrectAnswers = attempts.reduce(
    (sum, attempt) =>
      sum + attempt.answers.filter((answer) => answer.isCorrect).length,
    0
  );

  const accuracyPercent =
    totalAnswers === 0
      ? 0
      : Math.round((totalCorrectAnswers / totalAnswers) * 100);

  const bestAttempt =
    attempts.length === 0
      ? null
      : attempts.reduce((best, attempt) =>
          attempt.percent > best.percent ? attempt : best
        );

  const latestAttempt = attempts[0] ?? null;

  const taskNumberStats = new Map<
    number,
    {
      total: number;
      correct: number;
    }
  >();

  for (const attempt of attempts) {
    for (const answer of attempt.answers) {
      const current = taskNumberStats.get(answer.task.egeNumber) ?? {
        total: 0,
        correct: 0,
      };

      current.total += 1;

      if (answer.isCorrect) {
        current.correct += 1;
      }

      taskNumberStats.set(answer.task.egeNumber, current);
    }
  }

  const taskNumberResults = Array.from(taskNumberStats.entries())
    .map(([egeNumber, stat]) => ({
      egeNumber,
      total: stat.total,
      correct: stat.correct,
      incorrect: stat.total - stat.correct,
      percent: Math.round((stat.correct / stat.total) * 100),
    }))
    .sort((a, b) => a.egeNumber - b.egeNumber);

  const strongestTask =
    taskNumberResults.length === 0
      ? null
      : [...taskNumberResults].sort(
          (a, b) => b.percent - a.percent || b.total - a.total
        )[0];

  const focusTask =
    taskNumberResults.length === 0
      ? null
      : [...taskNumberResults].sort(
          (a, b) => a.percent - b.percent || b.total - a.total
        )[0];

  const hasResults = attempts.length > 0;
  const averageStyle = getResultStyle(averagePercent);

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

      <div className="pointer-events-none absolute -left-32 top-20 h-80 w-80 rounded-full bg-cyan-300/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 top-[30rem] h-96 w-96 rounded-full bg-violet-300/15 blur-3xl" />

      <div className="relative mx-auto max-w-7xl">
        <nav className="mb-5 flex items-center justify-between gap-4 rounded-2xl border border-white/80 bg-white/80 px-4 py-3 shadow-sm backdrop-blur sm:px-5">
          <Link
            href="/student"
            className="group flex min-w-0 items-center gap-3"
          >
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
                  <span className={`h-1.5 w-1.5 rounded-full ${averageStyle.dot}`} />
                  progress.analytics
                </span>

                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-slate-300">
                  {totalAttempts} {getAttemptWord(totalAttempts)}
                </span>
              </div>

              <h1 className="mt-5 max-w-3xl text-3xl font-black tracking-[-0.04em] sm:text-4xl lg:text-5xl">
                Мой прогресс
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                Здесь собрана вся история решений из домашних заданий,
                тренажёра и полноценных вариантов: общий результат, точность по
                номерам ЕГЭ и подробный разбор каждой попытки.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">
                Средний результат
              </div>

              <div className="mt-3 flex items-end justify-between gap-4">
                <div className="text-5xl font-black tracking-[-0.06em] text-white">
                  {averagePercent}
                  <span className="ml-1 text-2xl text-cyan-300">%</span>
                </div>

                <span
                  className={`rounded-full border px-3 py-1 text-xs font-bold ${averageStyle.badge}`}
                >
                  {averageStyle.label}
                </span>
              </div>

              <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className={`h-full rounded-full transition-all ${averageStyle.bar}`}
                  style={{ width: `${Math.min(averagePercent, 100)}%` }}
                />
              </div>

              <div className="mt-3 flex justify-between font-mono text-[10px] text-slate-500">
                <span>0</span>
                <span>цель: 80+</span>
                <span>100</span>
              </div>
            </div>
          </div>
        </header>

        {!hasResults ? (
          <section className="mt-6 overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
            <div className="mx-auto max-w-xl text-center">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-slate-950 font-mono text-xl text-cyan-300">
                0%
              </div>

              <div className="mt-5 font-mono text-[11px] uppercase tracking-[0.18em] text-cyan-700">
                история пока пуста
              </div>

              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                Реши первое задание
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-600">
                После проверки ДЗ, задания в тренажёре или варианта здесь
                появятся результат, статистика по номерам ЕГЭ и подробный
                разбор.
              </p>

              <Link
                href="/student/trainer"
                className="mt-6 inline-flex items-center justify-center rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-cyan-700"
              >
                Открыть тренажёр →
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
                      Всего решений
                    </div>
                    <div className="mt-3 text-3xl font-black tracking-tight text-slate-950">
                      {totalAttempts}
                    </div>
                  </div>

                  <span className="rounded-xl bg-cyan-50 px-2.5 py-1 font-mono text-xs font-bold text-cyan-700">
                    run
                  </span>
                </div>

                <p className="mt-3 text-sm text-slate-500">
                  ДЗ, тренажёра и вариантов ЕГЭ
                </p>
              </article>

              <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.17em] text-slate-400">
                      Точность ответов
                    </div>
                    <div className="mt-3 text-3xl font-black tracking-tight text-slate-950">
                      {accuracyPercent}%
                    </div>
                  </div>

                  <span className="rounded-xl bg-emerald-50 px-2.5 py-1 font-mono text-xs font-bold text-emerald-700">
                    ok
                  </span>
                </div>

                <p className="mt-3 text-sm text-slate-500">
                  {totalCorrectAnswers} из {totalAnswers}{" "}
                  {getAnswerWord(totalAnswers)} верны
                </p>
              </article>

              <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.17em] text-slate-400">
                      Лучший результат
                    </div>
                    <div className="mt-3 text-3xl font-black tracking-tight text-slate-950">
                      {bestAttempt?.percent ?? 0}%
                    </div>
                  </div>

                  <span className="rounded-xl bg-violet-50 px-2.5 py-1 font-mono text-xs font-bold text-violet-700">
                    max
                  </span>
                </div>

                <p className="mt-3 truncate text-sm text-slate-500">
                  {bestAttempt?.title ?? "Пока нет результата"}
                </p>
              </article>

              <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.17em] text-slate-400">
                      Последняя попытка
                    </div>
                    <div className="mt-3 text-3xl font-black tracking-tight text-slate-950">
                      {latestAttempt?.percent ?? 0}%
                    </div>
                  </div>

                  <span className="rounded-xl bg-amber-50 px-2.5 py-1 font-mono text-xs font-bold text-amber-700">
                    last
                  </span>
                </div>

                <p className="mt-3 truncate text-sm text-slate-500">
                  {latestAttempt?.title ?? "Пока нет результата"}
                </p>
              </article>
            </section>

            <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
              <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-700">
                      skills.matrix
                    </div>
                    <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                      Результаты по номерам ЕГЭ
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      Чем длиннее полоса, тем выше доля правильных ответов по
                      этому номеру.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      80–100%
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      50–79%
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-rose-500" />
                      до 50%
                    </span>
                  </div>
                </div>

                <div className="mt-6 grid gap-3 md:grid-cols-2">
                  {taskNumberResults.map((item) => {
                    const style = getResultStyle(item.percent);

                    return (
                      <div
                        key={item.egeNumber}
                        className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-400">
                              exam.task
                            </div>
                            <div className="mt-1 text-lg font-black text-slate-950">
                              №{item.egeNumber} ЕГЭ
                            </div>
                          </div>

                          <span
                            className={`rounded-full border px-2.5 py-1 text-xs font-bold ${style.badge}`}
                          >
                            {item.percent}%
                          </span>
                        </div>

                        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className={`h-full rounded-full ${style.bar}`}
                            style={{ width: `${Math.min(item.percent, 100)}%` }}
                          />
                        </div>

                        <div className="mt-3 flex items-center justify-between text-xs">
                          <span className="font-semibold text-emerald-700">
                            Верно: {item.correct}
                          </span>
                          <span className="font-semibold text-rose-700">
                            Ошибок: {item.incorrect}
                          </span>
                          <span className="text-slate-400">
                            Всего: {item.total}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>

              <aside className="space-y-4">
                <article className="rounded-3xl bg-slate-950 p-5 text-white shadow-lg shadow-slate-950/10">
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300">
                    Сильная сторона
                  </div>

                  <div className="mt-4 flex items-end justify-between gap-4">
                    <div>
                      <div className="text-3xl font-black">
                        №{strongestTask?.egeNumber}
                      </div>
                      <div className="mt-1 text-sm text-slate-400">
                        задание ЕГЭ
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-2xl font-black text-emerald-300">
                        {strongestTask?.percent}%
                      </div>
                      <div className="text-xs text-slate-500">
                        {strongestTask?.correct}/{strongestTask?.total}
                      </div>
                    </div>
                  </div>
                </article>

                <article className="rounded-3xl border border-rose-200 bg-rose-50 p-5">
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-rose-600">
                    Зона внимания
                  </div>

                  <div className="mt-4 flex items-end justify-between gap-4">
                    <div>
                      <div className="text-3xl font-black text-slate-950">
                        №{focusTask?.egeNumber}
                      </div>
                      <div className="mt-1 text-sm text-rose-700/70">
                        стоит повторить
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-2xl font-black text-rose-700">
                        {focusTask?.percent}%
                      </div>
                      <div className="text-xs text-rose-700/60">
                        {focusTask?.incorrect} ошибок
                      </div>
                    </div>
                  </div>
                </article>

                <div className="rounded-3xl border border-slate-200 bg-white p-5">
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">
                    Как читать статистику
                  </div>

                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    Один результат ещё не показывает устойчивый навык. Чем
                    больше решений по номеру, тем точнее становится статистика.
                  </p>

                  <Link
                    href="/student/trainer"
                    className="mt-4 inline-flex text-sm font-bold text-cyan-700 transition hover:text-cyan-900"
                  >
                    Продолжить практику →
                  </Link>
                </div>
              </aside>
            </section>

            <section className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-700">
                    attempts.log
                  </div>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                    История попыток
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Открой нужную попытку, чтобы увидеть ответы и разобрать
                    ошибки.
                  </p>
                </div>

                <div className="rounded-xl bg-slate-100 px-3 py-2 font-mono text-xs text-slate-500">
                  newest → oldest
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {attempts.map((attempt, index) => {
                  const correctAnswers = attempt.answers.filter(
                    (answer) => answer.isCorrect
                  ).length;
                  const incorrectAnswers =
                    attempt.answers.length - correctAnswers;
                  const style = getResultStyle(attempt.percent);

                  return (
                    <details
                      key={attempt.id}
                      className="group overflow-hidden rounded-3xl border border-slate-200 bg-white open:border-cyan-200 open:shadow-md"
                      open={index === 0}
                    >
                      <summary className="cursor-pointer list-none p-4 sm:p-5 [&::-webkit-details-marker]:hidden">
                        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                          <div className="flex min-w-0 items-start gap-4">
                            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-slate-950 font-mono text-sm font-bold text-cyan-300">
                              {String(attempts.length - index).padStart(2, "0")}
                            </div>

                            <div className="min-w-0">
                              <Link
                                href={attempt.href}
                                className="line-clamp-2 text-lg font-black text-slate-950 transition hover:text-cyan-700"
                              >
                                {attempt.title}
                              </Link>

                              <div className="mt-1 text-sm text-slate-500">
                                {formatDate(attempt.submittedAt)}
                              </div>

                              <div className="mt-3 flex flex-wrap gap-2">
                                <span
                                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                    attempt.source === "PRACTICE"
                                      ? "bg-cyan-50 text-cyan-700"
                                      : attempt.source === "VARIANT"
                                        ? "bg-emerald-50 text-emerald-700"
                                        : "bg-violet-50 text-violet-700"
                                  }`}
                                >
                                  {attempt.source === "PRACTICE"
                                    ? "Тренажёр"
                                    : attempt.source === "VARIANT"
                                      ? "Вариант ЕГЭ"
                                      : "Домашнее задание"}
                                </span>
                                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                                  {correctAnswers} верно
                                </span>
                                <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
                                  {incorrectAnswers} ошибок
                                </span>
                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                                  {attempt.answers.length} заданий
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-4 lg:justify-end">
                            <div className="text-right">
                              <div className="text-3xl font-black tracking-tight text-slate-950">
                                {attempt.source === "VARIANT"
                                  ? attempt.egeTestScore
                                  : `${attempt.percent}%`}
                                {attempt.source === "VARIANT" ? (
                                  <span className="ml-1 text-base text-cyan-700">
                                    /100
                                  </span>
                                ) : null}
                              </div>
                              <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400">
                                {attempt.source === "VARIANT"
                                  ? `${attempt.score}/${attempt.maxScore} первичных`
                                  : `${attempt.score}/${attempt.maxScore} баллов`}
                              </div>
                            </div>

                            <span
                              className={`hidden rounded-full border px-3 py-1 text-xs font-bold sm:inline-flex ${style.badge}`}
                            >
                              {style.label}
                            </span>

                            <span className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-slate-500 transition group-open:rotate-180 group-open:border-cyan-200 group-open:text-cyan-700">
                              ↓
                            </span>
                          </div>
                        </div>
                      </summary>

                      <div className="border-t border-slate-200 bg-slate-50/60 p-4 sm:p-5">
                        <div className="mb-4 flex items-center justify-between gap-4">
                          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">
                            answers.review
                          </div>

                          <Link
                            href={attempt.href}
                            className="text-xs font-bold text-cyan-700 hover:text-cyan-900"
                          >
                            {attempt.source === "PRACTICE"
                              ? "Открыть в тренажёре →"
                              : attempt.source === "VARIANT"
                                ? "Открыть разбор варианта →"
                                : "Открыть домашнее задание →"}
                          </Link>
                        </div>

                        <div className="space-y-3">
                          {attempt.answers.map((answer) => (
                            <article
                              key={answer.id}
                              className={`rounded-2xl border p-4 ${
                                answer.isCorrect
                                  ? "border-emerald-200 bg-emerald-50/60"
                                  : "border-rose-200 bg-rose-50/70"
                              }`}
                            >
                              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                <div className="min-w-0">
                                  <div className="flex items-start gap-3">
                                    <span
                                      className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-black ${
                                        answer.isCorrect
                                          ? "bg-emerald-600 text-white"
                                          : "bg-rose-600 text-white"
                                      }`}
                                    >
                                      {answer.isCorrect ? "✓" : "×"}
                                    </span>

                                    <div>
                                      <div className="font-bold leading-6 text-slate-900">
                                        №{answer.task.egeNumber}.{" "}
                                        {answer.task.title}
                                      </div>
                                      <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                                        Задание ЕГЭ №{answer.task.egeNumber}
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <span
                                  className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${
                                    answer.isCorrect
                                      ? "bg-emerald-600 text-white"
                                      : "bg-rose-600 text-white"
                                  }`}
                                >
                                  {answer.isCorrect ? "Верно" : "Ошибка"}
                                </span>
                              </div>

                              <div className="mt-4 grid gap-3 md:grid-cols-2">
                                <div className="rounded-xl border border-white/80 bg-white/80 p-3">
                                  <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-slate-400">
                                    Твой ответ
                                  </div>
                                  <div
                                    className={`mt-2 break-words font-mono text-sm font-bold ${
                                      answer.isCorrect
                                        ? "text-emerald-700"
                                        : "text-rose-700"
                                    }`}
                                  >
                                    {formatAnswerForDisplay(answer.rawAnswer)}
                                  </div>
                                </div>

                                <div className="rounded-xl border border-white/80 bg-white/80 p-3">
                                  <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-slate-400">
                                    Правильный ответ
                                  </div>
                                  <div className="mt-2 break-words font-mono text-sm font-bold text-slate-900">
                                    {formatAnswerForDisplay(
                                      answer.task.correctAnswer
                                    )}
                                  </div>
                                </div>
                              </div>
                            </article>
                          ))}
                        </div>
                      </div>
                    </details>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
