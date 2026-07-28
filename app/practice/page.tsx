import { Prisma } from "@prisma/client";
import type { Metadata } from "next";
import Link from "next/link";

import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Открытый банк заданий",
  description:
    "Бесплатный открытый банк заданий ЕГЭ по информатике с автоматической проверкой.",
};
export const dynamic = "force-dynamic";

type PracticePageProps = {
  searchParams: Promise<{
    q?: string;
    egeNumber?: string;
    page?: string;
  }>;
};

export default async function PracticePage({
  searchParams,
}: PracticePageProps) {
  const params = await searchParams;
  const query = params.q?.trim().slice(0, 200) ?? "";
  const rawEgeNumber = Number(params.egeNumber);
  const rawPage = Number(params.page);
  const page =
    Number.isInteger(rawPage) && rawPage > 0
      ? Math.min(rawPage, 10_000)
      : 1;
  const pageSize = 30;
  const egeNumber =
    Number.isInteger(rawEgeNumber) &&
    rawEgeNumber >= 1 &&
    rawEgeNumber <= 27
      ? rawEgeNumber
      : null;

  const where: Prisma.TaskWhereInput = {
    isPublic: true,
    isArchived: false,
    ...(egeNumber ? { egeNumber } : {}),
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
  };

  const [tasks, totalCount, filteredCount] = await Promise.all([
    prisma.task.findMany({
      where,
      select: {
        id: true,
        egeNumber: true,
        title: true,
        difficulty: true,
        _count: {
          select: {
            attachments: true,
          },
        },
      },
      orderBy: [{ egeNumber: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.task.count({
      where: {
        isPublic: true,
        isArchived: false,
      },
    }),
    prisma.task.count({ where }),
  ]);
  const totalPages = Math.max(1, Math.ceil(filteredCount / pageSize));

  function getPageHref(targetPage: number) {
    const nextParams = new URLSearchParams();

    if (query) nextParams.set("q", query);
    if (egeNumber) nextParams.set("egeNumber", String(egeNumber));
    if (targetPage > 1) nextParams.set("page", String(targetPage));

    const queryString = nextParams.toString();
    return queryString ? `/practice?${queryString}` : "/practice";
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
                Выбирайте номер, решайте задачи и сразу проверяйте ответ.
                Регистрация не требуется.
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

        <section className="mt-5 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <form className="grid gap-3 md:grid-cols-[1fr_190px_auto]">
            <input
              name="q"
              defaultValue={query}
              maxLength={200}
              placeholder="Поиск по названию или условию"
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
            />
            <select
              name="egeNumber"
              defaultValue={egeNumber ?? ""}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-cyan-400"
            >
              <option value="">Все номера ЕГЭ</option>
              {Array.from({ length: 27 }, (_, index) => index + 1).map(
                (number) => (
                  <option key={number} value={number}>
                    Задание №{number}
                  </option>
                )
              )}
            </select>
            <button className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-cyan-700">
              Найти
            </button>
          </form>
        </section>

        {tasks.length === 0 ? (
          <section className="mt-5 rounded-[2rem] border border-dashed border-slate-300 bg-white p-10 text-center">
            <h2 className="text-xl font-black">Задания не найдены</h2>
            <p className="mt-2 text-sm text-slate-500">
              Измените запрос или выберите другой номер.
            </p>
            <Link
              href="/practice"
              className="mt-5 inline-flex rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white"
            >
              Сбросить фильтры
            </Link>
          </section>
        ) : (
          <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {tasks.map((task) => (
              <Link
                key={task.id}
                href={`/practice/${task.id}`}
                className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-md"
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
                <h2 className="mt-4 line-clamp-2 text-lg font-black tracking-tight text-slate-950">
                  {task.title}
                </h2>
                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-xs">
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
