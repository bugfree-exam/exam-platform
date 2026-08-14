import Link from "next/link";

import { requireStudentPage } from "@/lib/access";
import { MASTERY_LABELS } from "@/lib/mastery";
import {
  getStudentAnalytics,
  type AnalyticsPeriod,
  type TaskSkill,
} from "@/lib/studentAnalytics";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ period?: string }>;
};

function parsePeriod(value?: string): AnalyticsPeriod {
  if (value === "90" || value === "all") return value;
  return "30";
}

function skillTone(skill: TaskSkill) {
  if (skill.status === "INSUFFICIENT_DATA") {
    return {
      label: MASTERY_LABELS.INSUFFICIENT_DATA,
      badge: "bg-slate-100 text-slate-600",
      bar: "bg-slate-400",
    };
  }

  if (skill.status === "MASTERED") {
    return {
      label: MASTERY_LABELS.MASTERED,
      badge: "bg-emerald-100 text-emerald-800",
      bar: "bg-emerald-500",
    };
  }

  if (skill.status === "CONSOLIDATE") {
    return {
      label: MASTERY_LABELS.CONSOLIDATE,
      badge: "bg-amber-100 text-amber-800",
      bar: "bg-amber-500",
    };
  }

  if (skill.status === "PRACTICE") {
    return {
      label: MASTERY_LABELS.PRACTICE,
      badge: "bg-orange-100 text-orange-800",
      bar: "bg-orange-500",
    };
  }

  return {
    label: MASTERY_LABELS.CRITICAL_GAP,
    badge: "bg-rose-100 text-rose-800",
    bar: "bg-rose-500",
  };
}

