"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type StartVariantButtonProps = {
  variantId: string;
  restart?: boolean;
  resume?: boolean;
  label?: string;
};

export function StartVariantButton({
  variantId,
  restart = false,
  resume = false,
  label,
}: StartVariantButtonProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [showTimerChoice, setShowTimerChoice] = useState(false);
  const [error, setError] = useState("");

  async function start(timerEnabled: boolean) {
    setError("");
    setIsPending(true);

    try {
      const response = await fetch(
        `/api/student/variants/${variantId}/attempts`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ restart, timerEnabled }),
        }
      );
      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Не удалось начать вариант");
        return;
      }

      router.push(
        `/student/variants/${variantId}/attempt/${data.attempt.id}`
      );
      router.refresh();
    } catch {
      setError("Не удалось подключиться к серверу");
    } finally {
      setIsPending(false);
    }
  }

  if (showTimerChoice) {
    return (
      <div className="min-w-[260px] rounded-2xl border border-cyan-200 bg-cyan-50 p-3">
        <div className="text-sm font-black text-slate-950">
          Как будете решать?
        </div>
        <p className="mt-1 text-xs leading-5 text-slate-600">
          С таймером работа завершится по окончании установленного времени. Без
          таймера ограничений нет.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void start(true)}
            disabled={isPending}
            className="rounded-xl bg-slate-950 px-4 py-2 text-xs font-black text-white disabled:opacity-60"
          >
            {isPending ? "Открываю…" : "С таймером"}
          </button>
          <button
            type="button"
            onClick={() => void start(false)}
            disabled={isPending}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-black text-slate-700 disabled:opacity-60"
          >
            Без таймера
          </button>
          <button
            type="button"
            onClick={() => setShowTimerChoice(false)}
            disabled={isPending}
            className="px-2 py-2 text-xs font-bold text-slate-500"
          >
            Отмена
          </button>
        </div>
        {error ? <div className="mt-2 text-xs font-medium text-rose-600">{error}</div> : null}
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() =>
          resume ? void start(true) : setShowTimerChoice(true)
        }
        disabled={isPending}
        className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-cyan-700 disabled:opacity-60"
      >
        {label ?? (restart ? "Решить ещё раз" : "Начать вариант")}
      </button>
      {error ? <div className="mt-2 text-xs font-medium text-rose-600">{error}</div> : null}
    </div>
  );
}
