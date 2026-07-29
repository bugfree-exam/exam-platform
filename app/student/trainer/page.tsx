import Link from "next/link";

import { requireStudentPage } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function StudentTrainerPage() {
  const user = await requireStudentPage();

  const [taskGroups, attempts] = await Promise.all([
    prisma.task.groupBy({
      by: ["egeNumber"],
      where: {
        isArchived: false,
      },
      _count: {
        _all: true,
      },
      orderBy: {
        egeNumber: "asc",
      },
    }),
    prisma.practiceAttempt.findMany({
      where: {
        studentId: user.id,
      },
      select: {
        isCorrect: true,
        task: {
          select: {
            egeNumber: true,
          },
        },
      },
    }),
  ]);

  const taskCountByNumber = new Map(
    taskGroups.map((group) => [group.egeNumber, group._count._all])
  );
  const statsByNumber = new Map<
    number,
    {
      total: number;
      correct: number;
    }
  >();

  for (const attempt of attempts) {
    const current = statsByNumber.get(attempt.task.egeNumber) ?? {
      total: 0,
      correct: 0,
    };

    current.total += 1;
    current.correct += attempt.isCorrect ? 1 : 0;
    statsByNumber.set(attempt.task.egeNumber, current);
  }

  const totalTasks = taskGroups.reduce(
    (sum, group) => sum + group._count._all,
    0
  );

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f4f7f8] px-4 py-5 text-slate-950 sm:px-6 sm:py-8">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.32]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(15,23,42,0.045) 1px, transparent 1px), linear-gradient(90deg,rgba(15,23,42,0.045) 1px,transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="relative mx-auto max-w-7xl">
        <nav className="flex items-center justify-between gap-4 rounded-2xl border border-white/80 bg-white/85 px-4 py-3 shadow-sm backdrop-blur">
          <Link href="/student" className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-950 font-mono text-sm font-black text-cyan-300">
              &lt;/&gt;
            </span>
            <span>
              <span className="block text-sm font-black">Экзамен без багов</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-400">
                student.trainer
              </span>
            </span>
          </Link>
          <Link
            href="/student"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-cyan-300 hover:text-cyan-800"
          >
            ← В кабинет
          </Link>
        </nav>

        <header className="relative mt-5 overflow-hidden rounded-[2rem] bg-slate-950 px-5 py-8 text-white shadow-xl sm:px-9 sm:py-10">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
          <div className="relative grid gap-7 lg:grid-cols-[1fr_280px] lg:items-end">
            <div>
              <span className="inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-cyan-200">
                самостоятельная практика
              </span>
              <h1 className="mt-5 text-3xl font-black tracking-[-0.04em] sm:text-5xl">
                Тренажёр заданий ЕГЭ
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                Выберите номер и решайте задания подряд. После каждой проверки
                откроется следующая задача того же типа, а результат сохранится
                в общей статистике.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">
                Доступно
              </div>
              <div className="mt-2 text-5xl font-black text-cyan-300">
                {totalTasks}
              </div>
              <div className="mt-1 text-sm text-slate-400">заданий</div>
            </div>
          </div>
        </header>

        <section className="mt-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-700">
                choose.task.number
              </div>
              <h2 className="mt-2 text-2xl font-black tracking-tight">
                Что тренируем сегодня?
              </h2>
            </div>
            <Link
              href="/student/results"
              className="text-sm font-bold text-cyan-700 hover:text-cyan-900"
            >
              Смотреть всю статистику →
            </Link>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 27 }, (_, index) => index + 1).map(
              (egeNumber) => {
                const taskCount = taskCountByNumber.get(egeNumber) ?? 0;
                const stats = statsByNumber.get(egeNumber);
                const percent = stats
                  ? Math.round((stats.correct / stats.total) * 100)
                  : null;

                if (taskCount === 0) {
                  return (
                    <div
                      key={egeNumber}
                      className="rounded-3xl border border-dashed border-slate-300 bg-white/60 p-5 opacity-60"
                    >
                      <div className="text-3xl font-black">№{egeNumber}</div>
                      <p className="mt-4 text-sm text-slate-500">
                        Задания пока не добавлены
                      </p>
                    </div>
                  );
                }

                return (
                  <Link
                    key={egeNumber}
                    href={`/student/trainer/${egeNumber}`}
                    className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-400">
                          exam.task
                        </div>
                        <div className="mt-1 text-3xl font-black">
                          №{egeNumber}
                        </div>
                      </div>
                      {percent === null ? (
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">
                          без попыток
                        </span>
                      ) : (
                        <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-bold text-cyan-700">
                          {percent}% верно
                        </span>
                      )}
                    </div>
                    <div className="mt-5 flex items-end justify-between border-t border-slate-100 pt-4">
                      <div className="text-xs text-slate-500">
                        <div>{taskCount} заданий</div>
                        {stats ? <div className="mt-1">{stats.total} решений</div> : null}
                      </div>
                      <span className="text-sm font-black text-cyan-700 transition group-hover:translate-x-1">
                        Начать →
                      </span>
                    </div>
                  </Link>
                );
              }
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
