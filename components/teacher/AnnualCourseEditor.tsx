"use client";

import type { CourseItemType, DiagnosticTaskLevel } from "@prisma/client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type ModuleView = {
  id: string;
  order: number;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  egeNumbers: number[];
};

type ScheduleView = {
  id: string;
  moduleId: string | null;
  order: number;
  type: CourseItemType;
  title: string;
  description: string | null;
  scheduledFor: string;
  estimatedMinutes: number;
  href: string | null;
  egeNumbers: number[];
};

type DiagnosticItemView = {
  id: string;
  taskId: string;
  order: number;
  level: DiagnosticTaskLevel;
  points: number;
  taskRevision: { egeNumber: number; title: string; version: number };
};

type DiagnosticView = {
  id: string;
  title: string;
  description: string | null;
  durationMinutes: number;
  version: number;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  items: DiagnosticItemView[];
};

type CourseView = {
  id: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  enrolledStudents: number;
  modules: ModuleView[];
  scheduleItems: ScheduleView[];
  diagnostics: DiagnosticView[];
};

type TaskOption = {
  id: string;
  egeNumber: number;
  title: string;
  difficulty: number | null;
  revisionVersion: number;
};

const itemLabels: Record<CourseItemType, string> = {
  THEORY: "Теория",
  PRACTICE: "Практика",
  HOMEWORK: "Домашняя работа",
  WEBINAR: "Вебинар",
  VARIANT: "Вариант",
  CONTROL: "Контроль",
  ERROR_REVIEW: "Исправление ошибок",
  OTHER: "Другое",
};

const levelLabels: Record<DiagnosticTaskLevel, string> = {
  FOUNDATION: "Совсем простое",
  BASIC: "Базовое",
  ADVANCED: "Повышенное",
  EXAM: "Сложное / экзаменационное",
};

function dateInput(value: string) {
  return value.slice(0, 10);
}

function moscowDate(value: string) {
  return new Date(`${value}T00:00:00+03:00`).toISOString();
}

function moscowEndDate(value: string) {
  return new Date(`${value}T23:59:59+03:00`).toISOString();
}

function moscowDateTime(value: string) {
  return new Date(`${value}:00+03:00`).toISOString();
}

