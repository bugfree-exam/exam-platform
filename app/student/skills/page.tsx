import Link from "next/link";

import { requireStudentPage } from "@/lib/access";
import { MASTERY_LABELS } from "@/lib/mastery";
import { getStudentSkillMap } from "@/lib/studentJourney";

export const dynamic = "force-dynamic";

const masteryTone = {
  INSUFFICIENT_DATA: "bg-slate-100 text-slate-600",
  CRITICAL_GAP: "bg-rose-100 text-rose-800",
  PRACTICE: "bg-orange-100 text-orange-800",
  CONSOLIDATE: "bg-amber-100 text-amber-800",
  MASTERED: "bg-emerald-100 text-emerald-800",
} as const;

export default async function StudentSkillsPage() {
  const user = await requireStudentPage();
  const skillMap = await getStudentSkillMap(user.id);

  return (
    <main className="min-h-screen bg-[#f3f7fa] px-4 py-6 text-[#102638] sm:px-6">
      <div className="mx-auto max-w-6xl">
        <Link href="/student" className="text-sm font-bold text-cyan-700">← В кабинет</Link>
        <header className="mt-4 rounded-[32px] bg-[#092535] p-7 text-white sm:p-10">
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-cyan-300">teacher.authored.skills</div>
          <h1 className="mt-3 text-3xl font-black sm:text-5xl">Карта навыков и зависимостей</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
            Преподаватель определил уровни, темы и порядок зависимостей{skillMap.courseTitle ? ` для курса «${skillMap.courseTitle}»` : ""}.
            Ваши результаты не меняют карту — они показывают, что уже освоено и какую базу стоит укрепить.
          </p>
        </header>

        {skillMap.levels.map((level) => (
          <section key={level.id} className="mt-7">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-700">Уровень {level.order}</div>
              <h2 className="mt-1 text-xl font-black">{level.title}</h2>
              {level.description ? <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">{level.description}</p> : null}
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {level.skills.map((skill) => (
                <article key={skill.id} className={`rounded-2xl border bg-white p-5 ${skill.available ? "border-slate-200" : "border-dashed border-slate-300 opacity-75"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-2xl font-black">№{skill.egeNumber}</div>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${masteryTone[skill.mastery]}`}>{MASTERY_LABELS[skill.mastery]}</span>
                  </div>
                  <h3 className="mt-3 font-black">{skill.title}</h3>
                  {skill.description ? <p className="mt-2 text-xs leading-5 text-slate-500">{skill.description}</p> : null}
                  {skill.stats ? <p className="mt-2 text-xs text-slate-500">{skill.stats.correct} из {skill.stats.total} независимо · {skill.stats.percent}%</p> : <p className="mt-2 text-xs text-slate-500">Нужно получить независимые ответы · ~{skill.estimatedMinutes} мин.</p>}
                  {skill.missingPrerequisites.length > 0 ? <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">Сначала укрепить: {skill.missingPrerequisites.map((number) => `№${number}`).join(", ")}</p> : <p className="mt-3 text-xs font-bold text-emerald-700">Заданные зависимости открыты</p>}
                  <Link href={`/student/trainer/${skill.egeNumber}`} className="mt-4 inline-flex text-sm font-black text-cyan-700">Открыть задания →</Link>
                </article>
              ))}
              {level.skills.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500">Преподаватель пока не добавил темы в этот уровень.</div> : null}
            </div>
          </section>
        ))}

        {skillMap.levels.length === 0 ? <section className="mt-6 rounded-[28px] border border-dashed border-slate-300 bg-white p-7"><h2 className="text-xl font-black">Карта пока формируется</h2><p className="mt-2 text-sm leading-6 text-slate-500">Преподаватель ещё не опубликовал уровни и темы курса. Здесь автоматически появится его авторская структура.</p></section> : null}
      </div>
    </main>
  );
}
