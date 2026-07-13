import Link from "next/link";

import { ArchiveHomeworkButton } from "@/components/homeworks/ArchiveHomeworkButton";
import { prisma } from "@/lib/prisma";

type TeacherHomeworksPageProps = {
  searchParams: Promise<{
    status?: string;
  }>;
};

function getStatusLabel(status: string) {
  if (status === "ARCHIVED") {
    return "Архив";
  }

  if (status === "DRAFT") {
    return "Черновик";
  }

  return "Активно";
}

function getStatusClass(status: string) {
  if (status === "ARCHIVED") {
    return "bg-slate-100 text-slate-600";
  }

  if (status === "DRAFT") {
    return "bg-amber-50 text-amber-700";
  }

  return "bg-emerald-50 text-emerald-700";
}

export default async function TeacherHomeworksPage({
  searchParams,
}: TeacherHomeworksPageProps) {
  const params = await searchParams;
  const statusFilter = params.status ?? "active";

  const homeworks = await prisma.homework.findMany({
    where:
      statusFilter === "archived"
        ? {
            status: "ARCHIVED",
          }
        : statusFilter === "all"
          ? {}
          : {
              status: {
                not: "ARCHIVED",
              },
            },
    include: {
      tasks: true,
      assignments: {
        include: {
          student: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      attempts: {
        where: {
          status: "SUBMITTED",
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const counters = await prisma.homework.groupBy({
    by: ["status"],
    _count: {
      id: true,
    },
  });

  const activeCount = counters
    .filter((item) => item.status !== "ARCHIVED")
    .reduce((sum, item) => sum + item._count.id, 0);

  const archivedCount =
    counters.find((item) => item.status === "ARCHIVED")?._count.id ?? 0;

  const allCount = counters.reduce((sum, item) => sum + item._count.id, 0);

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex items-start justify-between gap-4">
          <div>
            <Link
              href="/teacher"
              className="text-sm font-medium text-cyan-700 hover:text-cyan-900"
            >
              ← Кабинет учителя
            </Link>

            <h1 className="mt-3 text-3xl font-bold text-slate-950">
              Домашние задания
            </h1>

            <p className="mt-2 text-slate-600">
              Создание, выдача, архивирование и просмотр выполнения домашних
              заданий.
            </p>
          </div>

          <Link
            href="/teacher/homeworks/create"
            className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            + Создать ДЗ
          </Link>
        </header>

        <section className="mb-6 flex flex-wrap gap-2">
          <Link
            href="/teacher/homeworks"
            className={
              statusFilter === "active"
                ? "rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
                : "rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            }
          >
            Активные · {activeCount}
          </Link>

          <Link
            href="/teacher/homeworks?status=archived"
            className={
              statusFilter === "archived"
                ? "rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
                : "rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            }
          >
            Архив · {archivedCount}
          </Link>

          <Link
            href="/teacher/homeworks?status=all"
            className={
              statusFilter === "all"
                ? "rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
                : "rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            }
          >
            Все · {allCount}
          </Link>

          <Link
            href="/teacher/homeworks/review"
            className="ml-auto rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-700 transition hover:bg-cyan-100"
          >
            Контроль выполнения
          </Link>
        </section>

        {homeworks.length === 0 ? (
          <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <h2 className="text-xl font-bold text-slate-950">
              Домашних заданий в этом разделе нет
            </h2>
            <p className="mt-2 text-slate-600">
              Создай новое ДЗ или переключись на другой фильтр.
            </p>

            <Link
              href="/teacher/homeworks/create"
              className="mt-5 inline-flex rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Создать ДЗ
            </Link>
          </section>
        ) : (
          <section className="grid gap-4">
            {homeworks.map((homework) => {
              const assignedCount = homework.assignments.length;
              const submittedStudentIds = new Set(
                homework.attempts.map((attempt) => attempt.studentId)
              );
              const submittedCount = submittedStudentIds.size;

              return (
                <article
                  key={homework.id}
                  className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <Link
                      href={`/teacher/homeworks/${homework.id}`}
                      className="min-w-0 flex-1"
                    >
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                            homework.status
                          )}`}
                        >
                          {getStatusLabel(homework.status)}
                        </span>

                        <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">
                          {homework.tasks.length} задач
                        </span>

                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                          {assignedCount} учеников
                        </span>

                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                          Сдали {submittedCount}/{assignedCount}
                        </span>
                      </div>

                      <h2 className="mt-3 text-xl font-bold text-slate-950">
                        {homework.title}
                      </h2>

                      {homework.description ? (
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {homework.description}
                        </p>
                      ) : null}
                    </Link>

                    <div className="flex flex-col items-end gap-3">
                      <div className="text-sm text-slate-400">
                        {new Intl.DateTimeFormat("ru-RU").format(
                          homework.createdAt
                        )}
                      </div>

                      <ArchiveHomeworkButton
                        homeworkId={homework.id}
                        currentStatus={homework.status}
                      />
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}