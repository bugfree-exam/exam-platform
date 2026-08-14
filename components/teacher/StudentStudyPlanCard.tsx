"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { PLAN_LIMITS, type StudyPlan } from "@/lib/ai/planSchema";
import type { StudyPlanView } from "@/lib/ai/studyPlanView";
import { learningErrorCauseLabels } from "@/lib/ai/errorCauses";

type Props = {
  studentId: string;
  initialPlans: StudyPlanView[];
};

type PlanAction = "CONFIRM" | "CANCEL";
type PendingAction = "GENERATE" | "SAVE" | PlanAction | null;

const statusStyles = {
  DRAFT: "border-amber-200 bg-amber-50 text-amber-700",
  CONFIRMED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  CANCELLED: "border-slate-200 bg-slate-100 text-slate-600",
} as const;

const statusLabels = {
  DRAFT: "Черновик — виден только учителю",
  CONFIRMED: "Опубликован ученику",
  CANCELLED: "В истории",
} as const;

const priorityLabels = {
  HIGH: "Высокий",
  MEDIUM: "Средний",
  LOW: "Низкий",
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

async function readPlanResponse(response: Response) {
  let body: { plan?: StudyPlanView; message?: string } = {};

  try {
    body = (await response.json()) as typeof body;
  } catch {
    // Keep the user-facing fallback below.
  }

  if (!response.ok || !body.plan) {
    throw new Error(body.message ?? "Не удалось выполнить действие");
  }

  return body.plan;
}

function editablePlan(plan: StudyPlanView): StudyPlan {
  return {
    title: plan.title,
    summary: plan.summary,
    durationDays: plan.durationDays,
    topics: plan.topics.map((topic) => ({ ...topic })),
    actions: plan.actions.map((action) => ({ ...action })),
  };
}

export function StudentStudyPlanCard({ studentId, initialPlans }: Props) {
  const router = useRouter();
  const [plans, setPlans] = useState(initialPlans);
  const [selectedPlanId, setSelectedPlanId] = useState(
    initialPlans[0]?.id ?? null
  );
  const [draft, setDraft] = useState<StudyPlan | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [error, setError] = useState<string | null>(null);

  const plan = useMemo(
    () => plans.find((item) => item.id === selectedPlanId) ?? plans[0] ?? null,
    [plans, selectedPlanId]
  );
  const isPending = pendingAction !== null;
  const publishedPlans = plans.filter((item) => item.confirmedAt !== null);

  function replacePlan(nextPlan: StudyPlanView) {
    setPlans((current) => {
      const exists = current.some((item) => item.id === nextPlan.id);
      const reconciled = current.map((item) => {
        if (item.id === nextPlan.id) return nextPlan;
        if (
          nextPlan.status === "CONFIRMED" &&
          item.status === "CONFIRMED"
        ) {
          return { ...item, status: "CANCELLED" as const };
        }
        if (!exists && nextPlan.status === "DRAFT" && item.status === "DRAFT") {
          return { ...item, status: "CANCELLED" as const };
        }
        return item;
      });
      return exists ? reconciled : [nextPlan, ...reconciled];
    });
    setSelectedPlanId(nextPlan.id);
  }

  async function generatePlan() {
    setPendingAction("GENERATE");
    setError(null);
    setDraft(null);

    try {
      const response = await fetch(
        `/api/teacher/students/${studentId}/study-plan`,
        { method: "POST" }
      );
      replacePlan(await readPlanResponse(response));
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

  async function updateStatus(action: PlanAction) {
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
      replacePlan(await readPlanResponse(response));
      setDraft(null);
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

  async function saveDraft() {
    if (!plan || !draft) return;

    setPendingAction("SAVE");
    setError(null);

    try {
      const response = await fetch(
        `/api/teacher/students/${studentId}/study-plan`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planId: plan.id, plan: draft }),
        }
      );
      replacePlan(await readPlanResponse(response));
      setDraft(null);
      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Не удалось сохранить изменения"
      );
    } finally {
      setPendingAction(null);
    }
  }

  function updateTopic(
    index: number,
    field: "egeNumber" | "priority" | "reason",
    value: string | number
  ) {
    setDraft((current) =>
      current
        ? {
            ...current,
            topics: current.topics.map((topic, topicIndex) =>
              topicIndex === index ? { ...topic, [field]: value } : topic
            ),
          }
        : current
    );
  }

  function updateAction(
    index: number,
    field:
      | "day"
      | "egeNumber"
      | "skill"
      | "taskCount"
      | "minimumAccuracy"
      | "controlDelayDays"
      | "goal",
    value: string | number
  ) {
    setDraft((current) =>
      current
        ? {
            ...current,
            actions: current.actions.map((action, actionIndex) =>
              actionIndex === index ? { ...action, [field]: value } : action
            ),
          }
        : current
    );
  }

  function moveAction(index: number, direction: -1 | 1) {
    setDraft((current) => {
      if (!current) return current;
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.actions.length) return current;
      const actions = [...current.actions];
      [actions[index], actions[nextIndex]] = [actions[nextIndex], actions[index]];
      return { ...current, actions };
    });
  }

  return (
    <section className="mt-5 overflow-hidden rounded-3xl border border-cyan-200 bg-white shadow-sm">
      <div className="bg-gradient-to-r from-cyan-50 via-white to-violet-50 p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-slate-950 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-white">
                AI Assistant
              </span>
              <span className="text-xs font-semibold text-cyan-800">
                AI предлагает · учитель редактирует и публикует
              </span>
            </div>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
              Персональный учебный план
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
              Черновик виден только вам. После публикации ученик получит понятный
              маршрут и сможет запускать тренировки прямо из каждого этапа.
            </p>
          </div>

          <button
            type="button"
            onClick={generatePlan}
            disabled={isPending}
            className="inline-flex shrink-0 items-center justify-center rounded-xl bg-cyan-700 px-4 py-3 text-sm font-bold text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pendingAction === "GENERATE"
              ? "Анализируем новые данные…"
              : plans.length
                ? "Обновить план по новым данным"
                : "Сформировать учебный план"}
          </button>
        </div>

        {error ? (
          <div role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            {error}
          </div>
        ) : null}
      </div>

      {!plan ? (
        <div className="border-t border-cyan-100 p-6">
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-7 text-center text-sm text-slate-500">
            План ещё не сформирован. AI проанализирует обезличенную статистику и
            создаст первый черновик для вашей проверки.
          </div>
        </div>
      ) : (
        <div className="border-t border-cyan-100 p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className={`w-fit rounded-full border px-3 py-1.5 text-xs font-bold ${statusStyles[plan.status]}`}>
              {statusLabels[plan.status]}
            </span>
            <span className="text-xs text-slate-400">
              {formatDate(plan.createdAt)} · {plan.providerLabel}
              {plan.teacherEditedAt ? " · скорректирован учителем" : ""}
            </span>
          </div>

          {draft ? (
            <div className="mt-5 space-y-6 rounded-2xl border border-violet-200 bg-violet-50/40 p-4 sm:p-5">
              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_160px]">
                <label className="text-sm font-bold text-slate-700">
                  Заголовок
                  <input value={draft.title} maxLength={120} onChange={(event) => setDraft({ ...draft, title: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none focus:border-violet-400" />
                </label>
                <label className="text-sm font-bold text-slate-700">
                  Дней в плане
                  <input type="number" min={1} max={PLAN_LIMITS.maxDays} value={draft.durationDays} onChange={(event) => setDraft({ ...draft, durationDays: Number(event.target.value) })} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none focus:border-violet-400" />
                </label>
              </div>

              <label className="block text-sm font-bold text-slate-700">
                Общее пояснение
                <textarea value={draft.summary} maxLength={800} rows={3} onChange={(event) => setDraft({ ...draft, summary: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none focus:border-violet-400" />
              </label>

              <div>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-bold text-slate-950">Темы в фокусе</h3>
                  {draft.topics.length < PLAN_LIMITS.maxTopics ? (
                    <button type="button" onClick={() => setDraft({ ...draft, topics: [...draft.topics, { egeNumber: 1, priority: "MEDIUM", reason: "Добавьте пояснение" }] })} className="text-xs font-bold text-violet-700">+ Добавить тему</button>
                  ) : null}
                </div>
                <div className="mt-3 space-y-3">
                  {draft.topics.map((topic, index) => (
                    <div key={index} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-3 md:grid-cols-[110px_150px_minmax(0,1fr)_auto]">
                      <input aria-label={`Номер ЕГЭ темы ${index + 1}`} type="number" min={1} max={27} value={topic.egeNumber} onChange={(event) => updateTopic(index, "egeNumber", Number(event.target.value))} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                      <select aria-label={`Приоритет темы ${index + 1}`} value={topic.priority} onChange={(event) => updateTopic(index, "priority", event.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
                        <option value="HIGH">Высокий</option>
                        <option value="MEDIUM">Средний</option>
                        <option value="LOW">Низкий</option>
                      </select>
                      <input aria-label={`Причина темы ${index + 1}`} value={topic.reason} maxLength={300} onChange={(event) => updateTopic(index, "reason", event.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                      <button type="button" disabled={draft.topics.length === 1} onClick={() => setDraft({ ...draft, topics: draft.topics.filter((_, topicIndex) => topicIndex !== index) })} className="rounded-lg px-3 py-2 text-sm font-bold text-rose-600 disabled:opacity-30">Удалить</button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-bold text-slate-950">Этапы работы</h3>
                  {draft.actions.length < PLAN_LIMITS.maxActions ? (
                    <button type="button" onClick={() => setDraft({ ...draft, actions: [...draft.actions, { day: 1, egeNumber: draft.topics[0]?.egeNumber ?? 1, skill: "Укажите конкретный навык", taskCount: 5, minimumAccuracy: 75, controlDelayDays: 2, goal: "Добавьте цель этапа" }] })} className="text-xs font-bold text-violet-700">+ Добавить этап</button>
                  ) : null}
                </div>
                <div className="mt-3 space-y-3">
                  {draft.actions.map((action, index) => (
                    <div key={index} className="rounded-xl border border-slate-200 bg-white p-3">
                      <div className="grid gap-3 md:grid-cols-[90px_100px_minmax(0,1fr)]">
                        <input aria-label={`День этапа ${index + 1}`} type="number" min={1} max={draft.durationDays} value={action.day} onChange={(event) => updateAction(index, "day", Number(event.target.value))} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                        <input aria-label={`Номер ЕГЭ этапа ${index + 1}`} type="number" min={1} max={27} value={action.egeNumber} onChange={(event) => updateAction(index, "egeNumber", Number(event.target.value))} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                        <input aria-label={`Навык этапа ${index + 1}`} value={action.skill} maxLength={200} onChange={(event) => updateAction(index, "skill", event.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Конкретный проверяемый навык" />
                      </div>
                      <div className="mt-3 grid gap-3 md:grid-cols-[140px_160px_180px_minmax(0,1fr)]">
                        <label className="text-[11px] font-bold text-slate-500">Задач<input aria-label={`Количество задач этапа ${index + 1}`} type="number" min={1} max={PLAN_LIMITS.maxTasksPerAction} value={action.taskCount} onChange={(event) => updateAction(index, "taskCount", Number(event.target.value))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900" /></label>
                        <label className="text-[11px] font-bold text-slate-500">Точность, %<input aria-label={`Минимальная точность этапа ${index + 1}`} type="number" min={70} max={100} value={action.minimumAccuracy} onChange={(event) => updateAction(index, "minimumAccuracy", Number(event.target.value))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900" /></label>
                        <label className="text-[11px] font-bold text-slate-500">Пауза, дней<input aria-label={`Пауза перед контролем этапа ${index + 1}`} type="number" min={1} max={7} value={action.controlDelayDays} onChange={(event) => updateAction(index, "controlDelayDays", Number(event.target.value))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900" /></label>
                        <label className="text-[11px] font-bold text-slate-500">Цель этапа<input aria-label={`Цель этапа ${index + 1}`} value={action.goal} maxLength={300} onChange={(event) => updateAction(index, "goal", event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900" placeholder="Что ученик должен понять и уметь" /></label>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold">
                        <button type="button" disabled={index === 0} onClick={() => moveAction(index, -1)} className="rounded-lg bg-slate-100 px-2.5 py-1.5 disabled:opacity-30">↑ Выше</button>
                        <button type="button" disabled={index === draft.actions.length - 1} onClick={() => moveAction(index, 1)} className="rounded-lg bg-slate-100 px-2.5 py-1.5 disabled:opacity-30">↓ Ниже</button>
                        <button type="button" disabled={draft.actions.length === 1} onClick={() => setDraft({ ...draft, actions: draft.actions.filter((_, actionIndex) => actionIndex !== index) })} className="rounded-lg px-2.5 py-1.5 text-rose-600 disabled:opacity-30">Удалить</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-3 border-t border-violet-200 pt-4">
                <button type="button" onClick={saveDraft} disabled={isPending} className="rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">
                  {pendingAction === "SAVE" ? "Сохраняем…" : "Сохранить изменения"}
                </button>
                <button type="button" onClick={() => setDraft(null)} disabled={isPending} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700">Отмена</button>
              </div>
            </div>
          ) : (
            <>
              <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
                <article className="rounded-2xl border border-slate-200 p-5">
                  <h3 className="text-lg font-bold text-slate-950">{plan.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{plan.summary}</p>
                </article>
                <article className="rounded-2xl bg-slate-950 p-5 text-white">
                  <div className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-300">Выполнение плана</div>
                  <div className="mt-3 text-3xl font-bold">{plan.progress.percent}%</div>
                  <div className="mt-1 text-xs text-slate-400">{plan.progress.completedActions} из {plan.progress.totalActions} этапов освоено</div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-700">
                    <div className="h-full rounded-full bg-cyan-400" style={{ width: `${plan.progress.percent}%` }} />
                  </div>
                </article>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {plan.topics.map((topic, index) => (
                  <article key={`${topic.egeNumber}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-lg font-bold text-slate-950">Задание №{topic.egeNumber}</div>
                      <span className="rounded-full bg-white px-2 py-1 text-[11px] font-bold text-slate-600 shadow-sm">{priorityLabels[topic.priority]}</span>
                    </div>
                    <p className="mt-3 text-sm leading-5 text-slate-600">{topic.reason}</p>
                  </article>
                ))}
              </div>

              <div className="mt-5 space-y-2">
                {plan.actions.map((action, actionIndex) => {
                  const progress = plan.progress.actions[actionIndex];
                  return (
                    <div key={`${action.day}-${action.egeNumber}-${actionIndex}`} className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cyan-100 text-sm font-bold text-cyan-800">{action.day}</div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-slate-900">День {action.day} · {action.skill}</div>
                        <div className="mt-1 text-xs font-bold text-cyan-800">Задание №{action.egeNumber}</div>
                        <div className="mt-1 text-sm text-slate-500">{action.goal}</div>
                        <div className="mt-2 text-xs text-slate-500">
                          Практика {progress?.attempted ?? 0}/{action.taskCount} · точность последних задач {progress?.rollingAccuracy ?? 0}%/{action.minimumAccuracy}% · контроль {progress?.controlPassed ? "пройден" : `через ${action.controlDelayDays} дн.`}
                        </div>
                        {progress && Object.keys(progress.errorCauses).length > 0 ? (
                          <div className="mt-2 text-xs text-amber-800">
                            Причины ошибок: {Object.entries(progress.errorCauses).map(([cause, count]) => `${learningErrorCauseLabels[cause as keyof typeof learningErrorCauseLabels]} — ${count}`).join("; ")}
                          </div>
                        ) : null}
                      </div>
                      <div className="shrink-0 text-right text-sm font-bold text-slate-700">
                        {progress?.percent ?? 0}%
                        <div className="mt-1 text-[11px] font-medium text-slate-400">освоение навыка</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 flex flex-wrap gap-3 border-t border-slate-200 pt-5">
                {plan.status === "DRAFT" ? (
                  <>
                    <button type="button" onClick={() => setDraft(editablePlan(plan))} disabled={isPending} className="rounded-xl border border-violet-300 bg-violet-50 px-4 py-2.5 text-sm font-bold text-violet-800">Редактировать план</button>
                    <button type="button" onClick={() => updateStatus("CONFIRM")} disabled={isPending} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60">
                      {pendingAction === "CONFIRM" ? "Публикуем…" : "Утвердить и показать ученику"}
                    </button>
                  </>
                ) : null}
                {plan.status !== "CANCELLED" ? (
                  <button type="button" onClick={() => updateStatus("CANCEL")} disabled={isPending} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60">
                    {pendingAction === "CANCEL" ? "Отменяем…" : "Отменить план"}
                  </button>
                ) : null}
              </div>
            </>
          )}

          {plans.length > 1 ? (
            <div className="mt-7 border-t border-slate-200 pt-5">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <h3 className="font-bold text-slate-950">История планов</h3>
                  <p className="mt-1 text-xs text-slate-400">Сохраняются AI-черновики, правки и ранее опубликованные планы.</p>
                </div>
                <span className="text-xs text-slate-400">Опубликовано: {publishedPlans.length}</span>
              </div>
              <div className="mt-3 grid gap-2 lg:grid-cols-2">
                {plans.map((historyPlan) => (
                  <button key={historyPlan.id} type="button" onClick={() => { setSelectedPlanId(historyPlan.id); setDraft(null); setError(null); }} className={`rounded-xl border p-3 text-left transition ${historyPlan.id === plan.id ? "border-cyan-400 bg-cyan-50" : "border-slate-200 hover:border-slate-300"}`}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate text-sm font-bold text-slate-800">{historyPlan.title}</span>
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusStyles[historyPlan.status]}`}>{statusLabels[historyPlan.status]}</span>
                    </div>
                    <div className="mt-1 text-xs text-slate-400">{formatDate(historyPlan.createdAt)} · выполнено {historyPlan.progress.percent}%</div>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
