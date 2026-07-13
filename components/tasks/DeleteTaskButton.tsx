"use client";

import { useRouter } from "next/navigation";

type DeleteTaskButtonProps = {
  taskId: string;
};

export function DeleteTaskButton({ taskId }: DeleteTaskButtonProps) {
  const router = useRouter();

  async function handleDelete() {
    const confirmed = window.confirm(
      "Удалить задачу из базы? Она будет скрыта, но история не сломается."
    );

    if (!confirmed) {
      return;
    }

    const response = await fetch(`/api/tasks/${taskId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      alert("Не удалось удалить задачу");
      return;
    }

    router.push("/teacher/tasks");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
    >
      Удалить
    </button>
  );
}