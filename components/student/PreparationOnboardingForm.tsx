"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type PreparationLevel = "ZERO" | "BEGINNER" | "BASIC" | "CONFIDENT";

const weekDays = [
  { value: 1, label: "Пн" },
  { value: 2, label: "Вт" },
  { value: 3, label: "Ср" },
  { value: 4, label: "Чт" },
  { value: 5, label: "Пт" },
  { value: 6, label: "Сб" },
  { value: 0, label: "Вс" },
];

function getDefaultExamDate() {
  const now = new Date();
  const currentYearExam = new Date(now.getFullYear(), 5, 19);
  const year = now < currentYearExam ? now.getFullYear() : now.getFullYear() + 1;
  return `${year}-06-19`;
}

export function PreparationOnboardingForm({
  initial,
}: {
  initial?: {
    targetScore: number;
    examDate: string;
    weeklyMinutes: number;
    sessionMinutes: number;
    preferredDays: number[];
    currentLevel: PreparationLevel;
  };
}) {
  const router = useRouter();
  const [targetScore, setTargetScore] = useState(initial?.targetScore ?? 80);
  const [examDate, setExamDate] = useState(initial?.examDate ?? getDefaultExamDate());
  const [weeklyHours, setWeeklyHours] = useState(
    Math.max(1, Math.round((initial?.weeklyMinutes ?? 360) / 60)),
  );
  const [sessionMinutes, setSessionMinutes] = useState(initial?.sessionMinutes ?? 60);
  const [preferredDays, setPreferredDays] = useState(initial?.preferredDays ?? [1, 3, 5]);
  const [currentLevel, setCurrentLevel] = useState<PreparationLevel>(initial?.currentLevel ?? "ZERO");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  function toggleDay(day: number) {
    setPreferredDays((current) =>
      current.includes(day)
        ? current.filter((value) => value !== day)
        : [...current, day],
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/student/preparation-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetScore,
          examDate: new Date(`${examDate}T09:00:00.000Z`).toISOString(),
          weeklyMinutes: weeklyHours * 60,
          sessionMinutes,
          preferredDays,
          currentLevel,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) throw new Error(body.message ?? "Не удалось сохранить настройки");
      router.push("/student/diagnostic");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось сохранить настройки");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-6">
      <div className="grid gap-5 md:grid-cols-2">
        <label className="rounded-2xl border border-slate-200 bg-white p-5">
          <span className="text-sm font-black">Цель на экзамене</span>
          <span className="mt-1 block text-xs leading-5 text-slate-500">Поможет оценивать, успеваете ли вы к нужному результату по общему курсу.</span>
          <div className="mt-4 flex items-center gap-4">
            <input type="range" min="40" max="100" step="5" value={targetScore} onChange={(event) => setTargetScore(Number(event.target.value))} className="w-full accent-cyan-700" />
            <strong className="w-16 text-right text-2xl">{targetScore}+</strong>
          </div>
        </label>

        <label className="rounded-2xl border border-slate-200 bg-white p-5">
          <span className="text-sm font-black">Дата экзамена</span>
          <span className="mt-1 block text-xs leading-5 text-slate-500">Используется для аналитики готовности и рисков.</span>
          <input type="date" required value={examDate} onChange={(event) => setExamDate(event.target.value)} className="mt-4 w-full rounded-xl border border-slate-200 px-3 py-2.5" />
        </label>

        <label className="rounded-2xl border border-slate-200 bg-white p-5">
          <span className="text-sm font-black">Реальный ресурс в неделю</span>
          <span className="mt-1 block text-xs leading-5 text-slate-500">Считаем только время, которое получится соблюдать регулярно.</span>
          <select value={weeklyHours} onChange={(event) => setWeeklyHours(Number(event.target.value))} className="mt-4 w-full rounded-xl border border-slate-200 px-3 py-2.5">
            {[2, 3, 4, 5, 6, 8, 10, 12].map((hours) => <option key={hours} value={hours}>{hours} ч в неделю</option>)}
          </select>
        </label>

        <label className="rounded-2xl border border-slate-200 bg-white p-5">
          <span className="text-sm font-black">Удобная длина занятия</span>
          <span className="mt-1 block text-xs leading-5 text-slate-500">Поможет учителю подобрать восстановление, если нагрузка станет слишком большой.</span>
          <select value={sessionMinutes} onChange={(event) => setSessionMinutes(Number(event.target.value))} className="mt-4 w-full rounded-xl border border-slate-200 px-3 py-2.5">
            {[30, 45, 60, 90, 120].map((minutes) => <option key={minutes} value={minutes}>{minutes} минут</option>)}
          </select>
        </label>
      </div>

      <fieldset className="rounded-2xl border border-slate-200 bg-white p-5">
        <legend className="px-1 text-sm font-black">Когда удобно заниматься</legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {weekDays.map((day) => (
            <button key={day.value} type="button" onClick={() => toggleDay(day.value)} className={`h-11 min-w-12 rounded-xl px-3 text-sm font-black ${preferredDays.includes(day.value) ? "bg-cyan-700 text-white" : "bg-slate-100 text-slate-600"}`}>{day.label}</button>
          ))}
        </div>
      </fieldset>

      <label className="block rounded-2xl border border-slate-200 bg-white p-5">
        <span className="text-sm font-black">Как вы оцениваете старт сейчас?</span>
        <select value={currentLevel} onChange={(event) => setCurrentLevel(event.target.value as PreparationLevel)} className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2.5">
          <option value="ZERO">Начинаю практически с нуля</option>
          <option value="BEGINNER">Знаю основы, но задачи решаю неуверенно</option>
          <option value="BASIC">Решаю часть первой части</option>
          <option value="CONFIDENT">Есть база, хочу системно выйти на высокий балл</option>
        </select>
      </label>

      {message ? <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{message}</p> : null}
      <button disabled={pending || preferredDays.length === 0} className="w-full rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white disabled:opacity-50">
        {pending ? "Сохраняем…" : "Сохранить и перейти к диагностике →"}
      </button>
    </form>
  );
}
