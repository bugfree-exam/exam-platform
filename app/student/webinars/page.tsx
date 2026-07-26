import { Prisma, WebinarVideoProvider } from "@prisma/client";
import Link from "next/link";

import { WebinarFilters } from "@/components/webinars/WebinarFilters";
import { prisma } from "@/lib/prisma";
import { getVideoProviderLabel } from "@/lib/webinarVideo";

type StudentWebinarsPageProps = {
  searchParams: Promise<{
    q?: string;
    provider?: string;
    egeNumber?: string;
    period?: string;
  }>;
};

const VALID_PROVIDERS = ["all", "RUTUBE", "YANDEX_DISK", "EXTERNAL"];
const VALID_PERIODS = ["all", "7d", "30d", "month"];

const webinarDateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function getPeriodStart(period: string) {
  const now = new Date();

  if (period === "7d") {
    const start = new Date(now);
    start.setDate(start.getDate() - 7);
    return start;
  }

  if (period === "30d") {
    const start = new Date(now);
    start.setDate(start.getDate() - 30);
    return start;
  }

  if (period === "month") {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  return null;
}

function getSafeEgeNumber(value: string) {
  const number = Number(value);

  if (!Number.isInteger(number) || number < 1 || number > 27) {
    return null;
  }

  return number;
}

function formatMaterialsCount(count: number) {
  const lastTwoDigits = count % 100;
  const lastDigit = count % 10;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
    return `${count} материалов`;
  }

  if (lastDigit === 1) {
    return `${count} материал`;
  }

  if (lastDigit >= 2 && lastDigit <= 4) {
    return `${count} материала`;
  }

  return `${count} материалов`;
}

function ArrowIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      className="h-5 w-5"
    >
      <path
        d="M4 10h11m-4-4 4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      className="h-4 w-4"
    >
      <path
        d="M16 10H5m4-4-4 4 4 4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-6 w-6"
    >
      <path
        d="m9 7 8 5-8 5V7Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      className="h-4 w-4"
    >
      <path
        d="M3 5h14M5.5 10h9M8 15h4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default async function StudentWebinarsPage({
  searchParams,
}: StudentWebinarsPageProps) {
  const params = await searchParams;

  const selectedQuery = params.q?.trim() ?? "";
  const selectedProvider = VALID_PROVIDERS.includes(params.provider ?? "")
    ? params.provider ?? "all"
    : "all";
  const selectedPeriod = VALID_PERIODS.includes(params.period ?? "")
    ? params.period ?? "all"
    : "all";
  const selectedEgeNumber = params.egeNumber ?? "all";

  const where: Prisma.WebinarWhereInput = {
    status: "PUBLISHED",
  };

  if (selectedProvider !== "all") {
    where.videoProvider = selectedProvider as WebinarVideoProvider;
  }

  if (selectedEgeNumber !== "all") {
    const egeNumber = getSafeEgeNumber(selectedEgeNumber);

    if (egeNumber) {
      where.egeNumber = egeNumber;
    }
  }

  const periodStart = getPeriodStart(selectedPeriod);

  if (periodStart) {
    where.eventDate = {
      gte: periodStart,
    };
  }

  if (selectedQuery) {
    where.OR = [
      {
        title: {
          contains: selectedQuery,
          mode: "insensitive",
        },
      },
      {
        description: {
          contains: selectedQuery,
          mode: "insensitive",
        },
      },
      {
        topic: {
          contains: selectedQuery,
          mode: "insensitive",
        },
      },
    ];
  }

  const webinars = await prisma.webinar.findMany({
    where,
    include: {
      _count: {
        select: {
          materials: true,
        },
      },
    },
    orderBy: [
      {
        eventDate: "desc",
      },
      {
        createdAt: "desc",
      },
    ],
  });

  const activeFiltersCount = [
    Boolean(selectedQuery),
    selectedProvider !== "all",
    selectedEgeNumber !== "all",
    selectedPeriod !== "all",
  ].filter(Boolean).length;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f3f7fa] text-[#102638]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.42]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(23, 78, 105, 0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(23, 78, 105, 0.07) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-32 top-24 h-80 w-80 rounded-full bg-cyan-300/20 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-28 top-[34rem] h-96 w-96 rounded-full bg-sky-300/20 blur-3xl"
      />

      <div className="relative mx-auto max-w-[1240px] px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
        <header className="flex items-center justify-between gap-4 rounded-[24px] border border-white/80 bg-white/80 px-4 py-3 shadow-[0_18px_50px_rgba(16,38,56,0.06)] backdrop-blur-xl sm:px-5">
          <Link
            href="/student"
            className="group flex min-w-0 items-center gap-3"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#0b2436] font-mono text-sm font-bold text-cyan-300 shadow-sm transition-transform group-hover:-rotate-3">
              {"</>"}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold tracking-[-0.01em] text-[#102638] sm:text-base">
                Экзамен без багов
              </span>
              <span className="mt-0.5 hidden font-mono text-[10px] uppercase tracking-[0.16em] text-slate-400 sm:block">
                student learning platform
              </span>
            </span>
          </Link>

          <Link
            href="/student"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-950"
          >
            <BackIcon />
            <span className="hidden sm:inline">В кабинет</span>
          </Link>
        </header>

        <section className="relative mt-5 overflow-hidden rounded-[32px] bg-[#0a2435] px-6 py-7 text-white shadow-[0_28px_80px_rgba(7,31,47,0.22)] sm:px-8 sm:py-9 lg:px-10 lg:py-11">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
          />
          <div
            aria-hidden="true"
            className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl"
          />

          <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-400 sm:text-xs">
                <span>app.bugfree-exam.ru/student/webinars</span>
                <span className="h-1 w-1 rounded-full bg-slate-600" />
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                  published
                </span>
              </div>

              <p className="mt-8 font-mono text-xs uppercase tracking-[0.2em] text-cyan-300">
                Course_library
              </p>
              <h1 className="mt-3 text-3xl font-bold tracking-[-0.04em] sm:text-4xl lg:text-5xl">
                Вебинары и материалы
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                Записи занятий, конспекты, шпаргалки и дополнительные файлы —
                всё, что помогает повторить тему и закрыть пробелы после урока.
              </p>
            </div>

            <div className="grid min-w-[220px] grid-cols-2 gap-3 lg:grid-cols-1">
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-sm">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-400">
                  found_items
                </p>
                <p className="mt-2 text-3xl font-bold tracking-[-0.04em] text-white">
                  {webinars.length}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-sm">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-400">
                  active_filters
                </p>
                <p className="mt-2 text-3xl font-bold tracking-[-0.04em] text-cyan-300">
                  {activeFiltersCount}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-[28px] border border-white/90 bg-white/90 p-4 shadow-[0_24px_70px_rgba(16,38,56,0.07)] backdrop-blur-xl sm:p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">
                <FilterIcon />
                /library/filter
              </div>
              <h2 className="mt-2 text-xl font-bold tracking-[-0.03em] text-[#102638]">
                Найти нужный разбор
              </h2>
            </div>

            {activeFiltersCount > 0 ? (
              <Link
                href="/student/webinars"
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-white hover:text-slate-950"
              >
                Сбросить фильтры
              </Link>
            ) : (
              <span className="inline-flex items-center gap-2 self-start rounded-full bg-emerald-50 px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700 sm:self-auto">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                all materials
              </span>
            )}
          </div>

          <div className="rounded-2xl border border-slate-100 bg-[#f8fbfc] p-3 sm:p-4 [&_button]:min-h-11 [&_button]:rounded-xl [&_button]:border-slate-200 [&_button]:font-semibold [&_button]:shadow-none [&_input]:min-h-11 [&_input]:rounded-xl [&_input]:border-slate-200 [&_input]:bg-white [&_input]:text-[#102638] [&_input]:outline-none [&_input]:transition [&_input:focus]:border-cyan-500 [&_input:focus]:ring-4 [&_input:focus]:ring-cyan-100 [&_label]:font-mono [&_label]:text-[10px] [&_label]:font-semibold [&_label]:uppercase [&_label]:tracking-[0.12em] [&_label]:text-slate-500 [&_select]:min-h-11 [&_select]:rounded-xl [&_select]:border-slate-200 [&_select]:bg-white [&_select]:text-[#102638] [&_select]:outline-none [&_select]:transition [&_select:focus]:border-cyan-500 [&_select:focus]:ring-4 [&_select:focus]:ring-cyan-100">
            <WebinarFilters
              selectedQuery={selectedQuery}
              selectedStatus="PUBLISHED"
              selectedProvider={selectedProvider}
              selectedEgeNumber={selectedEgeNumber}
              selectedPeriod={selectedPeriod}
              showStatusFilter={false}
            />
          </div>
        </section>

        {webinars.length === 0 ? (
          <section className="mt-5 overflow-hidden rounded-[28px] border border-dashed border-slate-300 bg-white/90 px-6 py-14 text-center shadow-[0_24px_70px_rgba(16,38,56,0.05)] backdrop-blur-xl sm:px-10">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#e6f8fb] text-[#0e7181]">
              <PlayIcon />
            </div>
            <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">
              search_result: empty
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-[-0.03em] text-[#102638]">
              По фильтрам ничего не найдено
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-slate-500">
              Попробуйте изменить поисковый запрос, номер задания ЕГЭ, источник
              видео или выбранный период.
            </p>
            {activeFiltersCount > 0 ? (
              <Link
                href="/student/webinars"
                className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-[#0a2435] px-5 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#10354c]"
              >
                Показать все материалы
                <ArrowIcon />
              </Link>
            ) : null}
          </section>
        ) : (
          <section className="mt-5">
            <div className="mb-4 flex items-end justify-between gap-4 px-1">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">
                  /library/items
                </p>
                <h2 className="mt-1 text-2xl font-bold tracking-[-0.03em] text-[#102638]">
                  Доступные материалы
                </h2>
              </div>
              <p className="hidden text-sm text-slate-500 sm:block">
                Найдено: {webinars.length}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {webinars.map((webinar, index) => (
                <Link
                  key={webinar.id}
                  href={`/student/webinars/${webinar.id}`}
                  className="group relative flex min-h-[300px] flex-col overflow-hidden rounded-[28px] border border-white/90 bg-white/90 p-5 shadow-[0_20px_60px_rgba(16,38,56,0.07)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-cyan-200 hover:shadow-[0_28px_75px_rgba(16,38,56,0.12)] sm:p-6"
                >
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-cyan-200/25 blur-3xl transition group-hover:bg-cyan-200/40"
                  />

                  <div className="relative flex items-start justify-between gap-4">
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-[#e6f8fb] px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-[#0e7181]">
                        {getVideoProviderLabel(webinar.videoProvider)}
                      </span>

                      {webinar.egeNumber ? (
                        <span className="rounded-full bg-violet-50 px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-violet-700">
                          ЕГЭ №{webinar.egeNumber}
                        </span>
                      ) : null}
                    </div>

                    <span className="shrink-0 font-mono text-xs font-semibold text-slate-300">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>

                  <div className="relative mt-6 flex flex-1 flex-col">
                    {webinar.topic ? (
                      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-700">
                        {webinar.topic}
                      </p>
                    ) : (
                      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                        webinar_record
                      </p>
                    )}

                    <h3 className="mt-2 text-xl font-bold leading-snug tracking-[-0.025em] text-[#102638] transition group-hover:text-[#0e7181] sm:text-2xl">
                      {webinar.title}
                    </h3>

                    {webinar.description ? (
                      <p className="mt-3 text-sm leading-6 text-slate-500">
                        {webinar.description}
                      </p>
                    ) : (
                      <p className="mt-3 text-sm leading-6 text-slate-400">
                        Откройте запись занятия и прикреплённые учебные материалы.
                      </p>
                    )}
                  </div>

                  <div className="relative mt-6 border-t border-slate-100 pt-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                      <div className="grid gap-1.5">
                        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400">
                          event_date
                        </p>
                        <p className="text-sm font-semibold text-slate-700">
                          {webinar.eventDate
                            ? webinarDateFormatter.format(webinar.eventDate)
                            : "Дата не указана"}
                        </p>
                      </div>

                      <div className="flex items-center justify-between gap-4 sm:justify-end">
                        <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                          {formatMaterialsCount(webinar._count.materials)}
                        </span>
                        <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#0a2435] text-cyan-300 transition group-hover:translate-x-0.5 group-hover:bg-[#10354c]">
                          <ArrowIcon />
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <footer className="mt-8 flex flex-col gap-2 border-t border-slate-200/70 px-1 py-6 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <span>bugfree_exam / student_library</span>
          <span>status: synchronized</span>
        </footer>
      </div>
    </main>
  );
}