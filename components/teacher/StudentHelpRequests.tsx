"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function StudentHelpRequests({
  studentId,
  requests,
}: {
  studentId: string;
  requests: Array<{ id: string; note: string | null }>;
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function resolve(decisionId: string) {
    setPendingId(decisionId);
    setMessage("");
    try {
      const response = await fetch(
        `/api/teacher/students/${studentId}/queue-decisions/${decisionId}`,
        { method: "PATCH" },
      );
      if (!response.ok) throw new Error("Не удалось закрыть запрос");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось закрыть запрос");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className={`rounded-2xl p-4 ${requests.length ? "bg-rose-50" : "bg-emerald-50"}`}>
      <div className="text-xs font-semibold text-slate-500">Запросы помощи</div>
      <div className={`mt-2 text-xl font-bold ${requests.length ? "text-rose-800" : "text-emerald-800"}`}>{requests.length}</div>
      <div className="mt-1 text-xs text-slate-500">{requests[0]?.note ?? "Активных сигналов нет"}</div>
      {requests[0] ? <button type="button" onClick={() => resolve(requests[0].id)} disabled={pendingId === requests[0].id} className="mt-3 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-bold text-rose-800 disabled:opacity-50">{pendingId === requests[0].id ? "Закрываем…" : "Помощь оказана"}</button> : null}
      {message ? <p className="mt-2 text-xs text-rose-700">{message}</p> : null}
    </div>
  );
}
