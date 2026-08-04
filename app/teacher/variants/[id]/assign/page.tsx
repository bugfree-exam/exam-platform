import Link from "next/link";
import { notFound } from "next/navigation";

import { VariantAssignmentForm } from "@/components/variants/VariantAssignmentForm";
import { primaryToEgeTestScore } from "@/lib/egeScore";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type AssignVariantPageProps = {
  params: Promise<{ id: string }>;
};

function formatDate(value: Date | null) {
  if (!value) return "Без срока";
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export default async function AssignVariantPage({ params }: AssignVariantPageProps) {
  const { id } = await params;
  const [variant, students, attempts] = await Promise.all([
    prisma.examVariant.findUnique({
      where: { id },
      include: {
        _count: {
          select: { tasks: true },
        },
        assignments: {
          orderBy: { assignedAt: "desc" },
          include: { student: { select: { id: true, name: true, email: true } } },
        },
      },
    }),
    prisma.user.findMany({
      where: { role: "STUDENT", studentStatus: "ACTIVE" },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
    prisma.variantAttempt.findMany({
      where: { variantId: id },
      orderBy: { startedAt: "desc" },
      select: {
        id: true,
        studentId: true,
        status: true,
        score: true,
        maxScore: true,
        percent: true,
        startedAt: true,
        submittedAt: true,
      },
    }),
  ]);

  if (!variant) notFound();

  const isAssignable =
    variant.status === "PUBLISHED" && variant._count.tasks === 27;

  const latestAttemptByStudent = new Map<
    string,
    (typeof attempts)[number]
  >();

  for (const attempt of attempts) {
    if (!latestAttemptByStudent.has(attempt.studentId)) {
      latestAttemptByStudent.set(attempt.studentId, attempt);
    }
  }

  return (
    <main className="min-h-screen bg-[#f4f7f8] px-4 py-6 text-slate-950 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-6xl">
        <nav className="flex items-center justify-between gap-4">
          <Link href={`/teacher/variants/${variant.id}`} className="text-sm font-bold text-slate-600">
            ← К варианту
          </Link>
          <Link href="/teacher/variants" className="text-sm font-bold text-cyan-700">
            Все варианты
          </Link>
        </nav>

        <header className="my-5 rounded-[2rem] bg-slate-950 p-7 text-white shadow-xl sm:p-9">
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-cyan-300">
            variant.homework
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">{variant.title}</h1>
          <p className="mt-3 text-sm text-slate-300">
            Выдача полноценного варианта и контроль результатов учеников.
          </p>
        </header>

        {isAssignable ? (
          <VariantAssignmentForm
            variantId={variant.id}
            students={students}
            assignedStudentIds={variant.assignments.map((assignment) => assignment.studentId)}
          />
        ) : (
          <section className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6 text-amber-900 shadow-sm">
            <h2 className="text-xl font-black">Вариант пока нельзя выдать</h2>
            <p className="mt-2 text-sm leading-6">
              Сначала опубликуйте полный вариант из 27 заданий.
            </p>
          </section>
        )}

        <section className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black">Статистика выполнения</h2>
          <div className="mt-5 space-y-3">
            {variant.assignments.length === 0 ? (
              <p className="text-sm text-slate-500">Вариант пока никому не выдан.</p>
            ) : (
              variant.assignments.map((assignment) => {
                const attempt = latestAttemptByStudent.get(assignment.studentId);
                const currentAttempt =
                  attempt && attempt.startedAt >= assignment.assignedAt
                    ? attempt
                    : undefined;
                const completedAttempt =
                  currentAttempt?.status === "SUBMITTED"
                    ? currentAttempt
                    : undefined;
                const isActive = currentAttempt?.status === "IN_PROGRESS";
                return (
                  <article key={assignment.id} className="grid gap-4 rounded-2xl border border-slate-200 p-4 sm:grid-cols-[minmax(0,1fr)_170px_170px] sm:items-center">
                    <div>
                      <Link href={`/teacher/students/${assignment.student.id}`} className="font-black hover:text-cyan-700">
                        {assignment.student.name}
                      </Link>
                      <div className="mt-1 text-xs text-slate-500">{assignment.student.email}</div>
                      <div className="mt-2 text-xs text-slate-400">
                        Выдано {formatDate(assignment.assignedAt)} · срок {formatDate(assignment.deadline)}
                      </div>
                    </div>
                    <div>
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                        completedAttempt
                          ? "bg-emerald-50 text-emerald-700"
                          : isActive
                            ? "bg-cyan-50 text-cyan-700"
                            : "bg-amber-50 text-amber-700"
                      }`}>
                        {completedAttempt
                          ? "Выполнено"
                          : isActive
                            ? "В процессе"
                            : "Ожидает выполнения"}
                      </span>
                    </div>
                    <div className="text-right">
                      {completedAttempt ? (
                        <>
                          <Link
                            href={`/teacher/variants/attempts/${completedAttempt.id}`}
                            className="text-2xl font-black hover:text-cyan-700"
                          >
                            {primaryToEgeTestScore(completedAttempt.score)}/100
                          </Link>
                          <div className="text-xs text-slate-500">
                            {completedAttempt.score}/{completedAttempt.maxScore} первичных
                          </div>
                        </>
                      ) : (
                        <div className="text-sm font-bold text-slate-400">Результата нет</div>
                      )}
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
