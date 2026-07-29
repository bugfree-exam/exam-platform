"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type StartVariantButtonProps = {
  variantId: string;
  restart?: boolean;
  label?: string;
};

export function StartVariantButton({
  variantId,
  restart = false,
  label,
}: StartVariantButtonProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");

  async function start() {
    setError("");
    setIsPending(true);

    try {
      const response = await fetch(
        `/api/student/variants/${variantId}/attempts`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ restart }),
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

  return (
    <div>
      <button
        type="button"
        onClick={start}
        disabled={isPending}
        className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-cyan-700 disabled:opacity-60"
      >
        {isPending
          ? "Открываю…"
          : label ?? (restart ? "Решить ещё раз" : "Начать вариант")}
      </button>
      {error ? (
        <div className="mt-2 text-xs font-medium text-rose-600">{error}</div>
      ) : null}
    </div>
  );
}
