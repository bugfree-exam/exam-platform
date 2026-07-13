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

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <Link
            href="/student"
            className="text-sm font-medium text-cyan-700 hover:text-cyan-900"
          >
            ← Кабинет ученика
          </Link>

          <h1 className="mt-3 text-3xl font-bold text-slate-950">
            Вебинары и материалы
          </h1>

          <p className="mt-2 text-slate-600">
            Записи занятий, конспекты, шпаргалки и дополнительные материалы.
          </p>
        </header>

        <WebinarFilters
          selectedQuery={selectedQuery}
          selectedStatus="PUBLISHED"
          selectedProvider={selectedProvider}
          selectedEgeNumber={selectedEgeNumber}
          selectedPeriod={selectedPeriod}
          showStatusFilter={false}
        />

        {webinars.length === 0 ? (
          <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <h2 className="text-xl font-bold text-slate-950">
              По фильтрам ничего не найдено
            </h2>
            <p className="mt-2 text-slate-600">
              Попробуй изменить поиск, номер ЕГЭ, источник или период.
            </p>
          </section>
        ) : (
          <section className="grid gap-4 md:grid-cols-2">
            {webinars.map((webinar) => (
              <Link
                key={webinar.id}
                href={`/student/webinars/${webinar.id}`}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">
                    {getVideoProviderLabel(webinar.videoProvider)}
                  </span>

                  {webinar.egeNumber ? (
                    <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                      №{webinar.egeNumber} ЕГЭ
                    </span>
                  ) : null}

                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    Материалов: {webinar._count.materials}
                  </span>
                </div>

                <h2 className="mt-3 text-xl font-bold text-slate-950">
                  {webinar.title}
                </h2>

                {webinar.topic ? (
                  <div className="mt-2 text-sm font-semibold text-cyan-700">
                    {webinar.topic}
                  </div>
                ) : null}

                {webinar.description ? (
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {webinar.description}
                  </p>
                ) : null}

                <div className="mt-4 text-sm font-medium text-slate-400">
                  {webinar.eventDate
                    ? new Intl.DateTimeFormat("ru-RU", {
                        dateStyle: "short",
                        timeStyle: "short",
                      }).format(webinar.eventDate)
                    : "Дата не указана"}
                </div>
              </Link>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}