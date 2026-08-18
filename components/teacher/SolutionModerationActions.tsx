"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type PublicationStatus = "PRIVATE" | "PENDING_REVIEW" | "PUBLISHED" | "REJECTED";

export function SolutionModerationActions({
  solutionId,
  status,
  allowPublication,
}: {
  solutionId: string;
  status: PublicationStatus;
  allowPublication: boolean;
}) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState("");

  async function moderate(action: "PUBLISH" | "REJECT" | "UNPUBLISH") {
    setIsPending(true);
    setMessage("");
    try {
      const response = await fetch(`/api/teacher/solutions/${solutionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(data.message || "Не удалось обновить статус");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось обновить статус");
    } finally {
      setIsPending(false);
    }
  }

  if (!allowPublication) {
    return (
      <div className="rounded-xl bg-slate-100 px-4 py-3 text-xs leading-5 text-slate-500">
        Автор сохранил решение только для себя. Публикация недоступна без его разрешения.
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {status !== "PUBLISHED" ? (
          <button
            type="button"
            onClick={() => moderate("PUBLISH")}
            disabled={isPending}
            className="rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-black text-white disabled:opacity-50"
          >
            Одобрить и опубликовать
          </button>
        ) : (
          <button
            type="button"
            onClick={() => moderate("UNPUBLISH")}
            disabled={isPending}
            className="rounded-xl border border-amber-200 bg-white px-4 py-2.5 text-xs font-bold text-amber-800 disabled:opacity-50"
          >
            Снять с публикации
          </button>
        )}
        {status !== "REJECTED" && status !== "PUBLISHED" ? (
          <button
            type="button"
            onClick={() => moderate("REJECT")}
            disabled={isPending}
            className="rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-xs font-bold text-rose-700 disabled:opacity-50"
          >
            Отклонить
          </button>
        ) : null}
      </div>
      {message ? <div className="mt-2 text-xs font-bold text-rose-700">{message}</div> : null}
    </div>
  );
}
