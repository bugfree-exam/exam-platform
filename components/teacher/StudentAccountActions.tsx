"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type StudentAccountStatus = "ACTIVE" | "FROZEN" | "ARCHIVED";

type StudentAccountActionsProps = {
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentStatus: StudentAccountStatus;
  archivedAt: string | null;
};

type ActionResponse = {
  message?: string;
};

function formatArchivedAt(value: string | null) {
  if (!value) return null;

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function StudentAccountActions({
  studentId,
  studentName,
  studentEmail,
  studentStatus,
  archivedAt,
}: StudentAccountActionsProps) {
  const router = useRouter();

  const [activeDialog, setActiveDialog] = useState<
    "archive" | "restore" | "delete" | null
  >(null);
  const [confirmationEmail, setConfirmationEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const isArchived = studentStatus === "ARCHIVED";
  const formattedArchivedAt = formatArchivedAt(archivedAt);
  const isDeleteConfirmed =
    confirmationEmail.trim().toLowerCase() === studentEmail.toLowerCase();

  function closeDialog() {
    if (isSaving) return;

    setActiveDialog(null);
    setConfirmationEmail("");
    setMessage("");
  }

  async function updateStatus(status: "ACTIVE" | "ARCHIVED") {
    setIsSaving(true);
    setMessage("");

    try {
      const response = await fetch(`/api/teacher/students/${studentId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      const data = (await response.json().catch(() => ({}))) as ActionResponse;

      if (!response.ok) {
        setMessage(data.message || "Не удалось изменить статус ученика");
        return;
      }

      setActiveDialog(null);
      router.refresh();
    } catch {
      setMessage("Не удалось подключиться к серверу");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteStudent() {
    if (!isDeleteConfirmed) {
      setMessage("Введите логин ученика полностью");
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      const response = await fetch(`/api/teacher/students/${studentId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          confirmationEmail: confirmationEmail.trim(),
        }),
      });

      const data = (await response.json().catch(() => ({}))) as ActionResponse;

      if (!response.ok) {
        setMessage(data.message || "Не удалось удалить ученика");
        return;
      }

      router.replace("/teacher/students?status=archived");
      router.refresh();
    } catch {
      setMessage("Не удалось подключиться к серверу");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <h2 className="text-xl font-bold text-slate-950">
            Управление аккаунтом
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Архивирование скрывает ученика из рабочих списков и блокирует вход,
            но сохраняет домашние задания, результаты и историю решений.
          </p>

          {isArchived ? (
            <div className="mt-3 inline-flex rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {formattedArchivedAt
                ? `В архиве с ${formattedArchivedAt}`
                : "Аккаунт находится в архиве"}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row lg:shrink-0">
          {isArchived ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setMessage("");
                  setActiveDialog("restore");
                }}
                className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
              >
                Восстановить ученика
              </button>

              <button
                type="button"
                onClick={() => {
                  setMessage("");
                  setConfirmationEmail("");
                  setActiveDialog("delete");
                }}
                className="rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
              >
                Удалить навсегда
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                setMessage("");
                setActiveDialog("archive");
              }}
              className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Перенести в архив
            </button>
          )}
        </div>
      </div>

      {activeDialog === "archive" ? (
        <div className="mt-5 rounded-2xl border border-slate-300 bg-slate-50 p-4 sm:p-5">
          <h3 className="font-bold text-slate-900">
            Перенести {studentName} в архив?
          </h3>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Ученик больше не сможет войти в платформу и исчезнет из списка
            выдачи новых домашних заданий. Все назначения, попытки и результаты
            останутся сохранены.
          </p>

          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={closeDialog}
              disabled={isSaving}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
            >
              Отмена
            </button>

            <button
              type="button"
              onClick={() => updateStatus("ARCHIVED")}
              disabled={isSaving}
              className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50"
            >
              {isSaving ? "Архивируем..." : "Подтвердить архивацию"}
            </button>
          </div>
        </div>
      ) : null}

      {activeDialog === "restore" ? (
        <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:p-5">
          <h3 className="font-bold text-slate-900">
            Восстановить доступ ученика?
          </h3>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Аккаунт снова станет активным. Ученик сможет войти в платформу и
            снова появится в рабочих списках.
          </p>

          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={closeDialog}
              disabled={isSaving}
              className="rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-emerald-100 disabled:opacity-50"
            >
              Отмена
            </button>

            <button
              type="button"
              onClick={() => updateStatus("ACTIVE")}
              disabled={isSaving}
              className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-50"
            >
              {isSaving ? "Восстанавливаем..." : "Восстановить"}
            </button>
          </div>
        </div>
      ) : null}

      {activeDialog === "delete" ? (
        <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 sm:p-5">
          <h3 className="font-bold text-rose-900">
            Безвозвратно удалить ученика?
          </h3>

          <p className="mt-2 text-sm leading-6 text-rose-800/80">
            Будут удалены аккаунт, назначения домашних заданий, попытки и
            ответы. Отменить это действие после удаления нельзя.
          </p>

          <label className="mt-4 block">
            <span className="text-sm font-semibold text-slate-700">
              Для подтверждения введите логин:
            </span>

            <span className="mt-1 block font-mono text-xs text-slate-500">
              {studentEmail}
            </span>

            <input
              value={confirmationEmail}
              onChange={(event) => {
                setConfirmationEmail(event.target.value);
                if (message) setMessage("");
              }}
              type="email"
              autoComplete="off"
              className="mt-2 w-full rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
              placeholder="Введите логин ученика полностью"
            />
          </label>

          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={closeDialog}
              disabled={isSaving}
              className="rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-rose-100 disabled:opacity-50"
            >
              Отмена
            </button>

            <button
              type="button"
              onClick={deleteStudent}
              disabled={isSaving || !isDeleteConfirmed}
              className="rounded-xl bg-rose-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isSaving ? "Удаляем..." : "Удалить ученика навсегда"}
            </button>
          </div>
        </div>
      ) : null}

      {message ? (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
        >
          {message}
        </div>
      ) : null}
    </section>
  );
}
