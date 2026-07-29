"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type VariantStatusButtonProps = {
  variantId: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
};

export function VariantStatusButton({
  variantId,
  status,
}: VariantStatusButtonProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const nextStatus = status === "PUBLISHED" ? "ARCHIVED" : "PUBLISHED";

  async function updateStatus() {
    setIsPending(true);

    try {
      const response = await fetch(`/api/variants/${variantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await response.json();

      if (!response.ok) {
        window.alert(data.message || "Не удалось изменить статус");
        return;
      }

      router.refresh();
    } catch {
      window.alert("Не удалось подключиться к серверу");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={updateStatus}
      disabled={isPending}
      className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-cyan-300 hover:text-cyan-800 disabled:opacity-60"
    >
      {isPending
        ? "Обновляю…"
        : status === "PUBLISHED"
          ? "Убрать из доступа"
          : "Опубликовать"}
    </button>
  );
}
