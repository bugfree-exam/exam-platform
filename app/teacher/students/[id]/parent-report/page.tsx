import Link from "next/link";
import { notFound } from "next/navigation";

import { CopyReportButton } from "@/components/homeworks/CopyReportButton";
import { PrintReportButton } from "@/components/reports/PrintReportButton";
import { prisma } from "@/lib/prisma";

type ParentReportPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    period?: string;
  }>;
};

const REPORT_PERIODS = [
  {
    value: "all",
    label: "За всё время",
  },
  {
    value: "7d",
    label: "Последние 7 дней",
  },
  {
    value: "30d",
    label: "Последние 30 дней",
  },
  {
    value: "month",
    label: "Текущий месяц",
  },
] as const;

type ReportPeriod = (typeof REPORT_PERIODS)[number]["value"];

function getReportPeriod(value: string | undefined): ReportPeriod {
  if (value === "7d" || value === "30d" || value === "month") {
    return value;
  }

  return "all";
}

function getPeriodInfo(period: ReportPeriod) {
  const now = new Date();

  if (period === "all") {
    return {
      start: null as Date | null,
      end: null as Date | null,
      label: "за всё время",
    };
  }

  if (period === "7d") {
    const start = new Date(now);
    start.setDate(start.getDate() - 7);

    return {
      start,
      end: now,
      label: "за последние 7 дней",
    };
  }

  if (period === "30d") {
    const start = new Date(now);
    start.setDate(start.getDate() - 30);

    return {
      start,
      end: now,
      label: "за последние 30 дней",
    };
  }

  const start = new Date(now.getFullYear(), now.getMonth(), 1);

  return {
    start,
    end: now,
    label: "за текущий месяц",
  };
}

function isDateInPeriod({
  date,
  start,
  end,
}: {
  date: Date | null;
  start: Date | null;
  end: Date | null;
}) {
  if (!start || !end) {
    return true;
  }

  if (!date) {
    return false;
  }

  return date >= start && date <= end;
}

function formatDate(date: Date | null) {
  if (!date) {
    return "—";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "short",
  }).format(date);
}

