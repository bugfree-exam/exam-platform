"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type StudentOption = {
  id: string;
  name: string;
  email: string;
};

type VariantAssignmentFormProps = {
  variantId: string;
  students: StudentOption[];
  assignedStudentIds: string[];
};

export function VariantAssignmentForm({
  variantId,
  students,
  assignedStudentIds,
}: VariantAssignmentFormProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deadline, setDeadline] = useState("");
  const [query, setQuery] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState("");

  const assigned = useMemo(() => new Set(assignedStudentIds), [assignedStudentIds]);
  const visibleStudents = students.filter((student) =>
    `${student.name} ${student.email}`.toLowerCase().includes(query.toLowerCase())
  );

  function toggleStudent(studentId: string) {
    setSelectedIds((current) =>
      current.includes(studentId)
        ? current.filter((id) => id !== studentId)
        : [...current, studentId]
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (selectedIds.length === 0) {
      setMessage("Выберите хотя бы одного ученика");
      return;
    }

    setIsPending(true);
    try {
      const response = await fetch(`/api/variants/${variantId}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentIds: selectedIds,
          deadline: deadline ? new Date(deadline).toISOString() : null,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Не удалось выдать вариант");
        return;
      }

      setMessage(`Вариант выдан ученикам: ${data.assignedCount}`);
      setSelectedIds([]);
      router.refresh();
    } catch {
      setMessage("Не удалось подключиться к серверу");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-700">
            homework.assign
          </div>
          <h2 className="mt-2 text-2xl font-black">Выдать вариант как ДЗ</h2>
          <p className="mt-2 text-sm text-slate-500">
            Ученик увидит работу в разделе домашних заданий.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setSelectedIds(visibleStudents.map((student) => student.id))}
          className="text-sm font-bold text-cyan-700"
        >
          Выбрать всех
        </button>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-[minmax(0,1fr)_240px]">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Поиск ученика"
          className="rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-cyan-500"
        />
        <label>
          <span className="mb-1 block text-xs font-bold text-slate-500">Срок выполнения</span>
          <input
            type="datetime-local"
            value={deadline}
            onChange={(event) => setDeadline(event.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-cyan-500"
          />
        </label>
      </div>

      <div className="mt-5 grid max-h-[420px] gap-2 overflow-y-auto sm:grid-cols-2">
        {visibleStudents.map((student) => (
          <label
            key={student.id}
            className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 p-4 hover:border-cyan-300"
          >
            <input
              type="checkbox"
              checked={selectedIds.includes(student.id)}
              onChange={() => toggleStudent(student.id)}
              className="h-4 w-4 accent-cyan-700"
            />
            <span className="min-w-0">
              <span className="block truncate font-bold text-slate-950">{student.name}</span>
              <span className="block truncate text-xs text-slate-500">{student.email}</span>
            </span>
            {assigned.has(student.id) ? (
              <span className="ml-auto rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
                Уже выдан
              </span>
            ) : null}
          </label>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm font-medium text-slate-600">
          Выбрано: {selectedIds.length}
          {message ? <span className="ml-3 text-cyan-700">{message}</span> : null}
        </div>
        <button
          type="submit"
          disabled={isPending || selectedIds.length === 0}
          className="rounded-xl bg-slate-950 px-6 py-3 text-sm font-black text-white hover:bg-cyan-700 disabled:opacity-50"
        >
          {isPending ? "Выдаю…" : "Выдать вариант"}
        </button>
      </div>
    </form>
  );
}
