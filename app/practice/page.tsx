import { Prisma } from "@prisma/client";
import type { Metadata } from "next";
import Link from "next/link";

import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Открытый банк заданий",
  description:
    "Бесплатный открытый банк заданий ЕГЭ по информатике с выбором номера, темы и автоматической проверкой.",
};
export const dynamic = "force-dynamic";

type SearchParamValue = string | string[] | undefined;

type PracticePageProps = {
  searchParams: Promise<{
    q?: SearchParamValue;
    egeNumber?: SearchParamValue;
    topic?: SearchParamValue;
    page?: SearchParamValue;
  }>;
};

function readSearchParam(value: SearchParamValue) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function getPracticeHref({
  egeNumber,
  topic,
  query,
  page,
}: {
  egeNumber?: number | null;
  topic?: string | null;
  query?: string;
  page?: number;
}) {
  const params = new URLSearchParams();

  if (egeNumber) params.set("egeNumber", String(egeNumber));
  if (topic) params.set("topic", topic);
  if (query) params.set("q", query);
  if (page && page > 1) params.set("page", String(page));

  const queryString = params.toString();
  return queryString ? `/practice?${queryString}` : "/practice";
}

function getTaskHref(taskId: string, topic: string | null) {
  if (!topic) return `/practice/${taskId}`;
  const params = new URLSearchParams({ topic });
  return `/practice/${taskId}?${params.toString()}`;
}

function formatTaskCount(count: number) {
  const lastTwoDigits = count % 100;
  const lastDigit = count % 10;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return `${count} задач`;
  if (lastDigit === 1) return `${count} задача`;
  if (lastDigit >= 2 && lastDigit <= 4) return `${count} задачи`;
  return `${count} задач`;
}

