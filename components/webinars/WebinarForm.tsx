"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { RichTextEditor } from "@/components/editor/RichTextEditor";

type WebinarMaterialType =
  | "LINK"
  | "CHEATSHEET"
  | "PRESENTATION"
  | "DOCUMENT"
  | "CODE"
  | "OTHER";

type WebinarStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
type WebinarVideoProvider = "RUTUBE" | "YANDEX_DISK" | "EXTERNAL";

type MaterialFormItem = {
  title: string;
  url: string;
  type: WebinarMaterialType;
};

type HomeworkOption = {
  id: string;
  title: string;
  status: string;
};

type WebinarFormInitialData = {
  id: string;
  title: string;
  description: string;
  eventDate: string;
  videoProvider: WebinarVideoProvider;
  videoUrl: string;
  videoEmbedUrl: string;
  contentHtml: string;
  status: WebinarStatus;
  materials: MaterialFormItem[];
  topic: string;
  egeNumber: string;
  practiceHomeworkId: string;
};

type WebinarFormProps = {
  mode?: "create" | "edit";
  initialData?: WebinarFormInitialData;
  homeworkOptions?: HomeworkOption[];
};

const MATERIAL_TYPES: {
  value: WebinarMaterialType;
  label: string;
}[] = [
  { value: "CHEATSHEET", label: "Шпаргалка" },
  { value: "PRESENTATION", label: "Презентация" },
  { value: "DOCUMENT", label: "Документ" },
  { value: "CODE", label: "Код" },
  { value: "LINK", label: "Ссылка" },
  { value: "OTHER", label: "Другое" },
];