function dateTimeInput(value: string) {
  const date = new Date(value);
  const moscow = new Date(date.getTime() + 3 * 60 * 60 * 1000);
  return moscow.toISOString().slice(0, 16);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function AnnualCourseEditor({
  course,
  tasks,
}: {
  course: CourseView | null;
  tasks: TaskOption[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [courseSettingsEditing, setCourseSettingsEditing] = useState(course === null);
  const [editingModule, setEditingModule] = useState<ModuleView | null>(null);
  const [editingItem, setEditingItem] = useState<ScheduleView | null>(null);
  const activeDiagnostic = course?.diagnostics.find((item) => item.status === "DRAFT") ?? course?.diagnostics[0] ?? null;

  async function send(payload: Record<string, unknown>) {
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/teacher/course", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) throw new Error(body.message ?? "Не удалось сохранить изменения");
      router.refresh();
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось сохранить изменения");
      return false;
    } finally {
      setPending(false);
    }
  }

  async function saveCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const saved = await send({
      action: "save-course",
      courseId: course?.id,
      title: form.get("title"),
      description: form.get("description"),
      startDate: moscowDate(String(form.get("startDate"))),
      endDate: moscowEndDate(String(form.get("endDate"))),
    });
    if (saved) setCourseSettingsEditing(false);
  }

  async function saveModule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!course) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const saved = await send({
      action: "save-module",
      courseId: course.id,
      moduleId: editingModule?.id,
      title: form.get("title"),
      description: form.get("description"),
      startDate: moscowDate(String(form.get("startDate"))),
      endDate: moscowEndDate(String(form.get("endDate"))),
      egeNumbers: form.get("egeNumbers"),
    });
    if (saved) {
      setEditingModule(null);
      formElement.reset();
    }
  }

  async function saveScheduleItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!course) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const saved = await send({
      action: "save-schedule-item",
      courseId: course.id,
      itemId: editingItem?.id,
      moduleId: form.get("moduleId") || null,
      type: form.get("type"),
      title: form.get("title"),
      description: form.get("description"),
      scheduledFor: moscowDateTime(String(form.get("scheduledFor"))),
      estimatedMinutes: Number(form.get("estimatedMinutes")),
      href: form.get("href"),
      egeNumbers: form.get("egeNumbers"),
    });
    if (saved) {
      setEditingItem(null);
      formElement.reset();
    }
  }

  async function saveDiagnostic(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!course) return;
    const form = new FormData(event.currentTarget);
    await send({
      action: "save-diagnostic",
      courseId: course.id,
      templateId: activeDiagnostic?.status === "DRAFT" ? activeDiagnostic.id : undefined,
      title: form.get("title"),
      description: form.get("description"),
      durationMinutes: Number(form.get("durationMinutes")),
    });
  }

  async function addDiagnosticItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!course || !activeDiagnostic || activeDiagnostic.status !== "DRAFT") return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const saved = await send({
      action: "add-diagnostic-item",
      courseId: course.id,
      templateId: activeDiagnostic.id,
      taskId: form.get("taskId"),
      level: form.get("level"),
      points: Number(form.get("points")),
    });
    if (saved) formElement.reset();
  }

  return (
    <div className="space-y-6">
      {message ? <div className="sticky top-3 z-20 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-bold text-rose-800 shadow-lg">{message}</div> : null}

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><div className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-700">course.settings</div><h2 className="mt-2 text-2xl font-black">Годовой курс</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Эта программа едина для всех учеников. Цель и диагностика помогают анализировать прогресс, но не меняют заданную вами последовательность.</p></div>
          {course ? <div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-3 py-1.5 text-xs font-black ${course.status === "PUBLISHED" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{course.status === "PUBLISHED" ? `Опубликован · ${course.enrolledStudents} учеников` : "Черновик"}</span>{!courseSettingsEditing ? <button type="button" onClick={() => setCourseSettingsEditing(true)} className="rounded-xl bg-cyan-50 px-4 py-2 text-xs font-black text-cyan-800">Редактировать годовой курс</button> : null}</div> : null}
        </div>
        {course && !courseSettingsEditing ? <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5"><h3 className="text-lg font-black text-slate-950">{course.title}</h3>{course.description ? <p className="mt-2 text-sm leading-6 text-slate-600">{course.description}</p> : null}<p className="mt-3 text-xs font-bold text-slate-500">Период: {dateInput(course.startDate)} — {dateInput(course.endDate)}</p>{course.status === "PUBLISHED" ? <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold leading-6 text-emerald-900">Курс можно корректировать без повторной публикации: параметры, порядок модулей и будущие пункты расписания применятся для учеников сразу. Уже прошедшие пункты сохраняются в истории.</p> : null}</div> : <form onSubmit={saveCourse} className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="md:col-span-2"><span className="text-xs font-black text-slate-600">Название</span><input name="title" required minLength={3} defaultValue={course?.title ?? "Годовой курс ЕГЭ по информатике"} className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-3" /></label>
          <label className="md:col-span-2"><span className="text-xs font-black text-slate-600">Описание</span><textarea name="description" defaultValue={course?.description ?? ""} rows={2} className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-3" /></label>
          <label><span className="text-xs font-black text-slate-600">Начало курса</span><input name="startDate" type="date" required defaultValue={course ? dateInput(course.startDate) : "2026-09-01"} className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-3" /></label>
          <label><span className="text-xs font-black text-slate-600">Окончание курса</span><input name="endDate" type="date" required defaultValue={course ? dateInput(course.endDate) : "2027-06-19"} className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-3" /></label>
          <div className="flex gap-2 md:col-span-2"><button disabled={pending} className="flex-1 rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:opacity-50">{course ? "Сохранить изменения курса" : "Создать курс"}</button>{course ? <button type="button" onClick={() => setCourseSettingsEditing(false)} className="rounded-xl bg-slate-100 px-5 py-3 text-sm font-black text-slate-700">Отмена</button> : null}</div>
        </form>}
      </section>

      {course ? <>
        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-violet-700">course.sequence</div><h2 className="mt-2 text-2xl font-black">Последовательность модулей</h2><p className="mt-2 text-sm leading-6 text-slate-500">Стрелками задаётся ваш методический порядок. Карта зависимостей остаётся подсказкой и не переставляет темы автоматически.</p>
          <div className="mt-5 space-y-3">{course.modules.map((module) => <div key={module.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white font-black shadow-sm">{module.order}</div><div className="min-w-0 flex-1"><h3 className="font-black">{module.title}</h3><p className="mt-1 text-xs text-slate-500">№ {module.egeNumbers.join(", ")} · {dateInput(module.startDate)} — {dateInput(module.endDate)}</p></div><div className="flex gap-2"><button type="button" disabled={pending || module.order === 1} onClick={() => send({ action: "move-module", courseId: course.id, moduleId: module.id, direction: "up" })} className="rounded-lg bg-white px-3 py-2 text-xs font-black disabled:opacity-30">↑</button><button type="button" disabled={pending || module.order === course.modules.length} onClick={() => send({ action: "move-module", courseId: course.id, moduleId: module.id, direction: "down" })} className="rounded-lg bg-white px-3 py-2 text-xs font-black disabled:opacity-30">↓</button><button type="button" onClick={() => setEditingModule(module)} className="rounded-lg bg-cyan-50 px-3 py-2 text-xs font-black text-cyan-800">Изменить</button><button type="button" onClick={() => window.confirm("Удалить будущий модуль?") && send({ action: "delete-module", courseId: course.id, moduleId: module.id })} className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-black text-rose-700">Удалить</button></div></div>)}</div>
          <form key={editingModule?.id ?? "new-module"} onSubmit={saveModule} className="mt-6 grid gap-3 rounded-2xl border border-dashed border-violet-200 bg-violet-50/40 p-4 md:grid-cols-2">
            <h3 className="font-black md:col-span-2">{editingModule ? `Редактировать модуль №${editingModule.order}` : "Добавить модуль"}</h3>
            <input name="title" required placeholder="Например: Основы Python" defaultValue={editingModule?.title ?? ""} className="rounded-xl border border-slate-200 px-3 py-2.5 md:col-span-2" />
            <textarea name="description" placeholder="Что изучаем и какой результат ожидаем" defaultValue={editingModule?.description ?? ""} className="rounded-xl border border-slate-200 px-3 py-2.5 md:col-span-2" />
            <input name="startDate" type="date" required defaultValue={editingModule ? dateInput(editingModule.startDate) : dateInput(course.startDate)} className="rounded-xl border border-slate-200 px-3 py-2.5" />
            <input name="endDate" type="date" required defaultValue={editingModule ? dateInput(editingModule.endDate) : dateInput(course.endDate)} className="rounded-xl border border-slate-200 px-3 py-2.5" />
            <input name="egeNumbers" required placeholder="Номера ЕГЭ: 1, 2, 5" defaultValue={editingModule?.egeNumbers.join(", ") ?? ""} className="rounded-xl border border-slate-200 px-3 py-2.5 md:col-span-2" />
            <div className="flex gap-2 md:col-span-2"><button disabled={pending} className="flex-1 rounded-xl bg-violet-700 px-4 py-3 text-sm font-black text-white">{editingModule ? "Сохранить модуль" : "Добавить в конец"}</button>{editingModule ? <button type="button" onClick={() => setEditingModule(null)} className="rounded-xl bg-white px-4 py-3 text-sm font-black">Отмена</button> : null}</div>
          </form>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-700">course.calendar</div><h2 className="mt-2 text-2xl font-black">Что появится в «Сегодня»</h2><p className="mt-2 text-sm leading-6 text-slate-500">Только пункты, добавленные сюда на конкретную дату. Долги, AI и слабые навыки не попадут в основную очередь самовольно.</p>
          <div className="mt-5 space-y-3">{course.scheduleItems.map((item) => <div key={item.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center"><div className="w-28 shrink-0 text-xs font-black text-cyan-700">{formatDateTime(item.scheduledFor)} МСК</div><div className="min-w-0 flex-1"><div className="text-[10px] font-black uppercase tracking-wide text-slate-400">{itemLabels[item.type]} · ~{item.estimatedMinutes} мин.</div><h3 className="mt-1 font-black">{item.title}</h3></div><div className="flex gap-2"><button type="button" onClick={() => setEditingItem(item)} className="rounded-lg bg-cyan-50 px-3 py-2 text-xs font-black text-cyan-800">Изменить</button><button type="button" onClick={() => window.confirm("Удалить будущий пункт расписания?") && send({ action: "delete-schedule-item", courseId: course.id, itemId: item.id })} className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-black text-rose-700">Удалить</button></div></div>)}</div>
          <form key={editingItem?.id ?? "new-item"} onSubmit={saveScheduleItem} className="mt-6 grid gap-3 rounded-2xl border border-dashed border-cyan-200 bg-cyan-50/40 p-4 md:grid-cols-2">
            <h3 className="font-black md:col-span-2">{editingItem ? "Изменить пункт расписания" : "Добавить пункт расписания"}</h3>
            <select name="moduleId" defaultValue={editingItem?.moduleId ?? ""} className="rounded-xl border border-slate-200 px-3 py-2.5"><option value="">Без привязки к модулю</option>{course.modules.map((module) => <option key={module.id} value={module.id}>{module.order}. {module.title}</option>)}</select>
            <select name="type" defaultValue={editingItem?.type ?? "PRACTICE"} className="rounded-xl border border-slate-200 px-3 py-2.5">{Object.entries(itemLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
            <input name="title" required placeholder="Название действия для ученика" defaultValue={editingItem?.title ?? ""} className="rounded-xl border border-slate-200 px-3 py-2.5 md:col-span-2" />
            <textarea name="description" placeholder="Короткое пояснение" defaultValue={editingItem?.description ?? ""} className="rounded-xl border border-slate-200 px-3 py-2.5 md:col-span-2" />
            <input name="scheduledFor" type="datetime-local" required defaultValue={editingItem ? dateTimeInput(editingItem.scheduledFor) : `${dateInput(course.startDate)}T18:00`} className="rounded-xl border border-slate-200 px-3 py-2.5" />
            <input name="estimatedMinutes" type="number" min={5} max={480} required defaultValue={editingItem?.estimatedMinutes ?? 60} className="rounded-xl border border-slate-200 px-3 py-2.5" />
            <input name="href" placeholder="Ссылка: /student/homeworks/..." defaultValue={editingItem?.href ?? ""} className="rounded-xl border border-slate-200 px-3 py-2.5" />
            <input name="egeNumbers" placeholder="Номера: 2, 5, 8" defaultValue={editingItem?.egeNumbers.join(", ") ?? ""} className="rounded-xl border border-slate-200 px-3 py-2.5" />
            <div className="flex gap-2 md:col-span-2"><button disabled={pending} className="flex-1 rounded-xl bg-cyan-700 px-4 py-3 text-sm font-black text-white">{editingItem ? "Сохранить пункт" : "Добавить в расписание"}</button>{editingItem ? <button type="button" onClick={() => setEditingItem(null)} className="rounded-xl bg-white px-4 py-3 text-sm font-black">Отмена</button> : null}</div>
          </form>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="font-mono text-[10px] uppercase tracking-[0.18em] text-amber-700">entry.control</div><h2 className="mt-2 text-2xl font-black">Единый входной контроль</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Все ученики получат один порядок и одни ревизии заданий: от совсем простых до сложных. После публикации набор не меняется.</p></div>{activeDiagnostic ? <span className={`rounded-full px-3 py-1.5 text-xs font-black ${activeDiagnostic.status === "PUBLISHED" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>Версия {activeDiagnostic.version} · {activeDiagnostic.status === "PUBLISHED" ? "опубликована" : "черновик"}</span> : null}</div>
          <form onSubmit={saveDiagnostic} className="mt-5 grid gap-3 md:grid-cols-[1fr_160px]">
            <input name="title" required defaultValue={activeDiagnostic?.title ?? "Входная диагностика курса"} className="rounded-xl border border-slate-200 px-3 py-2.5" />
            <input name="durationMinutes" type="number" min={10} max={240} required defaultValue={activeDiagnostic?.durationMinutes ?? 45} className="rounded-xl border border-slate-200 px-3 py-2.5" />
            <textarea name="description" defaultValue={activeDiagnostic?.description ?? ""} placeholder="Инструкция ученику" className="rounded-xl border border-slate-200 px-3 py-2.5 md:col-span-2" />
            {activeDiagnostic?.status === "PUBLISHED" ? <button type="button" disabled={pending} onClick={() => send({ action: "clone-diagnostic", courseId: course.id, templateId: activeDiagnostic.id })} className="rounded-xl bg-amber-100 px-4 py-3 text-sm font-black text-amber-900 md:col-span-2">Создать редактируемую версию на основе этой</button> : <button disabled={pending} className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white md:col-span-2">{activeDiagnostic ? "Сохранить параметры" : "Создать диагностику"}</button>}
          </form>

          {activeDiagnostic ? <div className="mt-6 space-y-2">{activeDiagnostic.items.map((item) => <div key={item.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-sm font-black">{item.order}</div><div className="min-w-0 flex-1"><div className="text-[10px] font-black uppercase tracking-wide text-amber-700">{levelLabels[item.level]} · {item.points} б.</div><h3 className="mt-1 font-black">№{item.taskRevision.egeNumber} · {item.taskRevision.title}</h3><p className="mt-1 text-xs text-slate-400">Зафиксирована ревизия v{item.taskRevision.version}</p></div>{activeDiagnostic.status === "DRAFT" ? <div className="flex gap-2"><button type="button" disabled={item.order === 1 || pending} onClick={() => send({ action: "move-diagnostic-item", courseId: course.id, templateId: activeDiagnostic.id, itemId: item.id, direction: "up" })} className="rounded-lg bg-white px-3 py-2 text-xs font-black disabled:opacity-30">↑</button><button type="button" disabled={item.order === activeDiagnostic.items.length || pending} onClick={() => send({ action: "move-diagnostic-item", courseId: course.id, templateId: activeDiagnostic.id, itemId: item.id, direction: "down" })} className="rounded-lg bg-white px-3 py-2 text-xs font-black disabled:opacity-30">↓</button><button type="button" onClick={() => send({ action: "remove-diagnostic-item", courseId: course.id, templateId: activeDiagnostic.id, itemId: item.id })} className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-black text-rose-700">Убрать</button></div> : null}</div>)}</div> : null}

          {activeDiagnostic?.status === "DRAFT" ? <form onSubmit={addDiagnosticItem} className="mt-5 grid gap-3 rounded-2xl border border-dashed border-amber-200 bg-amber-50/40 p-4 md:grid-cols-[1fr_190px_100px]">
            <select name="taskId" required className="rounded-xl border border-slate-200 px-3 py-2.5"><option value="">Выберите конкретное задание</option>{tasks.filter((task) => !activeDiagnostic.items.some((item) => item.taskId === task.id)).map((task) => <option key={task.id} value={task.id}>№{task.egeNumber} · {task.title} · v{task.revisionVersion}</option>)}</select>
            <select name="level" defaultValue="BASIC" className="rounded-xl border border-slate-200 px-3 py-2.5">{Object.entries(levelLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
            <input name="points" type="number" min={1} max={10} defaultValue={1} className="rounded-xl border border-slate-200 px-3 py-2.5" />
            <button disabled={pending} className="rounded-xl bg-amber-600 px-4 py-3 text-sm font-black text-white md:col-span-3">Добавить задание</button>
          </form> : null}

          {activeDiagnostic?.status === "DRAFT" && activeDiagnostic.items.length >= 3 ? <button type="button" disabled={pending} onClick={() => send({ action: "publish-diagnostic", courseId: course.id, templateId: activeDiagnostic.id })} className="mt-5 w-full rounded-xl bg-emerald-700 px-5 py-3.5 text-sm font-black text-white">Опубликовать неизменяемый входной контроль</button> : null}
        </section>

        <section className="rounded-[28px] border border-cyan-200 bg-[#092535] p-6 text-white shadow-lg sm:p-8"><h2 className="text-2xl font-black">Публикация для учеников</h2><p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">После публикации этот курс станет единым маршрутом и будет назначен всем активным ученикам. Будущие пункты можно корректировать; прошедшие сохраняются в истории.</p>{course.status === "PUBLISHED" ? <div className="mt-5 rounded-2xl border border-emerald-300/30 bg-emerald-300/10 px-5 py-4 text-sm font-bold leading-6 text-emerald-100">Курс опубликован и остаётся редактируемым. Сохраняйте небольшие правки в параметрах, модулях и будущем расписании — повторно публиковать курс не нужно.</div> : <button type="button" disabled={pending} onClick={() => send({ action: "publish-course", courseId: course.id })} className="mt-5 rounded-xl bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950 disabled:opacity-50">Опубликовать курс и назначить всем</button>}</section>
      </> : null}
    </div>
  );
}
