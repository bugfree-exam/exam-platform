import Link from "next/link";

import type { StudyPlanView } from "@/lib/ai/studyPlanView";

export function StudyPlanSummaryCard({ plan }: { plan: StudyPlanView }) {
  const nextAction = plan.actions.find(
    (_action, index) => !plan.progress.actions[index]?.isCompleted
  );
  const nextActionIndex = nextAction ? plan.actions.indexOf(nextAction) : -1;
  const nextProgress =
    nextActionIndex >= 0 ? plan.progress.actions[nextActionIndex] : undefined;
  const controlAvailable = Boolean(
    nextProgress?.controlAvailableAt &&
      new Date(nextProgress.controlAvailableAt) <= new Date()
  );
  const nextHref = nextAction
    ? `/student/trainer/${nextAction.egeNumber}?plan=${plan.id}&action=${nextActionIndex}${
        nextProgress?.accuracyMet && controlAvailable ? "&mode=control" : ""
      }`
    : "";

  return (
    <section className="mt-5 overflow-hidden rounded-[30px] border border-cyan-200 bg-gradient-to-r from-cyan-50 via-white to-violet-50 p-5 shadow-sm sm:p-6">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#0b2436] px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-200">
              мой персональный план
            </span>
            <span className="text-xs font-bold text-cyan-800">
              {plan.durationDays} дней · {plan.progress.totalTasks} задач
            </span>
          </div>
          <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">
            {plan.title}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            {nextAction
              ? `Следующий шаг: ${nextAction.skill} — ${
                  nextProgress?.accuracyMet
                    ? controlAvailable
                      ? "контрольная задача"
                      : "пауза перед контрольной"
                    : nextAction.goal
                }`
              : "План выполнен. Отличная работа — результаты уже доступны учителю."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {nextAction ? (
              <Link
                href={nextHref}
                className="rounded-xl bg-cyan-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-cyan-800"
              >
                {nextProgress?.accuracyMet && controlAvailable
                  ? "Пройти контроль →"
                  : "Продолжить этап →"}
              </Link>
            ) : null}
            <Link
              href="/student/study-plan"
              className="rounded-xl border border-cyan-200 bg-white px-4 py-2.5 text-sm font-bold text-cyan-900"
            >
              Открыть весь план
            </Link>
          </div>
        </div>

        <div className="rounded-2xl bg-[#0b2436] p-5 text-white">
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="text-3xl font-black">{plan.progress.percent}%</div>
              <div className="mt-1 text-xs text-slate-400">выполнено</div>
            </div>
            <div className="text-right text-sm font-bold text-cyan-200">
              {plan.progress.completedActions}/{plan.progress.totalActions} этапов
            </div>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-cyan-300"
              style={{ width: `${plan.progress.percent}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
