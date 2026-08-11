import Link from "next/link";

import { requireStudentPage } from "@/lib/access";
import { toStudyPlanView } from "@/lib/ai/studyPlanView";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const priorityLabels = {
  HIGH: "Высокий приоритет",
  MEDIUM: "Средний приоритет",
  LOW: "Низкий приоритет",
} as const;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

export default async function StudentStudyPlanPage() {
  const user = await requireStudentPage();
  const records = await prisma.studentStudyPlan.findMany({
    where: {
      studentId: user.id,
      confirmedAt: { not: null },
    },
    orderBy: { confirmedAt: "desc" },
    take: 12,
    include: {
      generation: { select: { provider: true } },
      practiceAttempts: {
        select: {
          studyPlanActionIndex: true,
          isCorrect: true,
        },
      },
    },
  });
  const plans = records.map(toStudyPlanView);
  const plan = plans.find((item) => item.status === "CONFIRMED") ?? null;
  const history = plans.filter((item) => item.id !== plan?.id);

  return (
    <main className="min-h-screen bg-[#f3f7fa] px-4 py-5 text-[#102638] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <nav className="flex items-center justify-between gap-4 rounded-2xl border border-white bg-white/90 px-4 py-3 shadow-sm">
          <Link href="/student" className="text-sm font-bold text-slate-600 hover:text-cyan-700">
            ← На главную
          </Link>
          <Link href="/student/results" className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700">
            Результаты и ошибки
          </Link>
        </nav>

        <header className="mt-5 overflow-hidden rounded-[32px] bg-[#092535] px-6 py-8 text-white shadow-xl sm:px-9">
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-cyan-300">personal.route</div>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] sm:text-5xl">Мой план</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
            Здесь только конкретные шаги: что тренировать, сколько задач решить и
            какой результат уже засчитан.
          </p>
        </header>

        {!plan ? (
          <section className="mt-5 rounded-[30px] border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
            <h2 className="text-xl font-black">Активного плана пока нет</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Учитель сначала проверяет и корректирует рекомендации. После
              публикации план автоматически появится здесь.
            </p>
          </section>
        ) : (
          <>
            <section className="mt-5 rounded-[30px] border border-white bg-white p-5 shadow-sm sm:p-7">
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.14em] text-cyan-700">
                    Опубликован {formatDate(plan.confirmedAt ?? plan.createdAt)}
                  </div>
                  <h2 className="mt-2 text-3xl font-black tracking-tight">{plan.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{plan.summary}</p>
                  {plan.teacherEditedAt ? (
                    <div className="mt-3 text-xs font-semibold text-violet-700">Сформировано AI · скорректировано учителем</div>
                  ) : null}
                </div>
                <div className="rounded-2xl bg-slate-950 p-5 text-white">
                  <div className="text-xs font-bold uppercase tracking-[0.14em] text-cyan-300">Общий прогресс</div>
                  <div className="mt-3 text-4xl font-black">{plan.progress.percent}%</div>
                  <div className="mt-1 text-xs text-slate-400">{plan.progress.completedTasks} из {plan.progress.totalTasks} задач</div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-cyan-300" style={{ width: `${plan.progress.percent}%` }} />
                  </div>
                </div>
              </div>

              <div className="mt-7">
                <h3 className="text-lg font-black">Зачем мы работаем над этими номерами</h3>
                <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {plan.topics.map((topic, index) => (
                    <article key={`${topic.egeNumber}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="text-lg font-black">Задание №{topic.egeNumber}</div>
                        <span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold text-slate-500">{priorityLabels[topic.priority]}</span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-600">{topic.reason}</p>
                    </article>
                  ))}
                </div>
              </div>

              <div className="mt-7">
                <h3 className="text-lg font-black">Шаги плана</h3>
                <div className="mt-3 space-y-3">
                  {plan.actions.map((action, actionIndex) => {
                    const progress = plan.progress.actions[actionIndex];
                    return (
                      <article key={`${action.day}-${action.egeNumber}-${actionIndex}`} className={`rounded-2xl border p-4 sm:p-5 ${progress?.isCompleted ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"}`}>
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                          <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-sm font-black ${progress?.isCompleted ? "bg-emerald-600 text-white" : "bg-cyan-100 text-cyan-800"}`}>
                            {progress?.isCompleted ? "✓" : action.day}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-black">День {action.day} · задание №{action.egeNumber}</div>
                            <p className="mt-1 text-sm leading-6 text-slate-500">{action.goal}</p>
                            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200">
                              <div className={`h-full rounded-full ${progress?.isCompleted ? "bg-emerald-500" : "bg-cyan-500"}`} style={{ width: `${progress?.percent ?? 0}%` }} />
                            </div>
                            <div className="mt-1 text-xs text-slate-400">
                              Решено {Math.min(progress?.attempted ?? 0, action.taskCount)} из {action.taskCount} · верно {progress?.correct ?? 0}
                            </div>
                          </div>
                          <Link href={`/student/trainer/${action.egeNumber}?plan=${plan.id}&action=${actionIndex}`} className={`shrink-0 rounded-xl px-4 py-2.5 text-center text-sm font-bold ${progress?.isCompleted ? "border border-emerald-300 bg-white text-emerald-800" : "bg-cyan-700 text-white"}`}>
                            {progress?.isCompleted ? "Потренироваться ещё" : "Начать тренировку"} →
                          </Link>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            </section>
          </>
        )}

        {history.length > 0 ? (
          <section className="mt-5 rounded-[30px] border border-white bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-xl font-black">История планов</h2>
            <p className="mt-1 text-sm text-slate-500">Ранее опубликованные маршруты и достигнутый результат.</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {history.map((item) => (
                <article key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-bold text-slate-400">{formatDate(item.confirmedAt ?? item.createdAt)}</div>
                  <h3 className="mt-2 font-black text-slate-800">{item.title}</h3>
                  <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                    <span className="text-slate-500">{item.progress.completedTasks}/{item.progress.totalTasks} задач</span>
                    <span className="font-black text-cyan-800">{item.progress.percent}%</span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
