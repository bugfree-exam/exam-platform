"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

type StudentOption = {
  id: string;
  name: string;
  email: string;
};

type HomeworkOption = {
  id: string;
  title: string;
};

type HomeworksReviewFiltersProps = {
  students: StudentOption[];
  homeworks: HomeworkOption[];
  selectedStudentId: string;
  selectedHomeworkId: string;
  selectedStatus: string;
};

const STATUS_OPTIONS = [
  {
    value: "all",
    label: "Все статусы",
  },
  {
    value: "not_submitted",
    label: "Не сдал",
  },
  {
    value: "submitted",
    label: "Сдал",
  },
  {
    value: "errors",
    label: "Есть ошибки",
  },
  {
    value: "low",
    label: "Ниже 70%",
  },
  {
    value: "perfect",
    label: "100%",
  },
];

export function HomeworksReviewFilters({
  students,
  homeworks,
  selectedStudentId,
  selectedHomeworkId,
  selectedStatus,
}: HomeworksReviewFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function resetFilters() {
    router.push(pathname);
  }

  const hasActiveFilters =
    selectedStudentId !== "all" ||
    selectedHomeworkId !== "all" ||
    selectedStatus !== "all";

  return (
    <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-950">Фильтры просмотра</h2>
          <p className="mt-1 text-sm text-slate-500">
            Можно быстро отобрать результаты по ученику, ДЗ или статусу сдачи.
          </p>
        </div>

        {hasActiveFilters ? (
          <button
            type="button"
            onClick={resetFilters}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Сбросить фильтры
          </button>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Ученик
          </label>
          <select
            value={selectedStudentId}
            onChange={(event) => updateFilter("studentId", event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
          >
            <option value="all">Все ученики</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.name} · {student.email}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Домашнее задание
          </label>
          <select
            value={selectedHomeworkId}
            onChange={(event) => updateFilter("homeworkId", event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
          >
            <option value="all">Все ДЗ</option>
            {homeworks.map((homework) => (
              <option key={homework.id} value={homework.id}>
                {homework.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Статус
          </label>
          <select
            value={selectedStatus}
            onChange={(event) => updateFilter("status", event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
          >
            {STATUS_OPTIONS.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </section>
  );
}