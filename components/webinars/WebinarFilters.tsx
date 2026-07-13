"use client";

import { FormEvent, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type WebinarFiltersProps = {
  selectedQuery: string;
  selectedStatus: string;
  selectedProvider: string;
  selectedEgeNumber: string;
  selectedPeriod: string;
  showStatusFilter: boolean;
};

const STATUS_OPTIONS = [
  { value: "all", label: "Все статусы" },
  { value: "PUBLISHED", label: "Опубликовано" },
  { value: "DRAFT", label: "Черновики" },
  { value: "ARCHIVED", label: "Архив" },
];

const PROVIDER_OPTIONS = [
  { value: "all", label: "Все источники" },
  { value: "RUTUBE", label: "RuTube" },
  { value: "YANDEX_DISK", label: "Яндекс.Диск" },
  { value: "EXTERNAL", label: "Другие" },
];

const PERIOD_OPTIONS = [
  { value: "all", label: "За всё время" },
  { value: "7d", label: "Последние 7 дней" },
  { value: "30d", label: "Последние 30 дней" },
  { value: "month", label: "Текущий месяц" },
];

export function WebinarFilters({
  selectedQuery,
  selectedStatus,
  selectedProvider,
  selectedEgeNumber,
  selectedPeriod,
  showStatusFilter,
}: WebinarFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(selectedQuery);

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (!value.trim() || value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }

    const nextQuery = params.toString();
    router.push(nextQuery ? `${pathname}?${nextQuery}` : pathname);
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateFilter("q", query.trim());
  }

  function resetFilters() {
    router.push(pathname);
  }

  const hasActiveFilters =
    selectedQuery ||
    selectedStatus !== "all" ||
    selectedProvider !== "all" ||
    selectedEgeNumber !== "all" ||
    selectedPeriod !== "all";

  return (
    <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-950">Фильтры</h2>
          <p className="mt-1 text-sm text-slate-500">
            Быстрый поиск по теме, номеру ЕГЭ, источнику видео и периоду.
          </p>
        </div>

        {hasActiveFilters ? (
          <button
            type="button"
            onClick={resetFilters}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Сбросить
          </button>
        ) : null}
      </div>

      <form onSubmit={handleSearch} className="mb-3 flex gap-2">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
          placeholder="Поиск по названию, описанию или теме"
        />

        <button
          type="submit"
          className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Найти
        </button>
      </form>

      <div
        className={
          showStatusFilter
            ? "grid gap-3 md:grid-cols-4"
            : "grid gap-3 md:grid-cols-3"
        }
      >
        {showStatusFilter ? (
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
        ) : null}

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Источник
          </label>
          <select
            value={selectedProvider}
            onChange={(event) => updateFilter("provider", event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
          >
            {PROVIDER_OPTIONS.map((provider) => (
              <option key={provider.value} value={provider.value}>
                {provider.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Номер ЕГЭ
          </label>
          <select
            value={selectedEgeNumber}
            onChange={(event) => updateFilter("egeNumber", event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
          >
            <option value="all">Все номера</option>
            {Array.from({ length: 27 }, (_, index) => index + 1).map(
              (number) => (
                <option key={number} value={number}>
                  №{number}
                </option>
              )
            )}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Период
          </label>
          <select
            value={selectedPeriod}
            onChange={(event) => updateFilter("period", event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
          >
            {PERIOD_OPTIONS.map((period) => (
              <option key={period.value} value={period.value}>
                {period.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </section>
  );
}