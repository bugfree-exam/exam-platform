import Link from "next/link";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;

type AssignmentStatus =
  | "WAITING"
  | "DUE_SOON"
  | "OVERDUE"
  | "SUBMITTED"
  | "SUBMITTED_LATE";

function formatDate(value: Date | null) {
  if (!value) return "Без дедлайна";
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function getStatus({
  deadline,
  submittedAt,
}: {
  deadline: Date | null;
  submittedAt: Date | null;
}): AssignmentStatus {
  if (submittedAt) {
    if (deadline && submittedAt > deadline) return "SUBMITTED_LATE";
    return "SUBMITTED";
  }

  if (!deadline) return "WAITING";

  const diff = deadline.getTime() - Date.now();
  if (diff < 0) return "OVERDUE";
  if (diff <= DAY_MS) return "DUE_SOON";
  return "WAITING";
}

function statusMeta(status: AssignmentStatus) {
  if (status === "OVERDUE") {
    return { label: "Просрочено", className: "bg-rose-100 text-rose-800" };
  }
  if (status === "DUE_SOON") {
    return { label: "Скоро дедлайн", className: "bg-amber-100 text-amber-800" };
  }
  if (status === "SUBMITTED_LATE") {
    return { label: "Сдано позже", className: "bg-violet-100 text-violet-800" };
  }
  if (status === "SUBMITTED") {
    return { label: "Сдано", className: "bg-emerald-100 text-emerald-800" };
  }
  return { label: "Ожидается", className: "bg-slate-100 text-slate-700" };
}

export default async function TeacherHomeworksReviewPage() {
  const homeworks = await prisma.homework.findMany({
    where: { status: { not: "ARCHIVED" } },
    orderBy: [{ deadline: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      deadline: true,
      assignments: {
        orderBy: { assignedAt: "asc" },
        select: {
          id: true,
          student: {
            select: { id: true, name: true, email: true },
          },
        },
      },
      attempts: {
        where: { status: "SUBMITTED" },
        orderBy: { submittedAt: "desc" },
        select: {
          id: true,
          studentId: true,
          percent: true,
          submittedAt: true,
        },
      },
    },
  });

  const rows = homeworks.flatMap((homework) => {
    const latestByStudent = new Map<string, (typeof homework.attempts)[number]>();
    for (const attempt of homework.attempts) {
      if (!latestByStudent.has(attempt.studentId)) {
        latestByStudent.set(attempt.studentId, attempt);
      }
    }

    return homework.assignments.map((assignment) => {
      const attempt = latestByStudent.get(assignment.student.id) ?? null;
      const status = getStatus({
        deadline: homework.deadline,
        submittedAt: attempt?.submittedAt ?? null,
      });

      return {
        homeworkId: homework.id,
        homeworkTitle: homework.title,
        deadline: homework.deadline,
        assignmentId: assignment.id,
        student: assignment.student,
        attempt,
        status,
        needsReview: Boolean(attempt && attempt.percent < 70),
      };
    });
  });

  const submitted = rows.filter((row) => row.status === "SUBMITTED").length;
  const submittedLate = rows.filter((row) => row.status === "SUBMITTED_LATE").length;
  const overdue = rows.filter((row) => row.status === "OVERDUE").length;
  const dueSoon = rows.filter((row) => row.status === "DUE_SOON").length;
  const waiting = rows.filter((row) => row.status === "WAITING").length;
  const lowResult = rows.filter((row) => row.needsReview).length;

  const attentionRows = rows
    .filter((row) => row.status === "OVERDUE" || row.needsReview)
    .sort((a, b) => {
      if (a.status === "OVERDUE" && b.status !== "OVERDUE") return -1;
      if (b.status === "OVERDUE" && a.status !== "OVERDUE") return 1;
      return (a.attempt?.percent ?? 101) - (b.attempt?.percent ?? 101);
    });

  return (
    <main className="min-h-screen bg-[#f3f7fa] px-4 py-6 text-[#102638] sm:px-6 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-4 rounded-[30px] bg-[#092535] p-6 text-white shadow-xl sm:p-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link href="/teacher" className="text-sm font-bold text-cyan-300">
              ← Кабинет учителя
            </Link>
            <div className="mt-5 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300">
              homework.control
            </div>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-5xl">
              Контроль домашних заданий
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
              «Не сдал» теперь означает реальную просрочку. Работы до дедлайна
              находятся в статусах «ожидается» или «скоро дедлайн».
            </p>
          </div>
        </header>

        <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          {[
            ["Сдано вовремя", submitted, "text-emerald-700"],
            ["Сдано позже", submittedLate, "text-violet-700"],
            ["Просрочено", overdue, "text-rose-700"],
            ["< 24 часов", dueSoon, "text-amber-700"],
            ["Ожидается", waiting, "text-slate-700"],
            ["Низкий результат", lowResult, "text-cyan-700"],
          ].map(([label, value, className]) => (
            <article key={String(label)} className="rounded-2xl border border-white bg-white p-4 shadow-sm">
              <div className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</div>
              <div className={`mt-2 text-3xl font-black ${className}`}>{value}</div>
            </article>
          ))}
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="rounded-[28px] border border-white bg-white p-5 shadow-sm">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-rose-700">attention.queue</div>
            <h2 className="mt-2 text-xl font-black">Требуют внимания</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Только реальные просрочки и уже сданные работы с результатом ниже 70%.
            </p>

            {attentionRows.length === 0 ? (
              <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
                Критичных ситуаций нет ✓
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {attentionRows.slice(0, 12).map((row) => (
                  <Link
                    key={`${row.assignmentId}-${row.attempt?.id ?? "none"}`}
                    href={`/teacher/students/${row.student.id}`}
                    className="block rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-cyan-300"
                  >
                    <div className="font-black">{row.student.name}</div>
                    <div className="mt-1 text-xs text-slate-500">{row.homeworkTitle}</div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold">
                      {row.status === "OVERDUE" ? (
                        <span className="rounded-lg bg-rose-100 px-2 py-1 text-rose-800">Просрочено</span>
                      ) : null}
                      {row.needsReview ? (
                        <span className="rounded-lg bg-amber-100 px-2 py-1 text-amber-800">
                          Результат {Math.round(row.attempt?.percent ?? 0)}%
                        </span>
                      ) : null}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </aside>

          <article className="rounded-[28px] border border-white bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-700">assignments</div>
                <h2 className="mt-2 text-2xl font-black">Все назначения</h2>
              </div>
              <span className="text-sm text-slate-400">Всего: {rows.length}</span>
            </div>

            {rows.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
                Пока нет активных назначений.
              </div>
            ) : (
              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[760px] border-separate border-spacing-y-2 text-left text-sm">
                  <thead>
                    <tr className="text-xs uppercase tracking-wide text-slate-400">
                      <th className="px-3 py-2">Ученик</th>
                      <th className="px-3 py-2">Домашняя работа</th>
                      <th className="px-3 py-2">Дедлайн</th>
                      <th className="px-3 py-2">Статус</th>
                      <th className="px-3 py-2">Результат</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const meta = statusMeta(row.status);
                      return (
                        <tr key={row.assignmentId} className="bg-slate-50">
                          <td className="rounded-l-2xl px-3 py-3">
                            <Link href={`/teacher/students/${row.student.id}`} className="font-black hover:text-cyan-800">
                              {row.student.name}
                            </Link>
                            <div className="mt-1 text-xs text-slate-400">{row.student.email}</div>
                          </td>
                          <td className="px-3 py-3">
                            <Link href={`/teacher/homeworks/${row.homeworkId}`} className="font-bold hover:text-cyan-800">
                              {row.homeworkTitle}
                            </Link>
                          </td>
                          <td className="px-3 py-3 text-slate-500">{formatDate(row.deadline)} МСК</td>
                          <td className="px-3 py-3">
                            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${meta.className}`}>
                              {meta.label}
                            </span>
                          </td>
                          <td className="rounded-r-2xl px-3 py-3 font-black">
                            {row.attempt ? `${Math.round(row.attempt.percent)}%` : "—"}
                            {row.needsReview ? (
                              <span className="ml-2 text-xs font-bold text-rose-700">нужен разбор</span>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </article>
        </section>
      </div>
    </main>
  );
}
