import {
  Prisma,
  StudentAccountStatus,
  UserRole,
} from "@prisma/client";
import Link from "next/link";

import { requireTeacherPage } from "@/lib/access";
import { prisma } from "@/lib/prisma";

type TeacherStudentsPageProps = {
  searchParams: Promise<{
    q?: string;
    status?: string;
  }>;
};

const VALID_STATUS_FILTERS = [
  "current",
  "active",
  "frozen",
  "archived",
  "all",
] as const;

type StatusFilter = (typeof VALID_STATUS_FILTERS)[number];

function getSafeStatusFilter(value: string | undefined): StatusFilter {
  return VALID_STATUS_FILTERS.includes(value as StatusFilter)
    ? (value as StatusFilter)
    : "current";
}

function getStatusWhere(status: StatusFilter): Prisma.UserWhereInput {
  if (status === "active") {
    return {
      studentStatus: StudentAccountStatus.ACTIVE,
    };
  }

  if (status === "frozen") {
    return {
      studentStatus: StudentAccountStatus.FROZEN,
    };
  }

  if (status === "archived") {
    return {
      studentStatus: StudentAccountStatus.ARCHIVED,
    };
  }

  if (status === "current") {
    return {
      studentStatus: {
        in: [
          StudentAccountStatus.ACTIVE,
          StudentAccountStatus.FROZEN,
        ],
      },
    };
  }

  return {};
}

function getStatusStyle(status: StudentAccountStatus) {
  if (status === StudentAccountStatus.FROZEN) {
    return {
      label: "Заморожен",
      className: "border-sky-200 bg-sky-50 text-sky-700",
    };
  }

  if (status === StudentAccountStatus.ARCHIVED) {
    return {
      label: "В архиве",
      className: "border-slate-300 bg-slate-100 text-slate-600",
    };
  }

  return {
    label: "Активен",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  };
}

