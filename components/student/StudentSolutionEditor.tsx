"use client";

import { useEffect, useState } from "react";

import { PythonCodeBlock } from "@/components/code/PythonCodeBlock";

type PublicationStatus =
  | "PRIVATE"
  | "PENDING_REVIEW"
  | "PUBLISHED"
  | "REJECTED";

type OwnSolution = {
  id: string;
  code: string;
  language: "PYTHON_3_13";
  taskRevisionId: string;
  allowPublication: boolean;
  publicationStatus: PublicationStatus;
  updatedAt: string;
};

type PeerSolution = {
  id: string;
  code: string;
  language: "PYTHON_3_13";
  author: string;
  version: number;
  publishedAt: string | null;
};

const statusMeta: Record<
  PublicationStatus,
  { label: string; className: string; description: string }
> = {
  PRIVATE: {
    label: "Только для меня",
    className: "bg-slate-100 text-slate-700",
    description: "Решение хранится в вашей личной истории.",
  },
  PENDING_REVIEW: {
    label: "На проверке учителя",
    className: "bg-amber-100 text-amber-800",
    description: "После проверки учитель сможет опубликовать решение.",
  },
  PUBLISHED: {
    label: "Опубликовано",
    className: "bg-emerald-100 text-emerald-800",
    description: "Другие ученики могут увидеть решение после своей попытки.",
  },
  REJECTED: {
    label: "Не опубликовано",
    className: "bg-rose-100 text-rose-800",
    description: "Можно доработать код и снова отправить его на проверку.",
  },
};

