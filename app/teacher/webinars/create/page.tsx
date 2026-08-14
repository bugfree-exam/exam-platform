import Link from "next/link";

import { WebinarForm } from "@/components/webinars/WebinarForm";
import { prisma } from "@/lib/prisma";

export default async function CreateWebinarPage() {
  const homeworkOptions = await prisma.homework.findMany({
    where: { status: "ASSIGNED" },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, status: true },
  });

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8">
          <Link
            href="/teacher/webinars"
            className="text-sm font-medium text-cyan-700 hover:text-cyan-900"
          >
            ← Вебинары
          </Link>

          <h1 className="mt-3 text-3xl font-bold text-slate-950">Новый вебинар</h1>

          <p className="mt-2 text-slate-600">
            Добавь видео, конспект, материалы и задания для отработки.
          </p>
        </header>

        <WebinarForm homeworkOptions={homeworkOptions} />
      </div>
    </main>
  );
}
