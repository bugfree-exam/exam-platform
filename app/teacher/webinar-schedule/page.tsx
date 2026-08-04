import Link from "next/link";

import { WebinarScheduleManager } from "@/components/webinars/WebinarScheduleManager";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function TeacherWebinarSchedulePage() {
  const events = await prisma.webinarSchedule.findMany({
    orderBy: [{ scheduledAt: "asc" }, { createdAt: "asc" }],
  });

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-7">
          <Link
            href="/teacher"
            className="text-sm font-semibold text-cyan-700 hover:text-cyan-900"
          >
            ← Кабинет учителя
          </Link>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">
                live_webinars
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                Расписание вебинаров
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Планируйте живые встречи. Дата и время везде показываются по
                Москве, независимо от часового пояса устройства.
              </p>
            </div>
            <Link
              href="/teacher/webinars"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm hover:text-slate-950"
            >
              Записи и материалы
            </Link>
          </div>
        </header>

        <WebinarScheduleManager
          events={events.map((event) => ({
            id: event.id,
            topic: event.topic,
            announcement: event.announcement,
            joinUrl: event.joinUrl,
            scheduledAt: event.scheduledAt.toISOString(),
            isPublished: event.isPublished,
          }))}
        />
      </div>
    </main>
  );
}