export function StudentSolutionEditor({
  taskId,
  taskRevisionId,
  canViewPeerSolutions,
}: {
  taskId: string;
  taskRevisionId: string;
  canViewPeerSolutions: boolean;
}) {
  const [activated, setActivated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [solution, setSolution] = useState<OwnSolution | null>(null);
  const [code, setCode] = useState("");
  const [allowPublication, setAllowPublication] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [peerSolutions, setPeerSolutions] = useState<PeerSolution[] | null>(null);
  const [isLoadingPeers, setIsLoadingPeers] = useState(false);

  useEffect(() => {
  if (!activated) return;

  let cancelled = false;

  void fetch(`/api/student/solutions/${taskId}`, { cache: "no-store" })
      .then(async (response) => {
        const data = (await response.json()) as {
          solution?: OwnSolution | null;
          message?: string;
        };
        if (!response.ok) throw new Error(data.message || "Не удалось загрузить решение");
        if (cancelled) return;
        setSolution(data.solution ?? null);
        setCode(data.solution?.code ?? "");
        setAllowPublication(data.solution?.allowPublication ?? false);
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить решение");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activated, taskId]);

  async function saveSolution() {
    setIsSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(`/api/student/solutions/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, allowPublication, taskRevisionId }),
      });
      const data = (await response.json()) as {
        solution?: OwnSolution;
        message?: string;
      };
      if (!response.ok || !data.solution) {
        throw new Error(data.message || "Не удалось сохранить решение");
      }
      setSolution(data.solution);
      setMessage("Решение сохранено в личной истории");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Не удалось сохранить решение");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteSolution() {
    if (!window.confirm("Удалить сохранённое решение? Публичный показ также прекратится.")) {
      return;
    }

    setIsSaving(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch(`/api/student/solutions/${taskId}`, {
        method: "DELETE",
      });
      const data = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) throw new Error(data.message || "Не удалось удалить решение");
      setSolution(null);
      setCode("");
      setAllowPublication(false);
      setMessage("Решение удалено");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Не удалось удалить решение");
    } finally {
      setIsSaving(false);
    }
  }

  async function loadPeerSolutions() {
    setIsLoadingPeers(true);
    setError("");
    try {
      const query = new URLSearchParams({ revision: taskRevisionId });
      const response = await fetch(
        `/api/student/solutions/${taskId}/public?${query}`,
        { cache: "no-store" }
      );
      const data = (await response.json()) as {
        solutions?: PeerSolution[];
        message?: string;
      };
      if (!response.ok) throw new Error(data.message || "Не удалось загрузить решения");
      setPeerSolutions(data.solutions ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить решения");
    } finally {
      setIsLoadingPeers(false);
    }
  }

  const meta = solution ? statusMeta[solution.publicationStatus] : null;

  return (
    <details
      className="mt-5 rounded-2xl border border-violet-200 bg-violet-50/40"
      onToggle={(event) => {
      if (event.currentTarget.open && !activated) {
        setIsLoading(true);
        setError("");
        setActivated(true);
      }
    }}
    >
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-black text-violet-950 marker:hidden">
        <span className="flex items-center justify-between gap-3">
          <span>⌘ Моё решение на Python</span>
          {meta ? (
            <span className={`rounded-full px-2.5 py-1 text-[10px] ${meta.className}`}>
              {meta.label}
            </span>
          ) : null}
        </span>
      </summary>

      <div className="space-y-4 border-t border-violet-200 p-4 sm:p-5">
        {isLoading ? (
          <div className="text-sm text-slate-500">Загружаем личное решение…</div>
        ) : (
          <>
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-sm font-bold text-slate-800" htmlFor={`solution-${taskId}`}>
                  Код решения
                </label>
                <span className="rounded-full bg-slate-950 px-2.5 py-1 font-mono text-[10px] font-bold text-cyan-300">
                  Python 3.13
                </span>
              </div>
              <textarea
                id={`solution-${taskId}`}
                value={code}
                onChange={(event) => {
                  setCode(event.target.value);
                  setMessage("");
                }}
                onKeyDown={(event) => {
                  if (event.key !== "Tab") return;
                  event.preventDefault();
                  const target = event.currentTarget;
                  const start = target.selectionStart;
                  const end = target.selectionEnd;
                  const nextCode = `${code.slice(0, start)}    ${code.slice(end)}`;
                  setCode(nextCode);
                  window.requestAnimationFrame(() => {
                    target.selectionStart = start + 4;
                    target.selectionEnd = start + 4;
                  });
                }}
                rows={12}
                maxLength={50_000}
                spellCheck={false}
                placeholder={"# Вставьте код, которым решали задачу\nanswer = ...\nprint(answer)"}
                className="mt-2 w-full rounded-2xl border border-slate-300 bg-[#0b1724] p-4 font-mono text-[13px] leading-6 text-slate-100 outline-none [tab-size:4] focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
              />
              <div className="mt-1 text-right text-[10px] text-slate-400">
                {code.length.toLocaleString("ru-RU")} / 50 000
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Платформа хранит код как заметку и не запускает его на сервере.
              </p>
            </div>

            {code.trim() ? (
              <details className="rounded-2xl border border-slate-200 bg-white p-3">
                <summary className="cursor-pointer text-xs font-bold text-slate-700">
                  Предпросмотр с подсветкой синтаксиса
                </summary>
                <PythonCodeBlock code={code} className="mt-3" />
              </details>
            ) : null}

            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
              <input
                type="checkbox"
                checked={allowPublication}
                onChange={(event) => setAllowPublication(event.target.checked)}
                className="mt-1 h-4 w-4 accent-cyan-700"
              />
              <span>
                <span className="block text-sm font-bold text-slate-800">
                  Разрешаю учителю опубликовать это решение
                </span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">
                  До проверки код видите только вы и преподаватель. Другим ученикам будет показано сокращённое имя.
                </span>
              </span>
            </label>

            {meta ? (
              <div className="rounded-xl bg-white px-4 py-3 text-xs leading-5 text-slate-600">
                <strong>{meta.label}.</strong> {meta.description}
              </div>
            ) : null}

            {solution && solution.taskRevisionId !== taskRevisionId ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
                Этот код был сохранён для другой версии условия. После
                обновления он снова пройдёт проверку учителя.
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={saveSolution}
                disabled={isSaving || !code.trim()}
                className="rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white disabled:opacity-50"
              >
                {isSaving ? "Сохраняем…" : solution ? "Обновить решение" : "Сохранить решение"}
              </button>
              {solution ? (
                <button
                  type="button"
                  onClick={deleteSolution}
                  disabled={isSaving}
                  className="rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-xs font-bold text-rose-700 disabled:opacity-50"
                >
                  Удалить
                </button>
              ) : null}
            </div>

            {message ? <div className="text-xs font-bold text-emerald-700">{message}</div> : null}
          </>
        )}

        <div className="border-t border-violet-200 pt-4">
          {canViewPeerSolutions ? (
            <button
              type="button"
              onClick={loadPeerSolutions}
              disabled={isLoadingPeers}
              className="rounded-xl border border-violet-300 bg-white px-4 py-2.5 text-xs font-black text-violet-800 disabled:opacity-50"
            >
              {isLoadingPeers ? "Загружаем…" : "Показать решения других учеников"}
            </button>
          ) : (
            <p className="text-xs leading-5 text-slate-500">
              Решения других учеников откроются после верного ответа или повторной попытки. Первая ошибка по-прежнему даёт только подсказку.
            </p>
          )}

          {peerSolutions ? (
            <div className="mt-4 space-y-4">
              {peerSolutions.length ? (
                peerSolutions.map((peer) => (
                  <article key={peer.id} className="rounded-2xl border border-violet-200 bg-white p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm font-black text-slate-900">Решение: {peer.author}</div>
                      <span className="text-[10px] font-bold text-emerald-700">
                        Проверено учителем · версия {peer.version}
                      </span>
                    </div>
                    <PythonCodeBlock code={peer.code} />
                  </article>
                ))
              ) : (
                <div className="rounded-xl bg-white px-4 py-3 text-xs text-slate-500">
                  Учитель пока не опубликовал решения других учеников для этой задачи.
                </div>
              )}
            </div>
          ) : null}
        </div>

        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
            {error}
          </div>
        ) : null}
      </div>
    </details>
  );
}
