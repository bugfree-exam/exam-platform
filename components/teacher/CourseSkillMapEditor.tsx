"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export type CourseSkillNodeView = {
  id: string;
  levelId: string;
  order: number;
  egeNumber: number;
  title: string;
  description: string | null;
  estimatedMinutes: number;
  prerequisiteNumbers: number[];
};

export type CourseSkillLevelView = {
  id: string;
  order: number;
  title: string;
  description: string | null;
  nodes: CourseSkillNodeView[];
};

export function CourseSkillMapEditor({
  courseId,
  levels,
}: {
  courseId: string;
  levels: CourseSkillLevelView[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [editingLevel, setEditingLevel] = useState<CourseSkillLevelView | null>(null);
  const [editingNode, setEditingNode] = useState<CourseSkillNodeView | null>(null);
  const allNodes = levels.flatMap((level) => level.nodes);

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
      if (!response.ok) throw new Error(body.message ?? "Не удалось сохранить карту");
      router.refresh();
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось сохранить карту");
      return false;
    } finally {
      setPending(false);
    }
  }

  async function saveLevel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const saved = await send({
      action: "save-skill-level",
      courseId,
      levelId: editingLevel?.id,
      title: form.get("title"),
      description: form.get("description"),
    });
    if (saved) {
      setEditingLevel(null);
      formElement.reset();
    }
  }

  async function saveNode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const saved = await send({
      action: "save-skill-node",
      courseId,
      nodeId: editingNode?.id,
      levelId: form.get("levelId"),
      egeNumber: Number(form.get("egeNumber")),
      title: form.get("title"),
      description: form.get("description"),
      estimatedMinutes: Number(form.get("estimatedMinutes")),
      prerequisiteNumbers: form.get("prerequisiteNumbers"),
    });
    if (saved) {
      setEditingNode(null);
      formElement.reset();
    }
  }

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-700">skills.authoring</div>
      <h2 className="mt-2 text-2xl font-black">Карта навыков и зависимостей</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
        Вы определяете уровни сложности, темы и необходимые зависимости. Ученик увидит эту же структуру,
        а платформа добавит к ней только его статистику освоения.
      </p>

      {message ? <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800">{message}</div> : null}

      <div className="mt-6 space-y-5">
        {levels.map((level) => (
          <article key={level.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">Уровень {level.order}</div>
                <h3 className="mt-1 text-xl font-black">{level.title}</h3>
                {level.description ? <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">{level.description}</p> : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={pending || level.order === 1} onClick={() => send({ action: "move-skill-level", courseId, levelId: level.id, direction: "up" })} className="rounded-lg bg-white px-3 py-2 text-xs font-black disabled:opacity-30">↑</button>
                <button type="button" disabled={pending || level.order === levels.length} onClick={() => send({ action: "move-skill-level", courseId, levelId: level.id, direction: "down" })} className="rounded-lg bg-white px-3 py-2 text-xs font-black disabled:opacity-30">↓</button>
                <button type="button" onClick={() => setEditingLevel(level)} className="rounded-lg bg-emerald-100 px-3 py-2 text-xs font-black text-emerald-900">Изменить уровень</button>
                <button type="button" onClick={() => window.confirm(`Удалить уровень «${level.title}» вместе со всеми его темами?`) && send({ action: "delete-skill-level", courseId, levelId: level.id })} className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-black text-rose-700">Удалить</button>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {level.nodes.map((node) => (
                <div key={node.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-xl font-black">№{node.egeNumber}</div>
                    <div className="text-[10px] font-bold text-slate-400">~{node.estimatedMinutes} мин.</div>
                  </div>
                  <h4 className="mt-2 font-black">{node.title}</h4>
                  {node.description ? <p className="mt-2 text-xs leading-5 text-slate-500">{node.description}</p> : null}
                  <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                    {node.prerequisiteNumbers.length > 0
                      ? `Зависит от: ${node.prerequisiteNumbers.map((number) => `№${number}`).join(", ")}`
                      : "Без обязательных зависимостей"}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" disabled={pending || node.order === 1} onClick={() => send({ action: "move-skill-node", courseId, nodeId: node.id, direction: "up" })} className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-black disabled:opacity-30">↑</button>
                    <button type="button" disabled={pending || node.order === level.nodes.length} onClick={() => send({ action: "move-skill-node", courseId, nodeId: node.id, direction: "down" })} className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-black disabled:opacity-30">↓</button>
                    <button type="button" onClick={() => setEditingNode(node)} className="rounded-lg bg-cyan-50 px-3 py-2 text-xs font-black text-cyan-800">Изменить</button>
                    <button type="button" onClick={() => window.confirm(`Удалить тему №${node.egeNumber} из карты?`) && send({ action: "delete-skill-node", courseId, nodeId: node.id })} className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-black text-rose-700">Удалить</button>
                  </div>
                </div>
              ))}
              {level.nodes.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500">В этом уровне пока нет тем.</div> : null}
            </div>
          </article>
        ))}
      </div>

      <form key={editingLevel?.id ?? "new-level"} onSubmit={saveLevel} className="mt-6 grid gap-3 rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/50 p-4 md:grid-cols-2">
        <h3 className="font-black md:col-span-2">{editingLevel ? "Редактировать уровень" : "Добавить уровень сложности"}</h3>
        <input name="title" required minLength={2} placeholder="Например: Уверенная база" defaultValue={editingLevel?.title ?? ""} className="rounded-xl border border-slate-200 px-3 py-2.5 md:col-span-2" />
        <textarea name="description" placeholder="Что ученик освоит на этом уровне" defaultValue={editingLevel?.description ?? ""} className="rounded-xl border border-slate-200 px-3 py-2.5 md:col-span-2" />
        <div className="flex gap-2 md:col-span-2"><button disabled={pending} className="flex-1 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-black text-white disabled:opacity-50">{editingLevel ? "Сохранить уровень" : "Добавить уровень"}</button>{editingLevel ? <button type="button" onClick={() => setEditingLevel(null)} className="rounded-xl bg-white px-4 py-3 text-sm font-black">Отмена</button> : null}</div>
      </form>

      <form key={editingNode?.id ?? `new-node-${levels[0]?.id ?? "empty"}`} onSubmit={saveNode} className="mt-4 grid gap-3 rounded-2xl border border-dashed border-cyan-200 bg-cyan-50/40 p-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <h3 className="font-black">{editingNode ? `Редактировать тему №${editingNode.egeNumber}` : "Добавить задание / тему"}</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">Зависимости задаются номерами уже добавленных заданий. Циклические связи платформа не сохранит.</p>
        </div>
        <select name="levelId" required defaultValue={editingNode?.levelId ?? levels[0]?.id ?? ""} disabled={levels.length === 0} className="rounded-xl border border-slate-200 px-3 py-2.5"><option value="">Выберите уровень</option>{levels.map((level) => <option key={level.id} value={level.id}>{level.order}. {level.title}</option>)}</select>
        <input name="egeNumber" type="number" min={1} max={27} required placeholder="Номер ЕГЭ" defaultValue={editingNode?.egeNumber ?? ""} className="rounded-xl border border-slate-200 px-3 py-2.5" />
        <input name="title" required minLength={2} placeholder="Авторское название темы" defaultValue={editingNode?.title ?? ""} className="rounded-xl border border-slate-200 px-3 py-2.5 md:col-span-2" />
        <textarea name="description" placeholder="Что входит в тему и на что обратить внимание" defaultValue={editingNode?.description ?? ""} className="rounded-xl border border-slate-200 px-3 py-2.5 md:col-span-2" />
        <input name="estimatedMinutes" type="number" min={10} max={2_000} required defaultValue={editingNode?.estimatedMinutes ?? 120} className="rounded-xl border border-slate-200 px-3 py-2.5" />
        <input name="prerequisiteNumbers" placeholder={allNodes.length > 0 ? `Зависимости: ${allNodes.slice(0, 5).map((node) => node.egeNumber).join(", ")}` : "Сначала добавьте базовые темы"} defaultValue={editingNode?.prerequisiteNumbers.join(", ") ?? ""} className="rounded-xl border border-slate-200 px-3 py-2.5" />
        <div className="flex gap-2 md:col-span-2"><button disabled={pending || levels.length === 0} className="flex-1 rounded-xl bg-cyan-700 px-4 py-3 text-sm font-black text-white disabled:opacity-50">{editingNode ? "Сохранить тему" : "Добавить тему"}</button>{editingNode ? <button type="button" onClick={() => setEditingNode(null)} className="rounded-xl bg-white px-4 py-3 text-sm font-black">Отмена</button> : null}</div>
      </form>
    </section>
  );
}
