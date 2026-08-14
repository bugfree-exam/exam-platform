import Link from "next/link";

import { requireStudentPage } from "@/lib/access";
import { MASTERY_LABELS } from "@/lib/mastery";
import { getStudentSkillMap } from "@/lib/studentJourney";

export const dynamic = "force-dynamic";

const stageLabels = { FOUNDATION: "База", CORE: "Основной блок", ADVANCED: "Продвинутый блок", EXAM: "Экзаменационная вершина" } as const;
const masteryTone = { INSUFFICIENT_DATA: "bg-slate-100 text-slate-600", CRITICAL_GAP: "bg-rose-100 text-rose-800", PRACTICE: "bg-orange-100 text-orange-800", CONSOLIDATE: "bg-amber-100 text-amber-800", MASTERED: "bg-emerald-100 text-emerald-800" } as const;

export default async function StudentSkillsPage() {
  const user = await requireStudentPage();
  const skills = await getStudentSkillMap(user.id);

  return <main className="min-h-screen bg-[#f3f7fa] px-4 py-6 text-[#102638] sm:px-6"><div className="mx-auto max-w-6xl"><Link href="/student" className="text-sm font-bold text-cyan-700">← В кабинет</Link><header className="mt-4 rounded-[32px] bg-[#092535] p-7 text-white sm:p-10"><div className="font-mono text-[11px] uppercase tracking-[0.18em] text-cyan-300">skills.dependencies</div><h1 className="mt-3 text-3xl font-black sm:text-5xl">Карта навыков и зависимостей</h1><p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">Каждый номер расположен после необходимой базы. Серый статус означает не слабость, а недостаток независимых данных для честного вывода.</p></header>{(["FOUNDATION", "CORE", "ADVANCED", "EXAM"] as const).map((stage) => <section key={stage} className="mt-6"><h2 className="text-xl font-black">{stageLabels[stage]}</h2><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{skills.filter((skill) => skill.stage === stage).map((skill) => <article key={skill.egeNumber} className={`rounded-2xl border bg-white p-5 ${skill.available ? "border-slate-200" : "border-dashed border-slate-300 opacity-75"}`}><div className="flex items-start justify-between gap-3"><div className="text-2xl font-black">№{skill.egeNumber}</div><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${masteryTone[skill.mastery]}`}>{MASTERY_LABELS[skill.mastery]}</span></div><h3 className="mt-3 font-black">{skill.title}</h3>{skill.stats ? <p className="mt-2 text-xs text-slate-500">{skill.stats.correct} из {skill.stats.total} независимо · {skill.stats.percent}%</p> : <p className="mt-2 text-xs text-slate-500">Нужно получить независимые ответы</p>}{skill.missingPrerequisites.length ? <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">Сначала укрепить: {skill.missingPrerequisites.map((number) => `№${number}`).join(", ")}</p> : <p className="mt-3 text-xs font-bold text-emerald-700">Базовые зависимости открыты</p>}<Link href={`/student/trainer/${skill.egeNumber}`} className="mt-4 inline-flex text-sm font-black text-cyan-700">Открыть задания →</Link></article>)}</div></section>)}</div></main>;
}
