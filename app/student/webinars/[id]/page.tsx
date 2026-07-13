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

function getMaterialTypeLabel(type: string) {
  if (type === "CHEATSHEET") return "Шпаргалка";
  if (type === "PRESENTATION") return "Презентация";
  if (type === "DOCUMENT") return "Документ";
  if (type === "CODE") return "Код";
  if (type === "LINK") return "Ссылка";
  return "Материал";
}

function getMaterialTypeClass(type: string) {
  if (type === "CHEATSHEET") return "bg-emerald-50 text-emerald-700";
  if (type === "PRESENTATION") return "bg-cyan-50 text-cyan-700";
  if (type === "DOCUMENT") return "bg-amber-50 text-amber-700";
  if (type === "CODE") return "bg-violet-50 text-violet-700";
  return "bg-slate-100 text-slate-600";
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

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8">
          <Link
            href="/student/webinars"
            className="text-sm font-medium text-cyan-700 hover:text-cyan-900"
          >
            ← Вебинары и материалы
          </Link>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">
              {getVideoProviderLabel(webinar.videoProvider)}
            </span>

            {webinar.eventDate ? (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                {new Intl.DateTimeFormat("ru-RU", {
                  dateStyle: "short",
                  timeStyle: "short",
                }).format(webinar.eventDate)}
              </span>
            ) : null}
          </div>

          <h1 className="mt-3 text-3xl font-bold text-slate-950">
            {webinar.title}
          </h1>

          {webinar.description ? (
            <p className="mt-2 text-slate-600">{webinar.description}</p>
          ) : null}

          {webinar.egeNumber ? (
            <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
              №{webinar.egeNumber} ЕГЭ
            </span>
          ) : null}

          {webinar.topic ? (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {webinar.topic}
            </span>
          ) : null}
        </header>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-black shadow-sm">
          <div className="aspect-video w-full">
            <iframe
              src={embedUrl}
              title={webinar.title}
              className="h-full w-full"
              allow="clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              allowFullScreen
            />
          </div>
        </section>

        <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-600">
          Видео открывается прямо на странице. Если источник запретил
          встраивание, используй резервную ссылку:{" "}
          <a
            href={webinar.videoUrl}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-cyan-700 hover:text-cyan-900"
          >
            открыть видео
          </a>
          .
        </div>

        {webinar.materials.length > 0 ? (
          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-950">
              Материалы к вебинару
            </h2>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {webinar.materials.map((material) => (
                <a
                  key={material.id}
                  href={material.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:bg-slate-100"
                >
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${getMaterialTypeClass(
                      material.type
                    )}`}
                  >
                    {getMaterialTypeLabel(material.type)}
                  </span>

                  <div className="mt-3 font-bold text-slate-950">
                    {material.title}
                  </div>
                </a>
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-950">Конспект</h2>

          <div
            className="prose prose-slate mt-4 max-w-none"
            dangerouslySetInnerHTML={{ __html: webinar.contentHtml }}
          />
        </section>
      </div>
    </main>
  );
}