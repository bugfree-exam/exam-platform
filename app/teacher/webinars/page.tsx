import { Prisma, WebinarStatus, WebinarVideoProvider } from "@prisma/client";
import Link from "next/link";

import { WebinarFilters } from "@/components/webinars/WebinarFilters";
import { DeleteWebinarButton } from "@/components/webinars/DeleteWebinarButton";
import { prisma } from "@/lib/prisma";
import { getVideoProviderLabel } from "@/lib/webinarVideo";

type TeacherWebinarsPageProps = {
  searchParams: Promise<{
    q?: string;
    status?: string;
    provider?: string;
    egeNumber?: string;
    period?: string;
  }>;
};

const VALID_STATUSES = ["all", "PUBLISHED", "DRAFT", "ARCHIVED"];
const VALID_PROVIDERS = ["all", "RUTUBE", "YANDEX_DISK", "EXTERNAL"];
const VALID_PERIODS = ["all", "7d", "30d", "month"];

function getStatusLabel(status: string) {
  if (status === "PUBLISHED") return "Опубликовано";
  if (status === "ARCHIVED") return "Архив";
  return "Черновик";
}

function getStatusClass(status: string) {
  if (status === "PUBLISHED") return "bg-emerald-50 text-emerald-700";
  if (status === "ARCHIVED") return "bg-slate-100 text-slate-600";
  return "bg-amber-50 text-amber-700";
}

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
  if (period === "month") return new Date(now.getFullYear(), now.getMonth(), 1);
  return null;
}

function getSafeEgeNumber(value: string) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1 || number > 27) return null;
  return number;
}

export default async function TeacherWebinarsPage({ searchParams }: TeacherWebinarsPageProps) {
  const params = await searchParams;
  const selectedQuery = params.q?.trim() ?? "";
  const selectedStatus = VALID_STATUSES.includes(params.status ?? "") ? params.status ?? "all" : "all";
  const selectedProvider = VALID_PROVIDERS.includes(params.provider ?? "") ? params.provider ?? "all" : "all";
  const selectedPeriod = VALID_PERIODS.includes(params.period ?? "") ? params.period ?? "all" : "all";
  const selectedEgeNumber = params.egeNumber ?? "all";

  const where: Prisma.WebinarWhereInput = {};
  if (selectedStatus !== "all") where.status = selectedStatus as WebinarStatus;
  if (selectedProvider !== "all") where.videoProvider = selectedProvider as WebinarVideoProvider;
  if (selectedEgeNumber !== "all") {
    const egeNumber = getSafeEgeNumber(selectedEgeNumber);
    if (egeNumber) where.egeNumber = egeNumber;
  }
  const periodStart = getPeriodStart(selectedPeriod);
  if (periodStart) where.eventDate = { gte: periodStart };
  if (selectedQuery) {
    where.OR = [
      { title: { contains: selectedQuery, mode: "insensitive" } },
      { description: { contains: selectedQuery, mode: "insensitive" } },
      { topic: { contains: selectedQuery, mode: "insensitive" } },
    ];
  }

  const webinars = await prisma.webinar.findMany({
    where,
    include: { _count: { select: { materials: true } } },
    orderBy: [{ eventDate: "desc" }, { createdAt: "desc" }],
  });

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link href="/teacher" className="text-sm font-medium text-cyan-700 hover:text-cyan-900">← Кабинет учителя</Link>
            <h1 className="mt-3 text-3xl font-bold text-slate-950">Вебинары</h1>
            <p className="mt-2 text-slate-600">Видеоразборы, записи занятий, конспекты, шпаргалки и материалы.</p>
          </div>
          <Link href="/teacher/webinars/create" className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">+ Добавить вебинар</Link>
        </header>

        <WebinarFilters
          selectedQuery={selectedQuery}
          selectedStatus={selectedStatus}
          selectedProvider={selectedProvider}
          selectedEgeNumber={selectedEgeNumber}
          selectedPeriod={selectedPeriod}
          showStatusFilter
        />

        <section className="mb-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-slate-500">Найдено</div>
          <div className="mt-1 text-3xl font-black text-slate-950">{webinars.length}</div>
        </section>

        {webinars.length === 0 ? (
          <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <h2 className="text-xl font-bold text-slate-950">По фильтрам ничего не найдено</h2>
            <p className="mt-2 text-slate-600">Попробуй изменить поиск, номер ЕГЭ, статус или период.</p>
          </section>
        ) : (
          <section className="grid gap-4">
            {webinars.map((webinar) => (
              <article key={webinar.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
                <div className="flex flex-wrap items-start justify-between gap-5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(webinar.status)}`}>{getStatusLabel(webinar.status)}</span>
                      <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">{getVideoProviderLabel(webinar.videoProvider)}</span>
                      {webinar.egeNumber ? <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">№{webinar.egeNumber} ЕГЭ</span> : null}
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">Материалов: {webinar._count.materials}</span>
                    </div>
                    <Link href={`/teacher/webinars/${webinar.id}`} className="mt-3 block text-xl font-bold text-slate-950 transition hover:text-cyan-800">{webinar.title}</Link>
                    {webinar.topic ? <div className="mt-2 text-sm font-semibold text-cyan-700">{webinar.topic}</div> : null}
                    {webinar.description ? <p className="mt-2 text-sm leading-6 text-slate-600">{webinar.description}</p> : null}
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-3">
                    <div className="text-sm text-slate-400">
                      {webinar.eventDate
                        ? new Intl.DateTimeFormat("ru-RU", { dateStyle: "short", timeStyle: "short" }).format(webinar.eventDate)
                        : "Дата не указана"}
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      <Link href={`/teacher/webinars/${webinar.id}`} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">Открыть</Link>
                      <DeleteWebinarButton webinarId={webinar.id} webinarTitle={webinar.title} />
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