function formatActivity(value: Date | null) {
  if (!value) return "Активность ещё не зафиксирована";

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function getTabHref(status: StatusFilter, query: string) {
  const params = new URLSearchParams();

  params.set("status", status);

  if (query) {
    params.set("q", query);
  }

  return `/teacher/students?${params.toString()}`;
}

export default async function TeacherStudentsPage({
  searchParams,
}: TeacherStudentsPageProps) {
  await requireTeacherPage();

  const params = await searchParams;
  const selectedStatus = getSafeStatusFilter(params.status);
  const selectedQuery = params.q?.trim() ?? "";

  const searchWhere: Prisma.UserWhereInput = selectedQuery
    ? {
        OR: [
          {
            name: {
              contains: selectedQuery,
              mode: "insensitive",
            },
          },
          {
            email: {
              contains: selectedQuery,
              mode: "insensitive",
            },
          },
        ],
      }
    : {};

  const [students, activeCount, frozenCount, archivedCount] =
    await Promise.all([
      prisma.user.findMany({
        where: {
          role: UserRole.STUDENT,
          ...getStatusWhere(selectedStatus),
          ...searchWhere,
        },
        include: {
          assignedHomeworks: true,
          attempts: {
            where: {
              status: "SUBMITTED",
            },
          },
        },
        orderBy: [
          {
            studentStatus: "asc",
          },
          {
            createdAt: "desc",
          },
        ],
      }),
      prisma.user.count({
        where: {
          role: UserRole.STUDENT,
          studentStatus: StudentAccountStatus.ACTIVE,
        },
      }),
      prisma.user.count({
        where: {
          role: UserRole.STUDENT,
          studentStatus: StudentAccountStatus.FROZEN,
        },
      }),
      prisma.user.count({
        where: {
          role: UserRole.STUDENT,
          studentStatus: StudentAccountStatus.ARCHIVED,
        },
      }),
    ]);

  const tabs: Array<{
    value: StatusFilter;
    label: string;
    count: number;
  }> = [
    {
      value: "current",
      label: "Текущие",
      count: activeCount + frozenCount,
    },
    {
      value: "active",
      label: "Активные",
      count: activeCount,
    },
    {
      value: "frozen",
      label: "Замороженные",
      count: frozenCount,
    },
    {
      value: "archived",
      label: "Архив",
      count: archivedCount,
    },
    {
      value: "all",
      label: "Все",
      count: activeCount + frozenCount + archivedCount,
    },
  ];

  return (
    <main className="min-h-screen bg-slate-100/70 px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <Link
                href="/teacher"
                className="text-sm font-medium text-slate-500 transition hover:text-cyan-700"
              >
                ← Кабинет учителя
              </Link>

              <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
                Ученики
              </h1>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Активные, замороженные и архивные аккаунты учеников.
              </p>
            </div>

            <Link
              href="/teacher/students/create"
              className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              + Добавить ученика
            </Link>
          </div>

          <div className="mt-6 flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              {tabs.map((tab) => {
                const isActive = selectedStatus === tab.value;

                return (
                  <Link
                    key={tab.value}
                    href={getTabHref(tab.value, selectedQuery)}
                    className={
                      isActive
                        ? "rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
                        : "rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-cyan-200 hover:text-cyan-700"
                    }
                  >
                    {tab.label}{" "}
                    <span
                      className={
                        isActive ? "text-slate-300" : "text-slate-400"
                      }
                    >
                      {tab.count}
                    </span>
                  </Link>
                );
              })}
            </div>

            <form method="GET" className="flex flex-col gap-2 sm:flex-row">
              <input type="hidden" name="status" value={selectedStatus} />

              <input
                name="q"
                defaultValue={selectedQuery}
                className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
                placeholder="Поиск по имени или почте"
              />

              <button
                type="submit"
                className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Найти
              </button>

              {selectedQuery ? (
                <Link
                  href={getTabHref(selectedStatus, "")}
                  className="inline-flex items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold text-slate-500 transition hover:text-slate-800"
                >
                  Сбросить
                </Link>
              ) : null}
            </form>
          </div>
        </header>

        {students.length === 0 ? (
          <section className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <h2 className="text-xl font-bold text-slate-950">
              Ученики не найдены
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Измените фильтр или поисковый запрос.
            </p>
          </section>
        ) : (
          <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {students.map((student) => {
              const attemptsCount = student.attempts.length;
              const averagePercent =
                attemptsCount === 0
                  ? 0
                  : Math.round(
                      student.attempts.reduce(
                        (sum, attempt) => sum + attempt.percent,
                        0
                      ) / attemptsCount
                    );
              const statusStyle = getStatusStyle(student.studentStatus);

              return (
                <Link
                  key={student.id}
                  href={`/teacher/students/${student.id}`}
                  className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-cyan-200 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusStyle.className}`}
                      >
                        {statusStyle.label}
                      </span>

                      <h2 className="mt-3 truncate text-xl font-bold text-slate-950 transition group-hover:text-cyan-800">
                        {student.name}
                      </h2>

                      <p className="mt-1 truncate text-sm text-slate-500">
                        {student.email}
                      </p>
                    </div>

                    <div className="shrink-0 rounded-2xl bg-slate-900 px-4 py-3 text-center text-white">
                      <div className="text-xl font-bold">
                        {averagePercent}%
                      </div>
                      <div className="text-[11px] text-slate-300">
                        средний
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <div className="text-xs text-slate-400">Выдано ДЗ</div>
                      <div className="mt-1 font-bold text-slate-800">
                        {student.assignedHomeworks.length}
                      </div>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-3">
                      <div className="text-xs text-slate-400">Попыток</div>
                      <div className="mt-1 font-bold text-slate-800">
                        {attemptsCount}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 border-t border-slate-100 pt-4 text-xs text-slate-400">
                    Последняя активность:{" "}
                    <span className="font-medium text-slate-600">
                      {formatActivity(student.lastActivityAt)}
                    </span>
                  </div>
                </Link>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}