function confidenceLabel(skill: TaskSkill) {
  if (skill.confidence === "HIGH") return "данных достаточно";
  if (skill.confidence === "MEDIUM") return "средняя выборка";
  return "нужно ещё решить";
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function sourceLabel(source: "HOMEWORK" | "PRACTICE" | "VARIANT") {
  if (source === "HOMEWORK") return "ДЗ";
  if (source === "VARIANT") return "Вариант";
  return "Тренажёр";
}

export default async function StudentResultsPage({ searchParams }: PageProps) {
  const user = await requireStudentPage();
  const params = await searchParams;
  const period = parsePeriod(params.period);
  const analytics = await getStudentAnalytics(user.id, period);

  const periodOptions: { value: AnalyticsPeriod; label: string }[] = [
    { value: "30", label: "30 дней" },
    { value: "90", label: "90 дней" },
    { value: "all", label: "Всё время" },
  ];

  return (
    <main className="min-h-screen bg-[#f3f7fa] px-4 py-5 text-[#102638] sm:px-6 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <nav className="flex items-center justify-between gap-4 rounded-2xl border border-white bg-white/90 px-4 py-3 shadow-sm">
          <Link href="/student" className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#0b2436] font-mono text-xs font-bold text-cyan-300">
              {"</>"}
            </span>
            <span>
              <span className="block text-sm font-black">Экзамен без багов</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-400">
                analytics
              </span>
            </span>
          </Link>
          <Link href="/student" className="text-sm font-bold text-cyan-700">
            ← В кабинет
          </Link>
        </nav>

        <header className="mt-5 overflow-hidden rounded-[32px] bg-[#092535] p-6 text-white shadow-xl sm:p-8 lg:p-10">
          <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-end">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-cyan-300">
                progress.system
              </div>
              <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] sm:text-5xl">
                Результаты, которые помогают готовиться дальше
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
                Полные варианты отвечают за прогноз балла ЕГЭ, все решения — за
                точность и навыки по номерам. Одна задача тренажёра больше не
                влияет на «средний результат» так же, как полноценный вариант.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">
                готовность к ЕГЭ
              </div>
              <div className="mt-3 flex items-end gap-3">
                <div className="text-5xl font-black text-white">
                  {analytics.readiness ?? "—"}
                </div>
                <div className="pb-1 text-sm font-bold text-cyan-300">/100</div>
              </div>
              <p className="mt-3 text-xs leading-5 text-slate-400">
                {analytics.variantCountForReadiness > 0
                  ? `Среднее по последним ${analytics.variantCountForReadiness} завершённым вариантам.`
                  : "Появится после первого завершённого полного варианта."}
              </p>
              {analytics.readinessTrend !== null ? (
                <div className={`mt-3 text-sm font-bold ${analytics.readinessTrend >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                  {analytics.readinessTrend > 0 ? "+" : ""}
                  {analytics.readinessTrend} баллов от первого к последнему в этой выборке
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <section className="mt-5 flex flex-wrap gap-2">
          {periodOptions.map((option) => (
            <Link
              key={option.value}
              href={`/student/results?period=${option.value}`}
              className={`rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                period === option.value
                  ? "bg-[#0b2436] text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-cyan-300"
              }`}
            >
              {option.label}
            </Link>
          ))}
        </section>

        <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-3xl border border-white bg-white p-5 shadow-sm">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Точность независимых ответов</div>
            <div className="mt-2 text-4xl font-black text-cyan-700">{analytics.accuracy}%</div>
            <p className="mt-2 text-sm text-slate-500">
              {analytics.correctAnswers} из {analytics.totalAnswers} первых встреч с задачами верны
            </p>
          </article>

          <article className="rounded-3xl border border-white bg-white p-5 shadow-sm">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Последний вариант</div>
            <div className="mt-2 text-4xl font-black text-violet-700">
              {analytics.latestTestScore ?? "—"}
              {analytics.latestTestScore !== null ? "/100" : ""}
            </div>
            <p className="mt-2 text-sm text-slate-500">Отдельно от тренажёра и домашних работ</p>
          </article>

          <article className="rounded-3xl border border-white bg-white p-5 shadow-sm">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Домашние работы</div>
            <div className="mt-2 text-4xl font-black text-emerald-700">{analytics.homeworkOnTimePercent}%</div>
            <p className="mt-2 text-sm text-slate-500">
              Сдано вовремя среди {analytics.completedHomeworkCount} завершённых
            </p>
          </article>

          <article className="rounded-3xl border border-white bg-white p-5 shadow-sm">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Тренажёр</div>
            <div className="mt-2 text-4xl font-black text-amber-700">{analytics.practiceCount}</div>
            <p className="mt-2 text-sm text-slate-500">Ответов за выбранный период</p>
          </article>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_350px]">
          <article className="rounded-[30px] border border-white bg-white p-5 shadow-sm sm:p-7">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-700">skills.matrix</div>
                <h2 className="mt-2 text-2xl font-black">Навыки по номерам ЕГЭ</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                  Статус «уверенно» появляется только при достаточном количестве решений.
                  После 1–2 удачных задач номер не считается сильным.
                </p>
              </div>
            </div>

            {analytics.skills.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
                Пока недостаточно решений для построения карты навыков.
              </div>
            ) : (
              <div className="mt-6 grid gap-3 md:grid-cols-2">
                {analytics.skills.map((skill) => {
                  const tone = skillTone(skill);

                  return (
                    <div key={skill.egeNumber} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-lg font-black">№{skill.egeNumber} ЕГЭ</div>
                          <div className="mt-1 text-xs text-slate-400">{confidenceLabel(skill)}</div>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${tone.badge}`}>
                          {tone.label}
                        </span>
                      </div>

                      <div className="mt-4 flex items-end justify-between gap-3">
                        <div className="text-3xl font-black">{skill.percent}%</div>
                        <div className="text-right text-xs text-slate-500">
                          {skill.correct}/{skill.total} верно
                        </div>
                      </div>

                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                        <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${skill.percent}%` }} />
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-3 text-xs">
                        <span className="text-slate-500">Ошибок: {skill.incorrect}</span>
                        {skill.trend !== null ? (
                          <span className={`font-bold ${skill.trend >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                            14 дней: {skill.trend > 0 ? "+" : ""}{skill.trend} п.п.
                          </span>
                        ) : (
                          <span className="text-slate-400">тренд: мало данных</span>
                        )}
                      </div>

                      <Link
                        href={`/student/trainer/${skill.egeNumber}`}
                        className="mt-4 inline-flex text-sm font-bold text-cyan-700 hover:text-cyan-900"
                      >
                        Потренировать №{skill.egeNumber} →
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </article>

          <aside className="space-y-5">
            <section className="rounded-[28px] border border-white bg-white p-5 shadow-sm">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-rose-700">next.focus</div>
              <h2 className="mt-2 text-xl font-black">Что улучшить дальше</h2>

              {analytics.focusSkills.length === 0 ? (
                <p className="mt-4 text-sm leading-6 text-slate-500">
                  Нет номера с устойчивой точностью ниже 70% и достаточной выборкой.
                  Продолжайте решать, чтобы рекомендации стали точнее.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {analytics.focusSkills.map((skill, index) => (
                    <Link
                      key={skill.egeNumber}
                      href={`/student/trainer/${skill.egeNumber}`}
                      className="block rounded-2xl border border-rose-100 bg-rose-50/60 p-4 transition hover:border-rose-300"
                    >
                      <div className="text-xs font-bold uppercase tracking-wide text-rose-500">Приоритет {index + 1}</div>
                      <div className="mt-1 text-lg font-black text-rose-950">№{skill.egeNumber} · {skill.percent}%</div>
                      <div className="mt-1 text-xs text-rose-700">{skill.correct} из {skill.total} верно</div>
                      <div className="mt-3 text-sm font-bold text-rose-900">Потренироваться →</div>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-[28px] border border-white bg-white p-5 shadow-sm">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-700">stable.skills</div>
              <h2 className="mt-2 text-xl font-black">Уверенные номера</h2>
              {analytics.strongSkills.length === 0 ? (
                <p className="mt-4 text-sm leading-6 text-slate-500">
                  Для статуса «уверенно» нужно минимум 5 решений и не менее 80% точности.
                </p>
              ) : (
                <div className="mt-4 flex flex-wrap gap-2">
                  {analytics.strongSkills.map((skill) => (
                    <span key={skill.egeNumber} className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-800">
                      №{skill.egeNumber} · {skill.percent}%
                    </span>
                  ))}
                </div>
              )}
            </section>

            <Link
              href="/student/variants/progress"
              className="block rounded-[28px] bg-[#0b2436] p-5 text-white shadow-sm transition hover:bg-cyan-900"
            >
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300">exam.timeline</div>
              <div className="mt-2 text-xl font-black">Динамика полных вариантов</div>
              <p className="mt-2 text-sm leading-6 text-slate-300">Отдельный график тестовых баллов без смешивания с тренажёром.</p>
              <div className="mt-4 text-sm font-bold text-cyan-200">Открыть график →</div>
            </Link>
          </aside>
        </section>

        <section className="mt-6 rounded-[30px] border border-white bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-700">recent.activity</div>
              <h2 className="mt-2 text-2xl font-black">Последние результаты</h2>
            </div>
            <span className="text-xs text-slate-400">Показываем до 30 последних событий</span>
          </div>

          {analytics.history.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
              В выбранном периоде пока нет завершённых решений.
            </div>
          ) : (
            <div className="mt-5 divide-y divide-slate-100">
              {analytics.history.map((item) => (
                <Link
                  key={`${item.source}-${item.id}`}
                  href={item.href}
                  className="grid gap-3 py-4 transition hover:bg-slate-50 sm:grid-cols-[110px_minmax(0,1fr)_150px_110px] sm:items-center sm:px-3"
                >
                  <div>
                    <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                      {sourceLabel(item.source)}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-black">{item.title}</div>
                    <div className="mt-1 text-xs text-slate-400">{formatDate(item.date)} МСК</div>
                  </div>
                  <div className="text-sm font-bold text-slate-600">
                    {item.score}/{item.maxScore} · {item.percent}%
                  </div>
                  <div className="text-right text-lg font-black text-cyan-700">
                    {item.testScore !== null ? `${item.testScore}/100` : "Открыть →"}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