export default async function PracticePage({
  searchParams,
}: PracticePageProps) {
  const params = await searchParams;
  const query = readSearchParam(params.q).trim().slice(0, 200);
  const requestedTopic = readSearchParam(params.topic).trim().slice(0, 120);
  const rawEgeNumber = Number(readSearchParam(params.egeNumber));
  const rawPage = Number(readSearchParam(params.page));
  const page =
    Number.isInteger(rawPage) && rawPage > 0
      ? Math.min(rawPage, 10_000)
      : 1;
  const pageSize = 30;

  const publicTasksWhere: Prisma.TaskWhereInput = {
    isPublic: true,
    isArchived: false,
  };

  const [totalCount, numberGroups] = await Promise.all([
    prisma.task.count({ where: publicTasksWhere }),
    prisma.task.groupBy({
      by: ["egeNumber"],
      where: publicTasksWhere,
      _count: { _all: true },
      orderBy: { egeNumber: "asc" },
    }),
  ]);
  const numberCounts = new Map(
    numberGroups.map((group) => [group.egeNumber, group._count._all])
  );
  const egeNumber =
    Number.isInteger(rawEgeNumber) &&
    rawEgeNumber >= 1 &&
    rawEgeNumber <= 27 &&
    (numberCounts.get(rawEgeNumber) ?? 0) > 0
      ? rawEgeNumber
      : null;

  const topicGroups = egeNumber
    ? await prisma.task.groupBy({
        by: ["skillTag"],
        where: {
          ...publicTasksWhere,
          egeNumber,
        },
        _count: { _all: true },
        orderBy: { skillTag: "asc" },
      })
    : [];
  const topicCounts = new Map<string, number>();

  for (const group of topicGroups) {
    const topic = group.skillTag?.trim();
    if (!topic) continue;
    topicCounts.set(topic, (topicCounts.get(topic) ?? 0) + group._count._all);
  }

  const topics = Array.from(topicCounts, ([title, count]) => ({ title, count }));
  const selectedTopic = topicCounts.has(requestedTopic)
    ? requestedTopic
    : null;
  const taskWhere: Prisma.TaskWhereInput | null = egeNumber
    ? {
        ...publicTasksWhere,
        egeNumber,
        ...(selectedTopic ? { skillTag: selectedTopic } : {}),
        ...(query
          ? {
              OR: [
                {
                  title: {
                    contains: query,
                    mode: "insensitive",
                  },
                },
                {
                  statementHtml: {
                    contains: query,
                    mode: "insensitive",
                  },
                },
              ],
            }
          : {}),
      }
    : null;

  const [tasks, filteredCount] = taskWhere
    ? await Promise.all([
        prisma.task.findMany({
          where: taskWhere,
          select: {
            id: true,
            egeNumber: true,
            title: true,
            difficulty: true,
            skillTag: true,
            _count: {
              select: {
                attachments: true,
              },
            },
          },
          orderBy: [{ skillTag: "asc" }, { createdAt: "desc" }],
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        prisma.task.count({ where: taskWhere }),
      ])
    : [[], 0];
  const totalPages = Math.max(1, Math.ceil(filteredCount / pageSize));

  function getPageHref(targetPage: number) {
    return getPracticeHref({
      egeNumber,
      topic: selectedTopic,
      query,
      page: targetPage,
    });
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f4f7f8] px-4 py-5 text-slate-950 sm:px-6 sm:py-8">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.32]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(15,23,42,0.045) 1px, transparent 1px), linear-gradient(90deg,rgba(15,23,42,0.045) 1px,transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="relative mx-auto max-w-7xl">
        <nav className="flex items-center justify-between gap-4 rounded-2xl border border-white/80 bg-white/85 px-4 py-3 shadow-sm backdrop-blur">
          <Link href="/practice" className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-950 font-mono text-sm font-black text-cyan-300">
              &lt;/&gt;
            </span>
            <span>
              <span className="block text-sm font-black">Экзамен без багов</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-400">
                open.practice
              </span>
            </span>
          </Link>
          <Link
            href="/login"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-cyan-300 hover:text-cyan-800"
          >
            Войти в курс
          </Link>
        </nav>

        <header className="relative mt-5 overflow-hidden rounded-[2rem] bg-slate-950 px-5 py-8 text-white shadow-xl sm:px-9 sm:py-10">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
          <div className="relative grid gap-7 lg:grid-cols-[1fr_280px] lg:items-end">
            <div>
              <span className="inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-cyan-200">
                без регистрации
              </span>
              <h1 className="mt-5 text-3xl font-black tracking-[-0.04em] sm:text-5xl">
                Открытый банк заданий ЕГЭ
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                Сначала выберите номер, затем тему или проверяемый навык — и
                решайте только подходящие вам задания.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">
                Доступно сейчас
              </div>
              <div className="mt-2 text-5xl font-black text-cyan-300">
                {totalCount}
              </div>
              <div className="mt-1 text-sm text-slate-400">заданий</div>
            </div>
          </div>
        </header>

        <section className="mt-5 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-700">
                шаг 1
              </div>
              <h2 className="mt-2 text-2xl font-black tracking-tight">
                Выберите номер задания
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Сразу видно, сколько задач доступно для каждого номера.
              </p>
            </div>
            {egeNumber ? (
              <Link
                href="/practice"
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 transition hover:border-cyan-300 hover:text-cyan-800"
              >
                Сбросить выбор
              </Link>
            ) : null}
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-9">
            {Array.from({ length: 27 }, (_, index) => index + 1).map(
              (number) => {
                const count = numberCounts.get(number) ?? 0;
                const isSelected = number === egeNumber;

                return count > 0 ? (
                  <Link
                    key={number}
                    href={getPracticeHref({ egeNumber: number })}
                    aria-current={isSelected ? "page" : undefined}
                    className={`group rounded-2xl border px-3 py-3 text-left transition sm:px-4 ${
                      isSelected
                        ? "border-cyan-500 bg-slate-950 text-white shadow-md ring-4 ring-cyan-100"
                        : "border-slate-200 bg-slate-50 text-slate-900 hover:-translate-y-0.5 hover:border-cyan-300 hover:bg-cyan-50"
                    }`}
                  >
                    <span className="block text-xl font-black">№{number}</span>
                    <span
                      className={`mt-1 block text-[11px] font-semibold ${
                        isSelected ? "text-cyan-200" : "text-slate-400"
                      }`}
                    >
                      {formatTaskCount(count)}
                    </span>
                  </Link>
                ) : (
                  <div
                    key={number}
                    aria-disabled="true"
                    className="rounded-2xl border border-dashed border-slate-200 px-3 py-3 text-left text-slate-300 sm:px-4"
                  >
                    <span className="block text-xl font-black">№{number}</span>
                    <span className="mt-1 block text-[11px] font-semibold">
                      пока нет
                    </span>
                  </div>
                );
              }
            )}
          </div>
        </section>

        {egeNumber ? (
          <section className="mt-5 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-700">
              шаг 2
            </div>
            <h2 className="mt-2 text-2xl font-black tracking-tight">
              {topics.length > 0
                ? "Выберите тему или навык"
                : `Задание №${egeNumber}`}
            </h2>

            {topics.length > 0 ? (
              <>
                <p className="mt-2 text-sm text-slate-500">
                  Можно открыть все задачи номера или сузить подборку до одной
                  темы.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Link
                    href={getPracticeHref({ egeNumber, query })}
                    aria-current={!selectedTopic ? "page" : undefined}
                    className={`rounded-full border px-4 py-2.5 text-sm font-bold transition ${
                      !selectedTopic
                        ? "border-slate-950 bg-slate-950 text-white"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:border-cyan-300"
                    }`}
                  >
                    Все темы · {numberCounts.get(egeNumber) ?? 0}
                  </Link>
                  {topics.map((topic) => (
                    <Link
                      key={topic.title}
                      href={getPracticeHref({
                        egeNumber,
                        topic: topic.title,
                        query,
                      })}
                      aria-current={
                        selectedTopic === topic.title ? "page" : undefined
                      }
                      className={`rounded-full border px-4 py-2.5 text-sm font-bold transition ${
                        selectedTopic === topic.title
                          ? "border-cyan-500 bg-cyan-50 text-cyan-900 ring-2 ring-cyan-100"
                          : "border-slate-200 bg-slate-50 text-slate-700 hover:border-cyan-300"
                      }`}
                    >
                      {topic.title} · {topic.count}
                    </Link>
                  ))}
                </div>
              </>
            ) : (
              <p className="mt-2 text-sm text-slate-500">
                Для этого номера деление по темам не требуется — можно сразу
                переходить к решению.
              </p>
            )}

            <form className="mt-6 grid gap-3 border-t border-slate-100 pt-5 sm:grid-cols-[1fr_auto]">
              <input type="hidden" name="egeNumber" value={egeNumber} />
              {selectedTopic ? (
                <input type="hidden" name="topic" value={selectedTopic} />
              ) : null}
              <input
                name="q"
                defaultValue={query}
                maxLength={200}
                placeholder="Поиск внутри выбранного номера"
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
              />
              <button className="rounded-xl bg-slate-950 px-6 py-3 text-sm font-black text-white transition hover:bg-cyan-700">
                Найти
              </button>
            </form>
          </section>
        ) : null}

        {!egeNumber ? (
          <section className="mt-5 rounded-[2rem] border border-dashed border-cyan-200 bg-cyan-50/60 p-8 text-center sm:p-12">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white text-2xl shadow-sm">
              ↑
            </div>
            <h2 className="mt-4 text-xl font-black">
              Начните с номера задания
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">
              Банк больше не показывает случайную общую ленту. Выберите номер
              выше, чтобы увидеть только нужные задачи.
            </p>
          </section>
        ) : tasks.length === 0 ? (
          <section className="mt-5 rounded-[2rem] border border-dashed border-slate-300 bg-white p-10 text-center">
            <h2 className="text-xl font-black">Задания не найдены</h2>
            <p className="mt-2 text-sm text-slate-500">
              Измените поисковый запрос или выберите другую тему.
            </p>
            <Link
              href={getPracticeHref({
                egeNumber,
                topic: selectedTopic,
              })}
              className="mt-5 inline-flex rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white"
            >
              Сбросить поиск
            </Link>
          </section>
        ) : (
          <section className="mt-5">
            <div className="flex flex-wrap items-end justify-between gap-3 px-1">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-700">
                  шаг 3
                </div>
                <h2 className="mt-2 text-2xl font-black tracking-tight">
                  Задания №{egeNumber}
                </h2>
                {selectedTopic ? (
                  <p className="mt-1 text-sm font-semibold text-cyan-800">
                    {selectedTopic}
                  </p>
                ) : null}
              </div>
              <span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600">
                Найдено: {filteredCount}
              </span>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {tasks.map((task) => (
                <Link
                  key={task.id}
                  href={getTaskHref(task.id, selectedTopic)}
                  className="group flex min-h-48 flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-4">
                    <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-black text-cyan-700">
                      №{task.egeNumber} ЕГЭ
                    </span>
                    {task.difficulty ? (
                      <span className="text-xs font-semibold text-slate-400">
                        Сложность {task.difficulty}/5
                      </span>
                    ) : null}
                  </div>
                  <h3 className="mt-4 line-clamp-2 text-lg font-black tracking-tight text-slate-950">
                    {task.title}
                  </h3>
                  {task.skillTag ? (
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">
                      {task.skillTag}
                    </p>
                  ) : null}
                  <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-4 text-xs">
                    <span className="text-slate-400">
                      {task._count.attachments > 0
                        ? `Файлов: ${task._count.attachments}`
                        : "Без файлов"}
                    </span>
                    <span className="font-black text-cyan-700 transition group-hover:translate-x-1">
                      Решить →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {filteredCount > 0 && totalPages > 1 ? (
          <nav className="mt-6 flex items-center justify-center gap-3">
            {page > 1 ? (
              <Link
                href={getPageHref(page - 1)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700"
              >
                ← Назад
              </Link>
            ) : null}
            <span className="rounded-xl bg-slate-950 px-4 py-2.5 font-mono text-xs text-white">
              {Math.min(page, totalPages)} / {totalPages}
            </span>
            {page < totalPages ? (
              <Link
                href={getPageHref(page + 1)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700"
              >
                Вперёд →
              </Link>
            ) : null}
          </nav>
        ) : null}
      </div>
    </main>
  );
}
