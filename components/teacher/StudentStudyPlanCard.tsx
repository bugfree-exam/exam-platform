"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { StudyPlanView } from "@/lib/ai/studyPlanView";

type StudentStudyPlanCardProps = {
  studentId: string;
  initialPlan: StudyPlanView | null;
};

type PlanAction = "CONFIRM" | "CANCEL";

const statusStyles = {
  DRAFT: "border-amber-200 bg-amber-50 text-amber-700",
  CONFIRMED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  CANCELLED: "border-slate-200 bg-slate-100 text-slate-600",
} as const;

const statusLabels = {
  DRAFT: "Черновик — ждёт решения учителя",
  CONFIRMED: "Подтверждён учителем",
  CANCELLED: "Отменён",
} as const;

const categoryLabels = {
  INSUFFICIENT_DATA: "Мало данных",
  CRITICAL_GAP: "Критический пробел",
  PRACTICE: "Нужна практика",
  CONSOLIDATE: "Закрепление",
  MASTERED: "Освоено",
} as const;

const trendLabels = {
  IMPROVING: "результат растёт",
  DECLINING: "результат снижается",
  STABLE: "результат стабилен",
  INSUFFICIENT_DATA: "пока мало данных",
} as const;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

async function readResponse(response: Response) {
  let body: { plan?: StudyPlanView; message?: string } = {};

  try {
    body = (await response.json()) as typeof body;
  } catch {
    // A generic message below is safer than exposing an unexpected server body.
  }

  if (!response.ok || !body.plan) {
    throw new Error(body.message ?? "Не удалось выполнить действие");
  }

  return body.plan;
}

