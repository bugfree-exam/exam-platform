"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type TaskItem = {
  id: string;
  egeNumber: number;
  title: string;
  difficulty: number | null;
};

type StudentItem = {
  id: string;
  name: string;
  email: string;
};

type HomeworkFormInitialData = {
  id: string;
  title: string;
  description: string;
  deadline: string;
  taskIds: string[];
  studentIds: string[];
  attemptsCount: number;
};

type HomeworkFormProps = {
  mode?: "create" | "edit";
  tasks: TaskItem[];
  students: StudentItem[];
  initialData?: HomeworkFormInitialData;
};

export function HomeworkForm({
  mode = "create",
  tasks,
  students,
  initialData,
}: HomeworkFormProps) {
  const router = useRouter();

  const [title, setTitle] = useState(initialData?.title ?? "");
  const [description, setDescription] = useState(
    initialData?.description ?? ""
  );
  const [deadline, setDeadline] = useState(initialData?.deadline ?? "");
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>(
    initialData?.taskIds ?? []
  );
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>(
    initialData?.studentIds ?? []
  );

  const [taskSearch, setTaskSearch] = useState("");
  const [egeNumberFilter, setEgeNumberFilter] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const taskById = useMemo(() => {
    return new Map(tasks.map((task) => [task.id, task]));
  }, [tasks]);

  const selectedTasks = useMemo(() => {
    return selectedTaskIds
      .map((taskId) => taskById.get(taskId))
      .filter((task): task is TaskItem => Boolean(task));
  }, [selectedTaskIds, taskById]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch =
        !taskSearch.trim() ||
        task.title.toLowerCase().includes(taskSearch.trim().toLowerCase());

      const matchesEgeNumber =
        !egeNumberFilter || task.egeNumber === Number(egeNumberFilter);

      return matchesSearch && matchesEgeNumber;
    });
  }, [tasks, taskSearch, egeNumberFilter]);

  function toggleTask(taskId: string) {
    setSelectedTaskIds((current) =>
      current.includes(taskId)
        ? current.filter((id) => id !== taskId)
        : [...current, taskId]
    );
  }

  function removeTask(taskId: string) {
    setSelectedTaskIds((current) => current.filter((id) => id !== taskId));
  }

  function moveTask(taskId: string, direction: "up" | "down") {
    setSelectedTaskIds((current) => {
      const index = current.indexOf(taskId);

      if (index === -1) {
        return current;
      }

      const nextIndex = direction === "up" ? index - 1 : index + 1;

      if (nextIndex < 0 || nextIndex >= current.length) {
        return current;
      }

      const next = [...current];
      const temp = next[index];
      next[index] = next[nextIndex];
      next[nextIndex] = temp;

      return next;
    });
  }

  function toggleStudent(studentId: string) {
    setSelectedStudentIds((current) =>
      current.includes(studentId)
        ? current.filter((id) => id !== studentId)
        : [...current, studentId]
    );
  }

  function selectAllFilteredTasks() {
    setSelectedTaskIds((current) => {
      const next = [...current];

      for (const task of filteredTasks) {
        if (!next.includes(task.id)) {
          next.push(task.id);
        }
      }

      return next;
    });
  }

  function clearSelectedTasks() {
    setSelectedTaskIds([]);
  }

  function selectAllStudents() {
    setSelectedStudentIds(students.map((student) => student.id));
  }

  function clearSelectedStudents() {
    setSelectedStudentIds([]);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");

    if (!title.trim()) {
      setError("Введите название домашнего задания");
      return;
    }

    if (selectedTaskIds.length === 0) {
      setError("Выберите хотя бы одну задачу");
      return;
    }

    if (selectedStudentIds.length === 0) {
      setError("Выберите хотя бы одного ученика");
      return;
    }

    setIsSaving(true);

    try {
      const url =
        mode === "create"
          ? "/api/homeworks"
          : `/api/homeworks/${initialData?.id}`;

      const response = await fetch(url, {
        method: mode === "create" ? "POST" : "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description,
          deadline,
          taskIds: selectedTaskIds,
          studentIds: selectedStudentIds,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Не удалось сохранить домашнее задание");
        return;
      }

      router.push(`/teacher/homeworks/${data.homework.id}`);
      router.refresh();
    } catch {
      setError("Не удалось подключиться к серверу");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {mode === "edit" && initialData?.attemptsCount ? (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
          <div className="font-bold">В этом ДЗ уже есть отправленные решения</div>
          <div className="mt-1">
            Попыток: {initialData.attemptsCount}. Менять название, описание и
            дедлайн безопасно. Состав задач тоже можно изменить, но история
            старых попыток останется как была. Учеников, которые уже сдавали
            это ДЗ, убрать нельзя.
          </div>
        </div>
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-950">Основные данные</h2>

        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Название ДЗ
            </label>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
              placeholder="Например: ДЗ №1. Задания 5 и 25"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Описание
            </label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
              placeholder="Что нужно сделать ученику"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Дедлайн
            </label>
            <input
              value={deadline}
              onChange={(event) => setDeadline(event.target.value)}
              type="datetime-local"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
            />
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-950">Задачи из базы</h2>
            <p className="mt-1 text-sm text-slate-500">
              Выбрано: {selectedTaskIds.length}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <input
              value={taskSearch}
              onChange={(event) => setTaskSearch(event.target.value)}
              className="w-56 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
              placeholder="Поиск задачи"
            />

            <select
              value={egeNumberFilter}
              onChange={(event) => setEgeNumberFilter(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
            >
              <option value="">Все №</option>
              {Array.from({ length: 27 }, (_, index) => index + 1).map(
                (number) => (
                  <option key={number} value={number}>
                    №{number}
                  </option>
                )
              )}
            </select>

            <button
              type="button"
              onClick={selectAllFilteredTasks}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Выбрать найденные
            </button>
          </div>
        </div>

        <div className="mt-5 max-h-[360px] space-y-3 overflow-y-auto pr-2">
          {filteredTasks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
              Задачи не найдены
            </div>
          ) : (
            filteredTasks.map((task) => {
              const isSelected = selectedTaskIds.includes(task.id);

              return (
                <label
                  key={task.id}
                  className={
                    isSelected
                      ? "block cursor-pointer rounded-2xl border border-cyan-300 bg-cyan-50 p-4"
                      : "block cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 transition hover:bg-slate-50"
                  }
                >
                  <div className="flex items-start gap-3">
                    <input
                      checked={isSelected}
                      onChange={() => toggleTask(task.id)}
                      type="checkbox"
                      className="mt-1"
                    />

                    <div>
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-cyan-700">
                          №{task.egeNumber}
                        </span>

                        {task.difficulty ? (
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-amber-700">
                            Сложность {task.difficulty}/5
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-2 font-semibold text-slate-950">
                        {task.title}
                      </div>
                    </div>
                  </div>
                </label>
              );
            })
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-950">
              Порядок задач в ДЗ
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Именно в этом порядке задачи увидит ученик.
            </p>
          </div>

          {selectedTasks.length > 0 ? (
            <button
              type="button"
              onClick={clearSelectedTasks}
              className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
            >
              Очистить задачи
            </button>
          ) : null}
        </div>

        {selectedTasks.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
            Пока задачи не выбраны. Отметь задачи выше, и они появятся здесь.
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {selectedTasks.map((task, index) => (
              <div
                key={task.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-cyan-700">
                        {index + 1}
                      </span>

                      <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600">
                        №{task.egeNumber}
                      </span>

                      {task.difficulty ? (
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-amber-700">
                          Сложность {task.difficulty}/5
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-2 font-semibold text-slate-950">
                      {task.title}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => moveTask(task.id, "up")}
                      disabled={index === 0}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      ↑
                    </button>

                    <button
                      type="button"
                      onClick={() => moveTask(task.id, "down")}
                      disabled={index === selectedTasks.length - 1}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      ↓
                    </button>

                    <button
                      type="button"
                      onClick={() => removeTask(task.id)}
                      className="rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
                    >
                      Убрать
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-950">Ученики</h2>
            <p className="mt-1 text-sm text-slate-500">
              Выбрано: {selectedStudentIds.length}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={selectAllStudents}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Выбрать всех
            </button>

            <button
              type="button"
              onClick={clearSelectedStudents}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Очистить
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {students.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 md:col-span-2">
              Ученики не найдены
            </div>
          ) : (
            students.map((student) => {
              const isSelected = selectedStudentIds.includes(student.id);

              return (
                <label
                  key={student.id}
                  className={
                    isSelected
                      ? "block cursor-pointer rounded-2xl border border-cyan-300 bg-cyan-50 p-4"
                      : "block cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 transition hover:bg-slate-50"
                  }
                >
                  <div className="flex items-start gap-3">
                    <input
                      checked={isSelected}
                      onChange={() => toggleStudent(student.id)}
                      type="checkbox"
                      className="mt-1"
                    />

                    <div>
                      <div className="font-semibold text-slate-950">
                        {student.name}
                      </div>
                      <div className="mt-1 text-sm text-slate-500">
                        {student.email}
                      </div>
                    </div>
                  </div>
                </label>
              );
            })
          )}
        </div>
      </section>

      <div className="sticky bottom-4 rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-lg backdrop-blur">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
          <div>
            Задач: <b>{selectedTaskIds.length}</b>
          </div>
          <div>
            Учеников: <b>{selectedStudentIds.length}</b>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="w-full rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving
            ? "Сохраняем..."
            : mode === "create"
              ? "Создать и выдать ДЗ"
              : "Сохранить изменения"}
        </button>
      </div>
    </form>
  );
}