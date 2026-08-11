"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import {
  LEARNING_ERROR_CAUSES,
  learningErrorCauseLabels,
  type LearningErrorCauseValue,
} from "@/lib/ai/errorCauses";

type AnswerType =
  | "TEXT"
  | "NUMBER"
  | "NUMBER_LIST"
  | "PAIR_LIST_ORDERED"
  | "PAIR_LIST_UNORDERED";

type AttemptResult = {
  id: string;
  createdAt: string;
  isCorrect: boolean;
  normalizedAnswer: unknown;
  correctAnswer: unknown;
  explanationHtml: string | null;
};

type AttemptResponse = {
  attempt: AttemptResult;
  nextTaskId: string | null;
};

function formatAnswer(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((item) => (Array.isArray(item) ? item.join(" ") : String(item)))
      .join(Array.isArray(value[0]) ? "\n" : " ");
  }

  return value === null || value === undefined ? "—" : String(value);
}

function getPlaceholder(answerType: AnswerType) {
  if (answerType === "NUMBER") return "Например: 42";
  if (answerType === "NUMBER_LIST") return "Например: 10 20 30";
  if (answerType.startsWith("PAIR_LIST")) return "1 2\n3 4";
  return "Введите ответ";
}

export function TrainerTaskSolver({
  taskId,
  egeNumber,
  answerType,
  studyPlanContext,
}: {
  taskId: string;
  egeNumber: number;
  answerType: AnswerType;
  studyPlanContext?: {
    planId: string;
    actionIndex: number;
    target: number;
    completedBefore: number;
    attemptKind: "PRACTICE" | "CONTROL";
  };
}) {
  const router = useRouter();
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [nextTaskId, setNextTaskId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [errorCause, setErrorCause] = useState<LearningErrorCauseValue | "">("");
  const [causeSaved, setCauseSaved] = useState(false);
  const [isSavingCause, setIsSavingCause] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setResult(null);
    setNextTaskId(null);
    setIsChecking(true);

    try {
      const response = await fetch(
        `/api/student/trainer/tasks/${taskId}/attempt`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            answer,
            studyPlanId: studyPlanContext?.planId,
            studyPlanActionIndex: studyPlanContext?.actionIndex,
            studyPlanAttemptKind: studyPlanContext?.attemptKind,
          }),
        }
      );
      const data = (await response.json().catch(() => ({}))) as
        | (AttemptResponse & { message?: string })
        | { message?: string };

      if (!response.ok || !("attempt" in data)) {
        setMessage(data.message || "Не удалось проверить ответ");
        return;
      }

      setResult(data.attempt);
      setNextTaskId(data.nextTaskId);
    } catch {
      setMessage("Не удалось подключиться к серверу");
    } finally {
      setIsChecking(false);
    }
  }

  function openNextTask() {
    if (!nextTaskId) return;

    const query = new URLSearchParams({ task: nextTaskId });
    if (studyPlanContext) {
      query.set("plan", studyPlanContext.planId);
      query.set("action", String(studyPlanContext.actionIndex));
      query.set("mode", "practice");
    }
    router.push(`/student/trainer/${egeNumber}?${query.toString()}`);
  }

  async function saveErrorCause() {
    if (!result || !errorCause) return;
    setIsSavingCause(true);
    setMessage("");
    try {
      const response = await fetch(
        `/api/student/trainer/attempts/${result.id}/error-cause`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ errorCause }),
        }
      );
      const body = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) throw new Error(body.message ?? "Не удалось сохранить причину");
      setCauseSaved(true);
    } catch (saveError) {
      setMessage(saveError instanceof Error ? saveError.message : "Не удалось сохранить причину");
    } finally {
      setIsSavingCause(false);
    }
  }

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-700">
        trainer.answer
      </div>
      <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
        Введите ответ
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        {studyPlanContext
          ? studyPlanContext.attemptKind === "CONTROL"
            ? "Это контрольная задача после паузы. Решите её самостоятельно — результат определит, освоен ли навык."
            : `Практика засчитается в этап плана: ${Math.min(
              studyPlanContext.completedBefore + (result ? 1 : 0),
              studyPlanContext.target
            )} из ${studyPlanContext.target}.`
          : "Результат этой проверки сразу попадёт в раздел «Результаты и ошибки»."}
      </p>

      <form onSubmit={handleSubmit} className="mt-5">
        {answerType.startsWith("PAIR_LIST") ? (
          <textarea
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            rows={5}
            maxLength={10_000}
            disabled={Boolean(result)}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 font-mono text-sm outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100 disabled:bg-slate-50"
            placeholder={getPlaceholder(answerType)}
          />
        ) : (
          <input
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            maxLength={10_000}
            disabled={Boolean(result)}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 font-mono text-sm outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100 disabled:bg-slate-50"
            placeholder={getPlaceholder(answerType)}
          />
        )}

        {!result ? (
          <button
            type="submit"
            disabled={isChecking}
            className="mt-3 w-full rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isChecking ? "Проверяем..." : "Проверить ответ"}
          </button>
        ) : null}
      </form>

      {message ? (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {message}
        </div>
      ) : null}

      {result ? (
        <div
          className={
            result.isCorrect
              ? "mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-5"
              : "mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5"
          }
        >
          <div
            className={
              result.isCorrect
                ? "text-lg font-black text-emerald-800"
                : "text-lg font-black text-amber-900"
            }
          >
            {result.isCorrect ? "Верно!" : "Есть ошибка"}
          </div>

          <div className="mt-3 text-sm text-slate-700">
            Правильный ответ:{" "}
            <strong className="whitespace-pre-wrap font-mono">
              {formatAnswer(result.correctAnswer)}
            </strong>
          </div>

          {result.explanationHtml ? (
            <div
              className="prose prose-slate mt-4 max-w-none border-t border-black/10 pt-4 text-sm"
              dangerouslySetInnerHTML={{
                __html: result.explanationHtml,
              }}
            />
          ) : null}

          {!result.isCorrect ? (
            <div className="mt-4 rounded-xl border border-amber-300 bg-white/80 p-4">
              <label className="text-sm font-bold text-slate-800">
                Что помешало решить задачу?
                <select
                  value={errorCause}
                  onChange={(event) => {
                    setErrorCause(event.target.value as LearningErrorCauseValue | "");
                    setCauseSaved(false);
                  }}
                  disabled={causeSaved}
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 font-normal"
                >
                  <option value="">Выберите причину</option>
                  {LEARNING_ERROR_CAUSES.map((cause) => (
                    <option key={cause} value={cause}>
                      {learningErrorCauseLabels[cause]}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={saveErrorCause}
                disabled={!errorCause || causeSaved || isSavingCause}
                className="mt-3 rounded-lg bg-amber-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
              >
                {causeSaved ? "Причина сохранена" : isSavingCause ? "Сохраняем…" : "Сохранить в дневник ошибок"}
              </button>
            </div>
          ) : null}

          {studyPlanContext?.attemptKind === "CONTROL" ? (
            <button
              type="button"
              onClick={() => router.push("/student/study-plan")}
              className="mt-5 w-full rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white"
            >
              Вернуться к плану →
            </button>
          ) : nextTaskId ? (
            <button
              type="button"
              onClick={openNextTask}
              className="mt-5 w-full rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-cyan-700"
            >
              Следующее задание №{egeNumber} →
            </button>
          ) : (
            <div className="mt-5 rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-600">
              Для этого номера пока доступно только одно задание.
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
