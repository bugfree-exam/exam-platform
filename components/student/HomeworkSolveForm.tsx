"use client";

import { FormEvent, useMemo, useState } from "react";

type AnswerType =
  | "TEXT"
  | "NUMBER"
  | "NUMBER_LIST"
  | "PAIR_LIST_ORDERED"
  | "PAIR_LIST_UNORDERED";

type StudentTask = {
  id: string;
  egeNumber: number;
  title: string;
  statementHtml: string;
  answerType: AnswerType;
  difficulty: number | null;

  /**
   * Эти поля появляются только после сдачи ДЗ.
   * До сдачи они не передаются с сервера, чтобы не светить правильные ответы.
   */
  correctAnswer?: unknown;
  explanationHtml?: string | null;
};

type ResultTask = {
  id: string;
  egeNumber: number;
  title: string;
  answerType: AnswerType;
  correctAnswer: unknown;
  explanationHtml: string | null;
};

type ResultAnswer = {
  taskId: string;
  task?: ResultTask;
  rawAnswer: unknown;
  normalizedAnswer: unknown;
  isCorrect: boolean;
};

type SubmitResult = {
  id: string;
  score: number;
  maxScore: number;
  percent: number;
  submittedAt: string | null;
  answers: ResultAnswer[];
};

type PreviousAttempt = {
  id: string;
  score: number;
  maxScore: number;
  percent: number;
  submittedAt: Date | string | null;
  answers: ResultAnswer[];
} | null;

type HomeworkSolveFormProps = {
  homeworkId: string;
  tasks: StudentTask[];
  previousAttempt: PreviousAttempt;
};

function getAnswerPlaceholder(answerType: StudentTask["answerType"]) {
  switch (answerType) {
    case "TEXT":
      return "Введите текстовый ответ";
    case "NUMBER":
      return "Например: 20";
    case "NUMBER_LIST":
      return "Например: 10 20 30";
    case "PAIR_LIST_ORDERED":
    case "PAIR_LIST_UNORDERED":
      return "1 2\n3 4";
    default:
      return "Введите ответ";
  }
}

function formatAnswer(answer: unknown) {
  if (Array.isArray(answer)) {
    if (answer.every((item) => Array.isArray(item))) {
      return answer
        .map((pair) => {
          if (!Array.isArray(pair)) {
            return "";
          }

          return pair.join(" ");
        })
        .join("\n");
    }

    return answer.join(" ");
  }

  if (answer === null || answer === undefined || answer === "") {
    return "—";
  }

  return String(answer);
}

function getResultTitle(percent: number) {
  if (percent === 100) {
    return "Отлично! Все задачи решены верно";
  }

  if (percent >= 80) {
    return "Хороший результат";
  }

  if (percent >= 50) {
    return "Есть ошибки, но база уже есть";
  }

  return "Нужно разобрать ошибки";
}

function getResultDescription(percent: number) {
  if (percent === 100) {
    return "Можно переходить дальше или попробовать решить похожие задачи.";
  }

  if (percent >= 80) {
    return "Осталось точечно разобрать ошибки и закрепить результат.";
  }

  if (percent >= 50) {
    return "Рекомендуется разобрать неверные задачи и попробовать решить ДЗ заново.";
  }

  return "Сейчас важнее не процент, а понять причины ошибок и повторить нужные номера.";
}

function getPercentColorClass(percent: number) {
  if (percent >= 80) {
    return "bg-emerald-50 text-emerald-700 border-emerald-100";
  }

  if (percent >= 50) {
    return "bg-amber-50 text-amber-700 border-amber-100";
  }

  return "bg-red-50 text-red-700 border-red-100";
}

function getAnswerTypeHint(answerType: StudentTask["answerType"]) {
  switch (answerType) {
    case "PAIR_LIST_ORDERED":
      return "В этом типе задания порядок пар важен.";
    case "PAIR_LIST_UNORDERED":
      return "В этом типе задания порядок пар не важен.";
    case "NUMBER_LIST":
      return "Проверяется весь список чисел.";
    case "NUMBER":
      return "Проверяется одно число.";
    case "TEXT":
      return "Проверяется текстовый ответ без лишних пробелов и регистра.";
    default:
      return "";
  }
}

