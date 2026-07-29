"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type TaskOption = {
  id: string;
  egeNumber: number;
  title: string;
  difficulty: number | null;
};

type VariantFormProps = {
  tasks: TaskOption[];
};

const EGE_NUMBERS = Array.from({ length: 27 }, (_, index) => index + 1);

export function VariantForm({ tasks }: VariantFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(235);
  const [selectedByNumber, setSelectedByNumber] = useState<
    Record<number, string>
  >({});
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const tasksByNumber = useMemo(() => {
    const grouped = new Map<number, TaskOption[]>();

    for (const number of EGE_NUMBERS) {
      grouped.set(number, []);
    }

    for (const task of tasks) {
      grouped.get(task.egeNumber)?.push(task);
    }

    return grouped;
  }, [tasks]);

  const selectedCount = EGE_NUMBERS.filter(
    (number) => selectedByNumber[number]
  ).length;
  const missingBankNumbers = EGE_NUMBERS.filter(
    (number) => (tasksByNumber.get(number)?.length ?? 0) === 0
  );

  function fillRandomly() {
    const next: Record<number, string> = {};

    for (const number of EGE_NUMBERS) {
      const options = tasksByNumber.get(number) ?? [];

      if (options.length > 0) {
        next[number] =
          options[Math.floor(Math.random() * options.length)].id;
      }
    }

    setSelectedByNumber(next);
    setError(
      missingBankNumbers.length > 0
        ? `Не удалось заполнить номера: ${missingBankNumbers.join(", ")}. В базе пока нет подходящих заданий.`
        : ""
    );
  }

  async function save(status: "DRAFT" | "PUBLISHED") {
    setError("");

    if (!title.trim()) {
      setError("Введите название варианта");
      return;
    }

    if (selectedCount !== 27) {
      setError(
        `Выбрано ${selectedCount} из 27 заданий. Заполните каждый номер ЕГЭ.`
      );
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/variants", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description,
          durationMinutes,
          status,
          taskIds: EGE_NUMBERS.map((number) => selectedByNumber[number]),
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Не удалось сохранить вариант");
        return;
      }

      router.push(`/teacher/variants/${data.variant.id}`);
      router.refresh();
    } catch {
      setError("Не удалось подключиться к серверу");
    } finally {
      setIsSaving(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void save("PUBLISHED");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </div>
      ) : null}

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-700">
              variant.settings
            </div>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
              Основные настройки
            </h2>
          </div>

          <div className="rounded-2xl bg-slate-950 px-5 py-3 text-white">
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-400">
              Состав
            </div>
            <div className="mt-1 text-2xl font-black">
              {selectedCount}
              <span className="text-base text-cyan-300">/27</span>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-slate-700">
              Название варианта
            </span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
              placeholder="Например: Пробный вариант №1"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-bold text-slate-700">
              Время, минут
            </span>
            <input
              type="number"
              min={60}
              max={360}
              value={durationMinutes}
              onChange={(event) =>
                setDurationMinutes(Number(event.target.value))
              }
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
            />
          </label>
        </div>

        <label className="mt-4 block">
          <span className="mb-2 block text-sm font-bold text-slate-700">
            Описание для ученика
          </span>
          <textarea
            rows={3}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
            placeholder="Необязательное пояснение перед началом работы"
          />
        </label>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-700">
              variant.tasks
            </div>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
              Задания №1–27
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Выберите по одному заданию каждого номера или заполните весь
              вариант случайно.
            </p>
          </div>

          <button
            type="button"
            onClick={fillRandomly}
            className="rounded-xl bg-cyan-600 px-5 py-3 text-sm font-black text-white transition hover:bg-cyan-700"
          >
            ↻ Сформировать случайно
          </button>
        </div>

        <div className="mt-6 grid gap-3 xl:grid-cols-2">
          {EGE_NUMBERS.map((number) => {
            const options = tasksByNumber.get(number) ?? [];

            return (
              <label
                key={number}
                className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:grid-cols-[64px_minmax(0,1fr)] sm:items-center"
              >
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-slate-950 font-mono text-sm font-black text-cyan-300">
                  {number}
                </span>
                <span className="min-w-0">
                  <span className="mb-1.5 flex items-center justify-between gap-3 text-xs font-bold text-slate-500">
                    <span>Задание №{number}</span>
                    <span>{options.length} в базе</span>
                  </span>
                  <select
                    value={selectedByNumber[number] ?? ""}
                    onChange={(event) =>
                      setSelectedByNumber((current) => ({
                        ...current,
                        [number]: event.target.value,
                      }))
                    }
                    disabled={options.length === 0}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-cyan-500 disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    <option value="">
                      {options.length === 0
                        ? "В базе нет заданий"
                        : "Выберите задание"}
                    </option>
                    {options.map((task) => (
                      <option key={task.id} value={task.id}>
                        {task.title}
                        {task.difficulty
                          ? ` · сложность ${task.difficulty}/5`
                          : ""}
                      </option>
                    ))}
                  </select>
                </span>
              </label>
            );
          })}
        </div>
      </section>

      <div className="sticky bottom-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur sm:flex-row sm:justify-end">
        <button
          type="button"
          disabled={isSaving}
          onClick={() => void save("DRAFT")}
          className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
        >
          Сохранить черновик
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="rounded-xl bg-slate-950 px-6 py-3 text-sm font-black text-white transition hover:bg-cyan-700 disabled:opacity-60"
        >
          {isSaving ? "Сохраняю…" : "Создать и опубликовать"}
        </button>
      </div>
    </form>
  );
}
