"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type AnswerType =
  | "TEXT"
  | "NUMBER"
  | "NUMBER_LIST"
  | "PAIR_LIST_ORDERED"
  | "PAIR_LIST_UNORDERED";

type CheckResult = {
  isCorrect: boolean;
  normalizedAnswer: unknown;
  feedbackStage: "HINT" | "SOLUTION";
  correctAnswer: unknown | null;
  hintHtml: string | null;
  explanationHtml: string | null;
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

export function PublicTaskSolver({
  taskId,
  answerType,
  nextTaskHref,
  nextTaskLabel,
}: {
  taskId: string;
  answerType: AnswerType;
  nextTaskHref: string | null;
  nextTaskLabel: string;
}) {
  const router = useRouter();
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<CheckResult | null>(null);
  const [message, setMessage] = useState("");
  const [isChecking, setIsChecking] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setResult(null);
    setIsChecking(true);

    try {
      const response = await fetch(`/api/public/tasks/${taskId}/check`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ answer }),
      });
      const data = (await response.json().catch(() => ({}))) as
        | (CheckResult & { message?: string })
        | { message?: string };

      if (!response.ok || !("isCorrect" in data)) {
        setMessage(data.message || "Не удалось проверить ответ");
        return;
      }

      setResult(data);
    } catch {
      setMessage("Не удалось подключиться к серверу");
    } finally {
      setIsChecking(false);
    }
  }

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-700">
        answer.check
      </div>
      <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
        Ваш ответ
      </h2>

      <form onSubmit={handleSubmit} className="mt-5">
        {answerType.startsWith("PAIR_LIST") ? (
          <textarea
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            rows={5}
            maxLength={10_000}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 font-mono text-sm outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
            placeholder={getPlaceholder(answerType)}
          />
        ) : (
          <input
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            maxLength={10_000}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 font-mono text-sm outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
            placeholder={getPlaceholder(answerType)}
          />
        )}

        <button
          type="submit"
          disabled={isChecking}
          className="mt-3 w-full rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isChecking ? "Проверяем..." : "Проверить ответ"}
        </button>
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
            {result.isCorrect ? "Верно!" : "Пока неверно"}
          </div>

          {result.correctAnswer !== null ? (
            <div className="mt-3 text-sm text-slate-700">
              Правильный ответ:{" "}
              <strong className="whitespace-pre-wrap font-mono">
                {formatAnswer(result.correctAnswer)}
              </strong>
            </div>
          ) : null}

          {result.hintHtml ? (
            <div className="prose prose-slate mt-4 max-w-none rounded-xl border border-amber-300 bg-white p-4 text-sm" dangerouslySetInnerHTML={{ __html: result.hintHtml }} />
          ) : null}

          {result.explanationHtml ? (
            <div
              className="prose prose-slate mt-4 max-w-none border-t border-black/10 pt-4 text-sm"
              dangerouslySetInnerHTML={{
                __html: result.explanationHtml,
              }}
            />
          ) : null}

          {!result.isCorrect ? (
            <button
              type="button"
              onClick={() => {
                setResult(null);
                setAnswer("");
              }}
              className="mt-5 w-full rounded-xl bg-amber-700 px-5 py-3 text-sm font-black text-white"
            >
              Попробовать ещё раз →
            </button>
          ) : nextTaskHref ? (
            <button
              type="button"
              onClick={() => router.push(nextTaskHref)}
              className="mt-5 w-full rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-cyan-700"
            >
              {nextTaskLabel}
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