function formatDateTime(date: Date | null) {
  if (!date) {
    return "—";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function getResultLabel(percent: number) {
  if (percent === 100) {
    return "отлично";
  }

  if (percent >= 80) {
    return "хорошо";
  }

  if (percent >= 50) {
    return "есть ошибки";
  }

  return "требуется разбор";
}

function getResultClass(percent: number) {
  if (percent >= 80) {
    return "bg-emerald-50 text-emerald-700";
  }

  if (percent >= 50) {
    return "bg-amber-50 text-amber-700";
  }

  return "bg-red-50 text-red-700";
}

export default async function ParentReportPage({
  params,
  searchParams,
}: ParentReportPageProps) {
  const { id } = await params;
  const query = await searchParams;

  const selectedPeriod = getReportPeriod(query.period);
  const periodInfo = getPeriodInfo(selectedPeriod);

  const student = await prisma.user.findFirst({
    where: {
      id,
      role: "STUDENT",
    },
    include: {
      assignedHomeworks: {
        where: {
          homework: {
            status: {
              not: "ARCHIVED",
            },
          },
        },
        include: {
          homework: {
            include: {
              tasks: {
                include: {
                  taskRevision: {
                    select: {
                      id: true,
                      egeNumber: true,
                      title: true,
                    },
                  },
                },
                orderBy: {
                  order: "asc",
                },
              },
            },
          },
        },
        orderBy: {
          assignedAt: "desc",
        },
      },
      attempts: {
        where: {
          status: "SUBMITTED",
          homework: {
            status: {
              not: "ARCHIVED",
            },
          },
        },
        include: {
          homework: {
            select: {
              id: true,
              title: true,
              deadline: true,
            },
          },
          answers: {
            include: {
              taskRevision: {
                select: {
                  id: true,
                  egeNumber: true,
                  title: true,
                },
              },
            },
          },
        },
        orderBy: {
          submittedAt: "desc",
        },
      },
    },
  });

  if (!student) {
    notFound();
  }

  const latestAttemptByHomework = new Map<
    string,
    (typeof student.attempts)[number]
  >();

  for (const attempt of student.attempts) {
    if (!latestAttemptByHomework.has(attempt.homeworkId)) {
      latestAttemptByHomework.set(attempt.homeworkId, attempt);
    }
  }

  const allHomeworkRows = student.assignedHomeworks.map((assignment) => {
    const attempt = latestAttemptByHomework.get(assignment.homeworkId);

    const wrongAnswers = attempt
      ? attempt.answers.filter((answer) => !answer.isCorrect)
      : [];

    const weakNumbers = Array.from(
      new Set(wrongAnswers.map((answer) => answer.taskRevision.egeNumber))
    ).sort((a, b) => a - b);

    return {
      assignment,
      attempt,
      wrongAnswers,
      weakNumbers,
    };
  });

  const homeworkRows = allHomeworkRows.filter((row) => {
    if (!periodInfo.start || !periodInfo.end) {
      return true;
    }

    return (
      isDateInPeriod({
        date: row.assignment.assignedAt,
        start: periodInfo.start,
        end: periodInfo.end,
      }) ||
      isDateInPeriod({
        date: row.assignment.homework.deadline,
        start: periodInfo.start,
        end: periodInfo.end,
      }) ||
      isDateInPeriod({
        date: row.attempt?.submittedAt ?? null,
        start: periodInfo.start,
        end: periodInfo.end,
      })
    );
  });

  const assignedCount = homeworkRows.length;
  const submittedRows = homeworkRows.filter((row) => row.attempt);
  const submittedCount = submittedRows.length;
  const notSubmittedCount = assignedCount - submittedCount;

  const averagePercent =
    submittedRows.length === 0
      ? 0
      : Math.round(
          submittedRows.reduce(
            (sum, row) => sum + (row.attempt?.percent ?? 0),
            0
          ) / submittedRows.length
        );

  const totalCorrect = submittedRows.reduce(
    (sum, row) => sum + (row.attempt?.score ?? 0),
    0
  );

  const totalMax = submittedRows.reduce(
    (sum, row) => sum + (row.attempt?.maxScore ?? 0),
    0
  );

  const weakNumberStats = new Map<
    number,
    {
      errors: number;
      titles: Set<string>;
    }
  >();

  for (const row of homeworkRows) {
    for (const answer of row.wrongAnswers) {
      const current = weakNumberStats.get(answer.taskRevision.egeNumber) ?? {
        errors: 0,
        titles: new Set<string>(),
      };

      current.errors += 1;
      current.titles.add(answer.taskRevision.title);

      weakNumberStats.set(answer.taskRevision.egeNumber, current);
    }
  }

  const weakNumbers = Array.from(weakNumberStats.entries())
    .map(([egeNumber, stat]) => ({
      egeNumber,
      errors: stat.errors,
      titles: Array.from(stat.titles),
    }))
    .sort((a, b) => b.errors - a.errors)
    .slice(0, 8);

  const strongestRows = submittedRows
    .filter((row) => (row.attempt?.percent ?? 0) >= 80)
    .slice(0, 5);

  const needsAttentionRows = homeworkRows.filter((row) => {
    if (!row.attempt) {
      return true;
    }

    return row.attempt.percent < 70;
  });

  const reportText = [
    `Отчёт по домашним заданиям: ${student.name}`,
    `Период: ${periodInfo.label}`,
    `Дата отчёта: ${formatDate(new Date())}`,
    "",
    `Всего выдано ДЗ в периоде: ${assignedCount}`,
    `Сдано: ${submittedCount}`,
    `Не сдано: ${notSubmittedCount}`,
    `Средний результат по сданным ДЗ: ${averagePercent}%`,
    totalMax > 0 ? `Верных ответов: ${totalCorrect}/${totalMax}` : "",
    "",
    "Краткая сводка по ДЗ:",
    ...homeworkRows.map((row) => {
      if (!row.attempt) {
        return `• ${row.assignment.homework.title}: не сдано`;
      }

      const weak = row.weakNumbers.length
        ? `, повторить ${row.weakNumbers
            .map((number) => `№${number}`)
            .join(", ")}`
        : "";

      return `• ${row.assignment.homework.title}: ${row.attempt.score}/${row.attempt.maxScore} (${row.attempt.percent}%)${weak}`;
    }),
    "",
    weakNumbers.length > 0
      ? `Что стоит повторить: ${weakNumbers
          .map((item) => `№${item.egeNumber}`)
          .join(", ")}`
      : "Ошибок по сданным ДЗ сейчас нет.",
    "",
    needsAttentionRows.length > 0
      ? "Рекомендация: разобрать ошибки и закрыть несданные домашние задания."
      : "Рекомендация: продолжать в том же темпе и закреплять результат.",
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-8 print:bg-white print:px-0 print:py-0">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link
            href={`/teacher/students/${student.id}`}
            className="text-sm font-medium text-cyan-700 hover:text-cyan-900"
          >
            ← К карточке ученика
          </Link>

          <div className="flex flex-wrap gap-2">
            <CopyReportButton text={reportText} />
            <PrintReportButton />
          </div>
        </div>

        <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm print:hidden">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-slate-950">
              Период отчёта
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Выбери период, за который нужно сформировать отчёт для родителей.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {REPORT_PERIODS.map((period) => (
              <Link
                key={period.value}
                href={`/teacher/students/${student.id}/parent-report${
                  period.value === "all" ? "" : `?period=${period.value}`
                }`}
                className={
                  selectedPeriod === period.value
                    ? "rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
                    : "rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                }
              >
                {period.label}
              </Link>
            ))}
          </div>
        </section>

        <article className="rounded-3xl bg-white p-8 shadow-sm print:rounded-none print:p-0 print:shadow-none">
          <header className="border-b border-slate-200 pb-6">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">
              Экзамен без багов
            </div>

            <div className="mt-5 flex flex-wrap items-start justify-between gap-5">
              <div>
                <h1 className="text-3xl font-black text-slate-950">
                  Отчёт по домашним заданиям
                </h1>

                <p className="mt-2 text-lg font-semibold text-slate-700">
                  {student.name}
                </p>

                <p className="mt-1 text-sm text-slate-500">{student.email}</p>

                <div className="mt-4 inline-flex rounded-full bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-700">
                  Период: {periodInfo.label}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 px-5 py-4 text-right">
                <div className="text-sm font-medium text-slate-500">
                  Дата отчёта
                </div>
                <div className="mt-1 text-xl font-bold text-slate-950">
                  {formatDate(new Date())}
                </div>
              </div>
            </div>
          </header>

          <section className="grid gap-4 py-6 md:grid-cols-4 print:grid-cols-4">
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-sm font-medium text-slate-500">Выдано ДЗ</div>
              <div className="mt-2 text-3xl font-black text-slate-950">
                {assignedCount}
              </div>
            </div>

            <div className="rounded-2xl bg-emerald-50 p-4">
              <div className="text-sm font-medium text-emerald-700">Сдано</div>
              <div className="mt-2 text-3xl font-black text-emerald-800">
                {submittedCount}
              </div>
            </div>

            <div className="rounded-2xl bg-amber-50 p-4">
              <div className="text-sm font-medium text-amber-700">Не сдано</div>
              <div className="mt-2 text-3xl font-black text-amber-800">
                {notSubmittedCount}
              </div>
            </div>

            <div className="rounded-2xl bg-cyan-50 p-4">
              <div className="text-sm font-medium text-cyan-700">
                Средний результат
              </div>
              <div className="mt-2 text-3xl font-black text-cyan-800">
                {averagePercent}%
              </div>
            </div>
          </section>

          <section className="border-t border-slate-200 py-6">
            <h2 className="text-2xl font-bold text-slate-950">
              Общий вывод
            </h2>

            <div className="mt-4 rounded-2xl bg-slate-50 p-5 text-sm leading-7 text-slate-700">
              {assignedCount === 0 ? (
                <p>
                  За выбранный период активных домашних заданий не найдено.
                  Можно выбрать другой период или сформировать отчёт за всё
                  время.
                </p>
              ) : submittedCount === 0 ? (
                <p>
                  За выбранный период нет отправленных домашних заданий.
                  Основная задача — начать регулярно сдавать работы, чтобы
                  появилась статистика по ошибкам и прогрессу.
                </p>
              ) : averagePercent >= 80 && notSubmittedCount === 0 ? (
                <p>
                  У ученика хороший темп работы: домашние задания сдаются, а
                  средний результат находится на высоком уровне. Рекомендуется
                  продолжать закреплять результат и точечно разбирать оставшиеся
                  ошибки.
                </p>
              ) : averagePercent >= 50 ? (
                <p>
                  У ученика есть рабочая база, но часть заданий требует
                  дополнительного разбора. Важно закрыть ошибки по указанным
                  номерам ЕГЭ и не накапливать несданные домашние задания.
                </p>
              ) : (
                <p>
                  Сейчас важно сфокусироваться не на проценте, а на регулярности
                  и разборе ошибок. Рекомендуется разобрать проблемные задания
                  вместе с преподавателем и затем повторить похожие задачи.
                </p>
              )}
            </div>
          </section>

          <section className="border-t border-slate-200 py-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-950">
                  Что требует внимания
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Несданные ДЗ и задания с низким результатом за выбранный
                  период.
                </p>
              </div>

              <div className="rounded-full bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">
                {needsAttentionRows.length} пунктов
              </div>
            </div>

            {needsAttentionRows.length === 0 ? (
              <div className="mt-4 rounded-2xl bg-emerald-50 p-5 text-sm leading-6 text-emerald-800">
                Критичных проблем нет: нет несданных ДЗ и результатов ниже 70%.
              </div>
            ) : (
              <div className="mt-4 grid gap-3">
                {needsAttentionRows.map((row) => (
                  <div
                    key={row.assignment.id}
                    className="rounded-2xl border border-red-100 bg-red-50 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="font-bold text-slate-950">
                          {row.assignment.homework.title}
                        </div>
                        <div className="mt-1 text-sm text-red-800">
                          {row.attempt
                            ? `Результат ${row.attempt.percent}%`
                            : "Работа пока не сдана"}
                        </div>
                      </div>

                      {row.weakNumbers.length > 0 ? (
                        <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-red-700">
                          Повторить{" "}
                          {row.weakNumbers
                            .map((number) => `№${number}`)
                            .join(", ")}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="border-t border-slate-200 py-6">
            <h2 className="text-2xl font-bold text-slate-950">
              Номера ЕГЭ, которые стоит повторить
            </h2>

            {weakNumbers.length === 0 ? (
              <div className="mt-4 rounded-2xl bg-emerald-50 p-5 text-sm leading-6 text-emerald-800">
                По сданным домашним заданиям за выбранный период ошибок нет.
              </div>
            ) : (
              <div className="mt-4 grid gap-3 md:grid-cols-2 print:grid-cols-2">
                {weakNumbers.map((item) => (
                  <div
                    key={item.egeNumber}
                    className="rounded-2xl bg-slate-50 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-lg font-black text-slate-950">
                          №{item.egeNumber} ЕГЭ
                        </div>
                        <div className="mt-1 text-sm text-slate-500">
                          Ошибок: {item.errors}
                        </div>
                      </div>

                      <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                        Повторить
                      </div>
                    </div>

                    {item.titles.length > 0 ? (
                      <div className="mt-3 text-sm leading-6 text-slate-600">
                        {item.titles.slice(0, 2).join("; ")}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </section>

          {strongestRows.length > 0 ? (
            <section className="border-t border-slate-200 py-6">
              <h2 className="text-2xl font-bold text-slate-950">
                Сильные результаты
              </h2>

              <div className="mt-4 grid gap-3">
                {strongestRows.map((row) => (
                  <div
                    key={row.assignment.id}
                    className="rounded-2xl bg-emerald-50 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="font-bold text-slate-950">
                          {row.assignment.homework.title}
                        </div>
                        <div className="mt-1 text-sm text-emerald-800">
                          Работа выполнена на хорошем уровне.
                        </div>
                      </div>

                      <div className="rounded-full bg-white px-3 py-1 text-sm font-bold text-emerald-700">
                        {row.attempt?.percent}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className="border-t border-slate-200 py-6">
            <h2 className="text-2xl font-bold text-slate-950">
              Детализация по домашним заданиям
            </h2>

            {homeworkRows.length === 0 ? (
              <div className="mt-4 rounded-2xl bg-slate-50 p-5 text-sm leading-6 text-slate-600">
                За выбранный период активных домашних заданий не найдено.
              </div>
            ) : (
              <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="border-b border-slate-200 px-4 py-3">
                        Домашнее задание
                      </th>
                      <th className="border-b border-slate-200 px-4 py-3">
                        Выдано
                      </th>
                      <th className="border-b border-slate-200 px-4 py-3">
                        Дедлайн
                      </th>
                      <th className="border-b border-slate-200 px-4 py-3">
                        Статус
                      </th>
                      <th className="border-b border-slate-200 px-4 py-3">
                        Результат
                      </th>
                      <th className="border-b border-slate-200 px-4 py-3">
                        Ошибки
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {homeworkRows.map((row) => (
                      <tr key={row.assignment.id}>
                        <td className="border-b border-slate-100 px-4 py-3 font-semibold text-slate-950">
                          {row.assignment.homework.title}
                        </td>
                        <td className="border-b border-slate-100 px-4 py-3 text-slate-600">
                          {formatDate(row.assignment.assignedAt)}
                        </td>
                        <td className="border-b border-slate-100 px-4 py-3 text-slate-600">
                          {formatDate(row.assignment.homework.deadline)}
                        </td>
                        <td className="border-b border-slate-100 px-4 py-3">
                          {row.attempt ? (
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${getResultClass(
                                row.attempt.percent
                              )}`}
                            >
                              {getResultLabel(row.attempt.percent)}
                            </span>
                          ) : (
                            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                              не сдано
                            </span>
                          )}
                        </td>
                        <td className="border-b border-slate-100 px-4 py-3 font-semibold text-slate-950">
                          {row.attempt
                            ? `${row.attempt.score}/${row.attempt.maxScore} (${row.attempt.percent}%)`
                            : "—"}
                        </td>
                        <td className="border-b border-slate-100 px-4 py-3 text-slate-600">
                          {row.weakNumbers.length > 0
                            ? row.weakNumbers
                                .map((number) => `№${number}`)
                                .join(", ")
                            : row.attempt
                              ? "нет"
                              : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <footer className="border-t border-slate-200 pt-6 text-sm leading-6 text-slate-500">
            <div>
              Отчёт сформирован автоматически на основе выполненных домашних
              заданий на платформе “Экзамен без багов”.
            </div>
            <div className="mt-1">
              Период отчёта: {periodInfo.label}.
            </div>
            <div className="mt-1">
              Последнее обновление: {formatDateTime(new Date())}
            </div>
          </footer>
        </article>
      </div>
    </main>
  );
}
