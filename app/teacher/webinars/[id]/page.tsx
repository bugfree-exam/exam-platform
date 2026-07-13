import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import {
  getVideoProviderLabel,
  getWebinarEmbedUrl,
} from "@/lib/webinarVideo";

type TeacherWebinarPageProps = {
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

export default async function TeacherWebinarPage({
  params,
}: TeacherWebinarPageProps) {
  const { id } = await params;

  const webinar = await prisma.webinar.findUnique({
    where: {
      id,
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
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Link
                href="/teacher/webinars"
                className="text-sm font-medium text-cyan-700 hover:text-cyan-900"
              >
                ← Вебинары
              </Link>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">
                  {getVideoProviderLabel(webinar.videoProvider)}
                </span>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {webinar.status}
                </span>
              </div>

              <h1 className="mt-3 text-3xl font-bold text-slate-950">
                {webinar.title}
              </h1>

              {webinar.description ? (
                <p className="mt-2 text-slate-600">{webinar.description}</p>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href={`/teacher/webinars/${webinar.id}/edit`}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Редактировать
              </Link>

              {webinar.status === "PUBLISHED" ? (
                <Link
                  href={`/student/webinars/${webinar.id}`}
                  className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Как видит ученик
                </Link>
              ) : null}
            </div>
          </div>
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

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-950">Конспект</h2>

          <div
            className="prose prose-slate mt-4 max-w-none"
            dangerouslySetInnerHTML={{ __html: webinar.contentHtml }}
          />
        </section>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-950">Материалы</h2>

          {webinar.materials.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">
              Материалы пока не добавлены.
            </p>
          ) : (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {webinar.materials.map((material) => (
                <a
                  key={material.id}
                  href={material.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:bg-slate-100"
                >
                  <div className="text-xs font-semibold text-cyan-700">
                    {getMaterialTypeLabel(material.type)}
                  </div>
                  <div className="mt-1 font-bold text-slate-950">
                    {material.title}
                  </div>
                </a>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}