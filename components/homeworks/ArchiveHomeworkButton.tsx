"use client";

import { useRouter } from "next/navigation";

type ArchiveHomeworkButtonProps = {
  homeworkId: string;
  currentStatus: "DRAFT" | "ASSIGNED" | "ARCHIVED";
};

export function ArchiveHomeworkButton({
  homeworkId,
  currentStatus,
}: ArchiveHomeworkButtonProps) {
  const router = useRouter();

  const isArchived = currentStatus === "ARCHIVED";

  async function handleClick() {
    const confirmed = window.confirm(
      isArchived
        ? "Вернуть это ДЗ из архива в активные?"
        : "Архивировать это ДЗ? Оно пропадёт из активного контроля, но история решений сохранится."
    );

    if (!confirmed) {
      return;
    }

    const response = await fetch(`/api/homeworks/${homeworkId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: isArchived ? "ASSIGNED" : "ARCHIVED",
      }),
    });

    if (!response.ok) {
      alert("Не удалось изменить статус ДЗ");
      return;
    }

    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={
        isArchived
          ? "rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
          : "rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-100"
      }
    >
      {isArchived ? "Вернуть из архива" : "В архив"}
    </button>
  );
}