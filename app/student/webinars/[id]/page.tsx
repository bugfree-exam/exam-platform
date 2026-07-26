import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import {
  getVideoProviderLabel,
  getWebinarEmbedUrl,
} from "@/lib/webinarVideo";

type StudentWebinarPageProps = {
  params: Promise<{
    id: string;
  }>;
};

const webinarDateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function getMaterialTypeLabel(type: string) {
  if (type === "CHEATSHEET") return "Шпаргалка";
  if (type === "PRESENTATION") return "Презентация";
  if (type === "DOCUMENT") return "Документ";
  if (type === "CODE") return "Код";
  if (type === "LINK") return "Ссылка";
  return "Материал";
}

function getMaterialTypeClass(type: string) {
  if (type === "CHEATSHEET") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (type === "PRESENTATION") {
    return "border-cyan-200 bg-cyan-50 text-cyan-700";
  }

  if (type === "DOCUMENT") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (type === "CODE") {
    return "border-violet-200 bg-violet-50 text-violet-700";
  }

  return "border-slate-200 bg-slate-100 text-slate-600";
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

function ExternalLinkIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      className="h-4 w-4"
    >
      <path
        d="M11 4h5v5M16 4l-7 7"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14 11v3.25A1.75 1.75 0 0 1 12.25 16h-6.5A1.75 1.75 0 0 1 4 14.25v-6.5A1.75 1.75 0 0 1 5.75 6H9"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
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
      className="h-5 w-5"
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

function FileIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
    >
      <path
        d="M7 3.75h6.5L18.25 8.5V20.25H7A2.25 2.25 0 0 1 4.75 18V6A2.25 2.25 0 0 1 7 3.75Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M13.25 4v4.75H18M8.5 13h6M8.5 16h4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function NotesIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
    >
      <path
        d="M6.75 4.25h10.5A2.5 2.5 0 0 1 19.75 6.75v10.5a2.5 2.5 0 0 1-2.5 2.5H6.75a2.5 2.5 0 0 1-2.5-2.5V6.75a2.5 2.5 0 0 1 2.5-2.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M8 9h8M8 12.5h8M8 16h5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default async function StudentWebinarPage({
  params,
}: StudentWebinarPageProps) {
  const { id } = await params;

  const webinar = await prisma.webinar.findFirst({
    where: {
      id,
      status: "PUBLISHED",
    },
    include: {
      materials: {
        orderBy: {
          order: "asc",
        },
      },
    },
  });

  if (!webinar) {
    notFound();
  }

  const embedUrl = getWebinarEmbedUrl({
    provider: webinar.videoProvider,
    videoUrl: webinar.videoUrl,
    videoEmbedUrl: webinar.videoEmbedUrl,
  });

  const formattedDate = webinar.eventDate
    ? webinarDateFormatter.format(webinar.eventDate)
    : "Дата не указана";
  const hasNotes = Boolean(webinar.contentHtml?.trim());

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
        className="pointer-events-none absolute -right-24 top-[520px] h-96 w-96 rounded-full bg-sky-300/20 blur-3xl"
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
            href="/student/webinars"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-cyan-200 hover:text-cyan-700 sm:px-4"
          >
            <BackIcon />
            <span className="hidden sm:inline">Все вебинары</span>
            <span className="sm:hidden">Назад</span>
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
            className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl"
          />

          <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-end">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-400 sm:text-xs">
                <span>app.bugfree-exam.ru/student/webinars/{webinar.id}</span>
                <span className="h-1 w-1 rounded-full bg-slate-600" />
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                  published
                </span>
              </div>

              <p className="mt-8 font-mono text-xs uppercase tracking-[0.2em] text-cyan-300">
                Webinar_session
              </p>
              <h1 className="mt-3 text-3xl font-bold tracking-[-0.04em] sm:text-4xl lg:text-5xl">
                {webinar.title}
              </h1>

              {webinar.description ? (
                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                  {webinar.description}
                </p>
              ) : null}

              <div className="mt-6 flex flex-wrap gap-2">
                <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-cyan-200">
                  {getVideoProviderLabel(webinar.videoProvider)}
                </span>

                {webinar.egeNumber ? (
                  <span className="rounded-full border border-violet-300/20 bg-violet-300/10 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-violet-200">
                    ЕГЭ №{webinar.egeNumber}
                  </span>
                ) : null}

                {webinar.topic ? (
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200">
                    {webinar.topic}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-sm">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-400">
                  Event_date
                </p>
                <p className="mt-2 text-sm font-semibold leading-6 text-white">
                  {formattedDate}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-sm">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-400">
                  Attached_files
                </p>
                <p className="mt-2 text-sm font-semibold leading-6 text-white">
                  {formatMaterialsCount(webinar.materials.length)}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-5 overflow-hidden rounded-[28px] border border-[#12364b] bg-[#071c2a] shadow-[0_24px_70px_rgba(7,31,47,0.18)]">
          <div className="flex flex-col gap-4 border-b border-white/10 px-5 py-4 text-white sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-200">
                <PlayIcon />
              </span>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300">
                  01 / Запись занятия
                </p>
                <h2 className="mt-0.5 text-sm font-bold sm:text-base">
                  Смотреть вебинар
                </h2>
              </div>
            </div>

            <span className="w-fit rounded-full border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-300">
              embedded video
            </span>
          </div>

          <div className="aspect-video w-full bg-black">
            <iframe
              src={embedUrl}
              title={webinar.title}
              className="h-full w-full"
              allow="clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              allowFullScreen
            />
          </div>

          <div className="flex flex-col gap-3 border-t border-white/10 px-5 py-4 text-sm leading-6 text-slate-300 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p>
              Если видео не загрузилось внутри платформы, откройте его напрямую
              на сайте источника.
            </p>
            <a
              href={webinar.videoUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex shrink-0 items-center gap-2 font-semibold text-cyan-300 transition hover:text-cyan-200"
            >
              Открыть видео
              <ExternalLinkIcon />
            </a>
          </div>
        </section>

        <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section className="order-2 overflow-hidden rounded-[28px] border border-white/80 bg-white/90 shadow-[0_18px_60px_rgba(16,38,56,0.07)] backdrop-blur-sm lg:order-1">
            <div className="flex items-center gap-3 border-b border-slate-200/80 px-5 py-5 sm:px-7">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#0b2436] text-cyan-300">
                <NotesIcon />
              </span>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-700">
                  02 / Конспект
                </p>
                <h2 className="mt-1 text-xl font-bold tracking-[-0.02em] text-[#102638]">
                  Главное с занятия
                </h2>
              </div>
            </div>

            {hasNotes ? (
              <div
                className="prose prose-slate max-w-none px-5 py-6 prose-headings:tracking-[-0.02em] prose-headings:text-[#102638] prose-a:font-semibold prose-a:text-cyan-700 prose-code:rounded prose-code:bg-slate-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:text-[#102638] prose-img:rounded-2xl prose-pre:rounded-2xl prose-pre:bg-[#0b2436] sm:px-7 sm:py-8"
                dangerouslySetInnerHTML={{ __html: webinar.contentHtml }}
              />
            ) : (
              <div className="px-5 py-10 text-center sm:px-7">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-400">
                  <NotesIcon />
                </div>
                <h3 className="mt-4 text-lg font-bold text-[#102638]">
                  Конспект пока не добавлен
                </h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                  Основные материалы этого занятия можно посмотреть в блоке с
                  файлами.
                </p>
              </div>
            )}
          </section>

          <aside className="order-1 rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-[0_18px_60px_rgba(16,38,56,0.07)] backdrop-blur-sm lg:sticky lg:top-6 lg:order-2 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-50 text-cyan-700">
                  <FileIcon />
                </span>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-700">
                    03 / Файлы
                  </p>
                  <h2 className="mt-1 text-lg font-bold tracking-[-0.02em] text-[#102638]">
                    Материалы
                  </h2>
                </div>
              </div>

              <span className="rounded-full bg-slate-100 px-2.5 py-1 font-mono text-[10px] font-semibold text-slate-500">
                {webinar.materials.length}
              </span>
            </div>

            {webinar.materials.length > 0 ? (
              <div className="mt-5 space-y-3">
                {webinar.materials.map((material, index) => (
                  <a
                    key={material.id}
                    href={material.url}
                    target="_blank"
                    rel="noreferrer"
                    className="group block rounded-2xl border border-slate-200 bg-[#f8fbfd] p-4 transition hover:-translate-y-0.5 hover:border-cyan-200 hover:bg-white hover:shadow-[0_14px_35px_rgba(16,38,56,0.08)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-[10px] font-semibold text-slate-400">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <span
                            className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] ${getMaterialTypeClass(
                              material.type
                            )}`}
                          >
                            {getMaterialTypeLabel(material.type)}
                          </span>
                        </div>

                        <h3 className="mt-3 break-words text-sm font-bold leading-6 text-[#102638] transition group-hover:text-cyan-800">
                          {material.title}
                        </h3>
                      </div>

                      <span className="mt-0.5 shrink-0 text-slate-400 transition group-hover:text-cyan-700">
                        <ExternalLinkIcon />
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-[#f8fbfd] px-4 py-7 text-center">
                <p className="text-sm font-semibold text-[#102638]">
                  Дополнительных файлов нет
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Всё необходимое находится в видео и конспекте.
                </p>
              </div>
            )}
          </aside>
        </div>

        <footer className="mt-5 flex flex-col gap-3 rounded-[24px] border border-white/80 bg-white/70 px-5 py-4 text-sm text-slate-500 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
          <p>Материалы доступны только авторизованным ученикам курса.</p>
          <Link
            href="/student/webinars"
            className="inline-flex items-center gap-2 font-semibold text-cyan-700 transition hover:text-cyan-900"
          >
            <BackIcon />
            Вернуться к библиотеке
          </Link>
        </footer>
      </div>
    </main>
  );
}