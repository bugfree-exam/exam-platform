"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type DeleteWebinarButtonProps = {
  webinarId: string;
  webinarTitle: string;
};

export function DeleteWebinarButton({
  webinarId,
  webinarTitle,
}: DeleteWebinarButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    const confirmed = window.confirm(
      `Удалить вебинар «${webinarTitle}»? Это действие нельзя отменить.`
    );

    if (!confirmed) return;

    setIsDeleting(true);
    setError("");

    try {
      const response = await fetch(`/api/webinars/${webinarId}`, {
        method: "DELETE",
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.message || "Не удалось удалить вебинар");
        return;
      }

      router.push("/teacher/webinars");
      router.refresh();
    } catch {
      setError("Не удалось подключиться к серверу");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleDelete}
        disabled={isDeleting}
        className="rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isDeleting ? "Удаляем..." : "Удалить вебинар"}
      </button>
      {error ? <div className="max-w-xs text-xs text-rose-700">{error}</div> : null}
    </div>
  );
}