export function WebinarForm({
  mode = "create",
  initialData,
  homeworkOptions = [],
}: WebinarFormProps) {
  const router = useRouter();

  const [title, setTitle] = useState(initialData?.title ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [topic, setTopic] = useState(initialData?.topic ?? "");
  const [egeNumber, setEgeNumber] = useState(initialData?.egeNumber ?? "");
  const [practiceHomeworkId, setPracticeHomeworkId] = useState(
    initialData?.practiceHomeworkId ?? ""
  );
  const [eventDate, setEventDate] = useState(initialData?.eventDate ?? "");
  const [videoProvider, setVideoProvider] = useState<WebinarVideoProvider>(
    initialData?.videoProvider ?? "RUTUBE"
  );
  const [videoUrl, setVideoUrl] = useState(initialData?.videoUrl ?? "");
  const [videoEmbedUrl, setVideoEmbedUrl] = useState(
    initialData?.videoEmbedUrl ?? ""
  );
  const [contentHtml, setContentHtml] = useState(
    initialData?.contentHtml ??
      "<h2>Краткий конспект</h2><p>Добавь сюда основные тезисы вебинара.</p>"
  );
  const [status, setStatus] = useState<WebinarStatus>(
    initialData?.status ?? "PUBLISHED"
  );
  const [materials, setMaterials] = useState<MaterialFormItem[]>(
    initialData?.materials.length
      ? initialData.materials
      : [{ title: "", url: "", type: "CHEATSHEET" }]
  );

  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  function updateMaterial<K extends keyof MaterialFormItem>(
    index: number,
    key: K,
    value: MaterialFormItem[K]
  ) {
    setMaterials((current) =>
      current.map((material, materialIndex) =>
        materialIndex === index ? { ...material, [key]: value } : material
      )
    );
  }

  function addMaterial() {
    setMaterials((current) => [
      ...current,
      { title: "", url: "", type: "LINK" },
    ]);
  }

  function removeMaterial(index: number) {
    setMaterials((current) =>
      current.filter((_, materialIndex) => materialIndex !== index)
    );
  }

  function moveMaterial(index: number, direction: "up" | "down") {
    setMaterials((current) => {
      const nextIndex = direction === "up" ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= current.length) return current;

      const next = [...current];
      const temp = next[index];
      next[index] = next[nextIndex];
      next[nextIndex] = temp;
      return next;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("Введите название вебинара");
      return;
    }
    if (!videoUrl.trim()) {
      setError("Добавьте ссылку на видео");
      return;
    }
    if (!contentHtml.trim()) {
      setError("Добавьте текст/конспект вебинара");
      return;
    }

    setIsSaving(true);

    try {
      const url =
        mode === "create" ? "/api/webinars" : `/api/webinars/${initialData?.id}`;

      const response = await fetch(url, {
        method: mode === "create" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          eventDate,
          videoProvider,
          videoUrl,
          videoEmbedUrl,
          contentHtml,
          status,
          topic,
          egeNumber,
          practiceHomeworkId: practiceHomeworkId || null,
          materials: materials.filter(
            (material) => material.title.trim() && material.url.trim()
          ),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Не удалось сохранить вебинар");
        return;
      }

      router.push(`/teacher/webinars/${data.webinar.id}`);
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

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-950">Основное</h2>

        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Название вебинара
            </label>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
              placeholder="Например: Вебинар №1. Основы Python"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Краткое описание
            </label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
              placeholder="Что ученик найдёт на странице"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr_220px]">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Тема вебинара
              </label>
              <input
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
                placeholder="Например: Основы Python"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Номер ЕГЭ
              </label>
              <select
                value={egeNumber}
                onChange={(event) => setEgeNumber(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
              >
                <option value="">Не привязан</option>
                {Array.from({ length: 27 }, (_, index) => index + 1).map((number) => (
                  <option key={number} value={number}>
                    №{number}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded-2xl border border-cyan-200 bg-cyan-50/70 p-4">
            <label className="mb-1 block text-sm font-bold text-slate-800">
              Задания для отработки после вебинара
            </label>
            <select
              value={practiceHomeworkId}
              onChange={(event) => setPracticeHomeworkId(event.target.value)}
              className="w-full rounded-xl border border-cyan-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
            >
              <option value="">Не привязывать ДЗ</option>
              {homeworkOptions.map((homework) => (
                <option key={homework.id} value={homework.id}>
                  {homework.title}{homework.status === "DRAFT" ? " · черновик" : ""}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs leading-5 text-slate-600">
              На странице вебинара ученик увидит отдельную кнопку «Перейти к отработке».
              Привязанное ДЗ можно решить даже без персонального назначения.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Дата вебинара
            </label>
            <input
              value={eventDate}
              onChange={(event) => setEventDate(event.target.value)}
              type="datetime-local"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Статус
            </label>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as WebinarStatus)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
            >
              <option value="PUBLISHED">Опубликовано для учеников</option>
              <option value="DRAFT">Черновик</option>
              {mode === "edit" ? <option value="ARCHIVED">Архив</option> : null}
            </select>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-950">Видео</h2>
        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Источник видео</label>
            <select
              value={videoProvider}
              onChange={(event) => setVideoProvider(event.target.value as WebinarVideoProvider)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
            >
              <option value="RUTUBE">RuTube</option>
              <option value="YANDEX_DISK">Яндекс.Диск</option>
              <option value="EXTERNAL">Другой источник</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Ссылка на видео</label>
            <input
              value={videoUrl}
              onChange={(event) => setVideoUrl(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
              placeholder="https://rutube.ru/video/..."
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Ссылка для встраивания iframe</label>
            <input
              value={videoEmbedUrl}
              onChange={(event) => setVideoEmbedUrl(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
              placeholder="Можно оставить пустым для RuTube"
            />
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Для RuTube можно оставить пустым. Для Яндекс.Диска лучше вставить именно embed-ссылку, если она доступна.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-950">Статья / конспект</h2>
        <p className="mt-2 text-sm text-slate-500">
          Можно добавлять заголовки, списки, таблицы, картинки, ссылки и фрагменты кода.
        </p>
        <div className="mt-5">
          <RichTextEditor value={contentHtml} onChange={setContentHtml} minHeight={360} />
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-950">Материалы</h2>
            <p className="mt-1 text-sm text-slate-500">
              Ссылки на шпаргалки, презентации, документы, код и дополнительные материалы.
            </p>
          </div>
          <button
            type="button"
            onClick={addMaterial}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            + Добавить материал
          </button>
        </div>

        <div className="mt-5 space-y-3">
          {materials.map((material, index) => (
            <div key={index} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="grid gap-3 md:grid-cols-[1fr_1fr_180px_auto]">
                <input
                  value={material.title}
                  onChange={(event) => updateMaterial(index, "title", event.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
                  placeholder="Название"
                />
                <input
                  value={material.url}
                  onChange={(event) => updateMaterial(index, "url", event.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
                  placeholder="Ссылка"
                />
                <select
                  value={material.type}
                  onChange={(event) => updateMaterial(index, "type", event.target.value as WebinarMaterialType)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
                >
                  {MATERIAL_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button type="button" onClick={() => moveMaterial(index, "up")} disabled={index === 0} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">↑</button>
                  <button type="button" onClick={() => moveMaterial(index, "down")} disabled={index === materials.length - 1} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">↓</button>
                  <button type="button" onClick={() => removeMaterial(index)} className="rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50">Убрать</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="sticky bottom-4 rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-lg backdrop-blur">
        <button
          type="submit"
          disabled={isSaving}
          className="w-full rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving
            ? "Сохраняем..."
            : mode === "create"
              ? "Создать вебинар"
              : "Сохранить изменения"}
        </button>
      </div>
    </form>
  );
}