function ResultPanel({
  result,
  tasks,
}: {
  result: SubmitResult | NonNullable<PreviousAttempt>;
  tasks: StudentTask[];
}) {
  const taskById = useMemo(() => {
    return new Map(tasks.map((task) => [task.id, task]));
  }, [tasks]);

  const wrongAnswers = result.answers.filter((answer) => !answer.isCorrect);
  const correctAnswers = result.answers.filter((answer) => answer.isCorrect);

  const weakNumbers = Array.from(
    new Set(
      wrongAnswers
        .map((answer) => answer.task?.egeNumber ?? taskById.get(answer.taskId)?.egeNumber)
        .filter((value): value is number => typeof value === "number")
    )
  ).sort((a, b) => a - b);

  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-slate-950 p-6 text-white">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <div className="text-sm font-medium text-cyan-200">
                Результат домашнего задания
              </div>

              <h2 className="mt-2 text-2xl font-bold">
                {getResultTitle(result.percent)}
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                {getResultDescription(result.percent)}
              </p>
            </div>

            <div className="rounded-3xl bg-white px-6 py-4 text-center text-slate-950">
              <div className="text-4xl font-black">{result.percent}%</div>
              <div className="mt-1 text-sm font-medium text-slate-500">
                {result.score} из {result.maxScore}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 p-6 md:grid-cols-3">
          <div className="rounded-2xl bg-emerald-50 p-4">
            <div className="text-sm font-medium text-emerald-700">Верно</div>
            <div className="mt-1 text-3xl font-bold text-emerald-800">
              {correctAnswers.length}
            </div>
          </div>

          <div className="rounded-2xl bg-red-50 p-4">
            <div className="text-sm font-medium text-red-700">Ошибок</div>
            <div className="mt-1 text-3xl font-bold text-red-800">
              {wrongAnswers.length}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="text-sm font-medium text-slate-600">
              Что повторить
            </div>
            <div className="mt-2 text-sm font-semibold text-slate-900">
              {weakNumbers.length > 0
                ? weakNumbers.map((number) => `№${number}`).join(", ")
                : "Ошибок нет"}
            </div>
          </div>
        </div>
      </div>

      {wrongAnswers.length > 0 ? (
        <div className="rounded-3xl border border-red-100 bg-red-50 p-6">
          <h3 className="text-xl font-bold text-red-900">Работа над ошибками</h3>
          <p className="mt-2 text-sm leading-6 text-red-800">
            Начни с этих задач. Посмотри свой ответ, сравни с правильным и
            перечитай пояснение. После этого можно решить ДЗ заново.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {wrongAnswers.map((answer) => {
              const task =
                answer.task ??
                taskById.get(answer.taskId);

              return (
                <a
                  key={answer.taskId}
                  href={`#task-result-${answer.taskId}`}
                  className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-red-700 shadow-sm transition hover:bg-red-100"
                >
                  №{task?.egeNumber ?? "?"} · {task?.title ?? "Задача"}
                </a>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="space-y-4">
        {result.answers.map((answer, index) => {
          const task =
            answer.task ??
            taskById.get(answer.taskId);

          const isCorrect = answer.isCorrect;

          return (
            <article
              id={`task-result-${answer.taskId}`}
              key={answer.taskId}
              className={
                isCorrect
                  ? "rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm"
                  : "rounded-3xl border border-red-100 bg-white p-6 shadow-sm"
              }
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      Задача {index + 1}
                    </span>

                    <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">
                      №{task?.egeNumber ?? "?"} ЕГЭ
                    </span>

                    <span
                      className={
                        isCorrect
                          ? "rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
                          : "rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700"
                      }
                    >
                      {isCorrect ? "Верно" : "Ошибка"}
                    </span>
                  </div>

                  <h3 className="mt-3 text-xl font-bold text-slate-950">
                    {task?.title ?? "Задача"}
                  </h3>

                  {task?.answerType ? (
                    <p className="mt-2 text-sm text-slate-500">
                      {getAnswerTypeHint(task.answerType)}
                    </p>
                  ) : null}
                </div>

                <div
                  className={`rounded-2xl border px-4 py-2 text-sm font-bold ${getPercentColorClass(
                    isCorrect ? 100 : 0
                  )}`}
                >
                  {isCorrect ? "+1 балл" : "0 баллов"}
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-sm font-semibold text-slate-500">
                    Твой ответ
                  </div>
                  <pre className="mt-2 whitespace-pre-wrap font-mono text-sm text-slate-900">
                    {formatAnswer(answer.rawAnswer)}
                  </pre>
                </div>

                <div
                  className={
                    isCorrect
                      ? "rounded-2xl bg-emerald-50 p-4"
                      : "rounded-2xl bg-red-50 p-4"
                  }
                >
                  <div
                    className={
                      isCorrect
                        ? "text-sm font-semibold text-emerald-700"
                        : "text-sm font-semibold text-red-700"
                    }
                  >
                    Правильный ответ
                  </div>
                  <pre className="mt-2 whitespace-pre-wrap font-mono text-sm text-slate-900">
                    {formatAnswer(task?.correctAnswer)}
                  </pre>
                </div>
              </div>

              {task?.explanationHtml ? (
                <details className="mt-5 rounded-2xl border border-slate-200 bg-white">
                  <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-800">
                    Показать разбор
                  </summary>

                  <div
                    className="prose prose-slate max-w-none border-t border-slate-200 px-4 py-4"
                    dangerouslySetInnerHTML={{ __html: task.explanationHtml }}
                  />
                </details>
              ) : (
                <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                  Разбор для этой задачи пока не добавлен.
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function HomeworkSolveForm({
  homeworkId,
  tasks,
  previousAttempt,
}: HomeworkSolveFormProps) {
  const initialAnswers = useMemo(() => {
    const result: Record<string, string> = {};

    for (const task of tasks) {
      const previousAnswer = previousAttempt?.answers.find(
        (answer) => answer.taskId === task.id
      );

      result[task.id] = previousAnswer
        ? formatAnswer(previousAnswer.rawAnswer)
        : "";
    }

    return result;
  }, [previousAttempt, tasks]);

  const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers);
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const visibleResult = submitResult ?? previousAttempt;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/student/homeworks/${homeworkId}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          answers,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Не удалось отправить домашнее задание");
        return;
      }

      setSubmitResult(data.attempt);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("Не удалось подключиться к серверу");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      {visibleResult ? (
        <ResultPanel result={visibleResult} tasks={tasks} />
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-950">
            {visibleResult ? "Решить заново" : "Решение домашнего задания"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {visibleResult
              ? "Можешь исправить ответы и отправить новую попытку. В результатах сохранится новая сдача."
              : "Заполни ответы на все задачи и отправь работу на проверку."}
          </p>
        </div>

        {tasks.map((task, index) => (
          <section
            key={task.id}
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">
                Задача {index + 1}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                №{task.egeNumber} ЕГЭ
              </span>
              {task.difficulty ? (
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                  Сложность {task.difficulty}/5
                </span>
              ) : null}
            </div>

            <h2 className="text-xl font-bold text-slate-950">{task.title}</h2>

            <div
              className="prose prose-slate mt-4 max-w-none"
              dangerouslySetInnerHTML={{ __html: task.statementHtml }}
            />

            <div className="mt-5">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Ваш ответ
              </label>

              {task.answerType.startsWith("PAIR_LIST") ? (
                <textarea
                  value={answers[task.id] ?? ""}
                  onChange={(event) =>
                    setAnswers((current) => ({
                      ...current,
                      [task.id]: event.target.value,
                    }))
                  }
                  rows={4}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 font-mono text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
                  placeholder={getAnswerPlaceholder(task.answerType)}
                />
              ) : (
                <input
                  value={answers[task.id] ?? ""}
                  onChange={(event) =>
                    setAnswers((current) => ({
                      ...current,
                      [task.id]: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 font-mono text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
                  placeholder={getAnswerPlaceholder(task.answerType)}
                />
              )}
            </div>
          </section>
        ))}

        <div className="sticky bottom-4 rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-lg backdrop-blur">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Проверяем..." : "Отправить на проверку"}
          </button>
        </div>
      </form>
    </div>
  );
}