export function StudentStudyPlanCard({
  studentId,
  initialPlan,
}: StudentStudyPlanCardProps) {
  const router = useRouter();
  const [plan, setPlan] = useState(initialPlan);
  const [pendingAction, setPendingAction] = useState<
    "GENERATE" | PlanAction | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  async function generatePlan() {
    setPendingAction("GENERATE");
    setError(null);

    try {
      const response = await fetch(
        `/api/teacher/students/${studentId}/study-plan`,
        { method: "POST" }
      );
      const nextPlan = await readResponse(response);
      setPlan(nextPlan);
      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Не удалось сформировать план"
      );
    } finally {
      setPendingAction(null);
    }
  }

  async function updatePlan(action: PlanAction) {
    if (!plan) return;

    setPendingAction(action);
    setError(null);

    try {
      const response = await fetch(
        `/api/teacher/students/${studentId}/study-plan`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planId: plan.id, action }),
        }
      );
      const nextPlan = await readResponse(response);
      setPlan(nextPlan);
      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Не удалось изменить план"
      );
    } finally {
      setPendingAction(null);
    }
  }

  const isPending = pendingAction !== null;

  return (
    <section className="mt-5 overflow-hidden rounded-3xl border border-cyan-200 bg-white shadow-sm">
      <div className="bg-gradient-to-r from-cyan-50 via-white to-violet-50 p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-slate-950 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-white">
                AI Assistant · mock
              </span>
              <span className="text-xs font-semibold text-cyan-800">
                Локальный тест без платного AI
              </span>
            </div>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
              Персональный учебный план
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
              Рекомендации строятся по обезличенным результатам ДЗ, тренажёра и
              пробных вариантов. План не виден ученику, пока мы тестируем методику.
            </p>
          </div>

          <button
            type="button"
            onClick={generatePlan}
            disabled={isPending}
            className="inline-flex shrink-0 items-center justify-center rounded-xl bg-cyan-700 px-4 py-3 text-sm font-bold text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pendingAction === "GENERATE"
              ? "Формируем план…"
              : plan
                ? "Сформировать заново"
                : "Сформировать учебный план"}
          </button>
        </div>

        {error ? (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700"
          >
            {error}
          </div>
        ) : null}
      </div>

      {!plan ? (
        <div className="border-t border-cyan-100 p-5 sm:p-6">
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-7 text-center">
            <div className="font-semibold text-slate-800">
              План ещё не сформирован
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Нажмите кнопку выше — mock-провайдер проанализирует текущую
              статистику ученика и создаст первый черновик.
            </p>
          </div>
        </div>
      ) : (
        <div className="border-t border-cyan-100 p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span
              className={`w-fit rounded-full border px-3 py-1.5 text-xs font-bold ${statusStyles[plan.status]}`}
            >
              {statusLabels[plan.status]}
            </span>
            <span className="text-xs text-slate-400">
              Создан {formatDate(plan.createdAt)} · провайдер {plan.provider}
            </span>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
            <article className="rounded-2xl border border-slate-200 p-5">
              <h3 className="text-lg font-bold text-slate-950">{plan.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {plan.summary}
              </p>
            </article>

            <article className="rounded-2xl bg-slate-950 p-5 text-white">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-300">
                Снимок статистики
              </div>
              <div className="mt-3 grid grid-cols-2 gap-4">
                <div>
                  <div className="text-2xl font-bold">
                    {plan.analytics.totalAnswers}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">ответов</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {plan.analytics.overallAccuracy}%
                  </div>
                  <div className="mt-1 text-xs text-slate-400">точность</div>
                </div>
              </div>
              <div className="mt-4 border-t border-slate-700 pt-4 text-xs leading-5 text-slate-300">
                Варианты: {plan.analytics.variants.attempts} · {trendLabels[plan.analytics.variants.trend]}
              </div>
            </article>
          </div>

          <div className="mt-5">
            <h3 className="font-bold text-slate-950">Темы в фокусе</h3>
            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {plan.topics.map((topic) => {
                const analytics = plan.analytics.topics.find(
                  (item) => item.egeNumber === topic.egeNumber
                );

                return (
                  <article
                    key={topic.egeNumber}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-lg font-bold text-slate-950">
                        Задание №{topic.egeNumber}
                      </div>
                      <span className="rounded-full bg-white px-2 py-1 text-[11px] font-bold text-slate-600 shadow-sm">
                        {topic.priority === "HIGH"
                          ? "Высокий"
                          : topic.priority === "MEDIUM"
                            ? "Средний"
                            : "Низкий"}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-lg bg-white px-2 py-1 font-semibold text-slate-700">
                        Точность {analytics?.accuracy ?? 0}%
                      </span>
                      <span className="rounded-lg bg-white px-2 py-1 font-semibold text-slate-700">
                        {analytics
                          ? categoryLabels[analytics.category]
                          : "Мало данных"}
                      </span>
                      {analytics?.recentAccuracy !== null && analytics ? (
                        <span className="rounded-lg bg-white px-2 py-1 font-semibold text-slate-700">
                          Последние: {analytics.recentAccuracy}%
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-3 text-sm leading-5 text-slate-600">
                      {topic.reason}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>

          <div className="mt-5">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <h3 className="font-bold text-slate-950">
                Последовательность работы
              </h3>
              <span className="text-xs text-slate-400">
                {plan.durationDays} дней · {plan.actions.reduce((sum, action) => sum + action.taskCount, 0)} задач
              </span>
            </div>
            <div className="mt-3 space-y-2">
              {[...plan.actions]
                .sort((a, b) => a.day - b.day)
                .map((action, index) => (
                  <div
                    key={`${action.day}-${action.egeNumber}-${index}`}
                    className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center"
                  >
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cyan-100 text-sm font-bold text-cyan-800">
                      {action.day}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-slate-900">
                        День {action.day} · задание №{action.egeNumber}
                      </div>
                      <div className="mt-1 text-sm text-slate-500">
                        {action.goal}
                      </div>
                    </div>
                    <div className="shrink-0 rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700">
                      {action.taskCount} задач
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3 border-t border-slate-200 pt-5">
            {plan.status === "DRAFT" ? (
              <button
                type="button"
                onClick={() => updatePlan("CONFIRM")}
                disabled={isPending}
                className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"
              >
                {pendingAction === "CONFIRM"
                  ? "Подтверждаем…"
                  : "Подтвердить план"}
              </button>
            ) : null}

            {plan.status !== "CANCELLED" ? (
              <button
                type="button"
                onClick={() => updatePlan("CANCEL")}
                disabled={isPending}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                {pendingAction === "CANCEL" ? "Отменяем…" : "Отменить"}
              </button>
            ) : null}

            <span className="self-center text-xs text-slate-400">
              Редактирование добавим после проверки методики на реальных данных.
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
