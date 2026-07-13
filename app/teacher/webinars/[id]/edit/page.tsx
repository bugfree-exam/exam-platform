import Link from "next/link";
import { notFound } from "next/navigation";

import { WebinarForm } from "@/components/webinars/WebinarForm";
import { prisma } from "@/lib/prisma";

type EditWebinarPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatDateTimeLocal(date: Date | null) {
  if (!date) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default async function EditWebinarPage({ params }: EditWebinarPageProps) {
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

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8">
          <Link
            href={`/teacher/webinars/${webinar.id}`}
            className="text-sm font-medium text-cyan-700 hover:text-cyan-900"
          >
            ← К вебинару
          </Link>

          <h1 className="mt-3 text-3xl font-bold text-slate-950">
            Редактирование вебинара
          </h1>

          <p className="mt-2 text-slate-600">
            Измени видео, конспект, материалы и статус публикации.
          </p>
        </header>

        <WebinarForm
          mode="edit"
          initialData={{
            id: webinar.id,
            title: webinar.title,
            description: webinar.description ?? "",
            eventDate: formatDateTimeLocal(webinar.eventDate),
            videoProvider: webinar.videoProvider,
            videoUrl: webinar.videoUrl,
            videoEmbedUrl: webinar.videoEmbedUrl ?? "",
            contentHtml: webinar.contentHtml,
            status: webinar.status,
            topic: webinar.topic ?? "",
            egeNumber: webinar.egeNumber ? String(webinar.egeNumber) : "",
            materials: webinar.materials.map((material) => ({
              title: material.title,
              url: material.url,
              type: material.type,
            })),
          }}
        />
      </div>
    </main>
  );
}