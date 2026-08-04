import Link from "next/link";

import { requireStudentPage } from "@/lib/access";
import { primaryToEgeTestScore } from "@/lib/egeScore";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function shortDate(value: Date | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
  }).format(value);
}

export default async function VariantProgressPage() {
  const user = await requireStudentPage();
  const attempts = await prisma.variantAttempt.findMany({
    where: { studentId: user.id, status: "SUBMITTED" },
    orderBy: { submittedAt: "asc" },
    select: {
      id: true,
      variantId: true,
      score: true,
      maxScore: true,
      percent: true,
      submittedAt: true,
      variant: { select: { title: true } },
    },
  });

  const points = attempts.map((attempt, index) => ({
    ...attempt,
    index,
    testScore: primaryToEgeTestScore(attempt.score),
  }));
  const latest = points.at(-1);
  const best = points.reduce(
    (current, point) => Math.max(current, point.testScore),
    0
  );
  const growth =
    points.length > 1
      ? points[points.length - 1].testScore - points[0].testScore
      : 0;

  const width = 920;
  const height = 360;
  const left = 58;
  const right = 24;
  const top = 24;
  const bottom = 58;
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;
  const xFor = (index: number) =>
    points.length <= 1
      ? left + chartWidth / 2
      : left + (index / (points.length - 1)) * chartWidth;
  const yFor = (score: number) => top + ((100 - score) / 100) * chartHeight;
  const path = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${xFor(index)} ${yFor(point.testScore)}`)
    .join(" ");
  const labelStep = Math.max(1, Math.ceil(points.length / 8));

  return (
    <main className="min-h-screen bg-[#f4f7f8] px-4 py-6 text-slate-950 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <nav className="flex items-center justify-between gap-4">
          <Link href="/student/variants" className="text-sm font-bold text-slate-600">
            ← К вариантам
          </Link>
          <Link href="/student" className="text-sm font-bold text-cyan-700">
            В кабинет
          </Link>
        </nav>

        <header className="mt-5 overflow-hidden rounded-[2rem] bg-slate-950 p-7 text-white shadow-xl sm:p-9">
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-cyan-300">
            variants.progress
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] sm:text-5xl">
            Прогресс по вариантам
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">
            Динамика тестовых баллов ЕГЭ по всем завершённым полноценным вариантам.
          </p>
        </header>

        {points.length === 0 ? (
          <section className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-10 text-center shadow-sm">
            <h2 className="text-2xl font-black">График появится после первого варианта</h2>
            <p className="mt-3 text-sm text-slate-500">
              Завершите пробную работу — результат автоматически попадёт сюда.
            </p>
            <Link href="/student/variants" className="mt-6 inline-flex rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white">
              Перейти к вариантам
            </Link>
          </section>
        ) : (
          <>
            <section className="mt-6 grid gap-4 sm:grid-cols-3">
              <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Последний результат</div>
                <div className="mt-2 text-4xl font-black text-cyan-700">{latest?.testScore}/100</div>
              </article>
              <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Лучший результат</div>
                <div className="mt-2 text-4xl font-black text-emerald-700">{best}/100</div>
              </article>
              <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Изменение</div>
                <div className={`mt-2 text-4xl font-black ${growth >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                  {growth > 0 ? "+" : ""}{growth}
                </div>
                <div className="mt-1 text-xs text-slate-500">от первого до последнего варианта</div>
              </article>
            </section>

            <section className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-7">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-700">score.timeline</div>
                <h2 className="mt-2 text-2xl font-black">Динамика тестового балла</h2>
              </div>
              <div className="mt-5 overflow-x-auto">
                <svg
                  viewBox={`0 0 ${width} ${height}`}
                  role="img"
                  aria-label="Линейный график результатов по вариантам"
                  className="min-w-[720px]"
                >
                  {[0, 20, 40, 60, 80, 100].map((score) => {
                    const y = yFor(score);
                    return (
                      <g key={score}>
                        <line x1={left} y1={y} x2={width - right} y2={y} stroke="#e2e8f0" strokeWidth="1" />
                        <text x={left - 12} y={y + 4} textAnchor="end" fontSize="12" fill="#64748b">{score}</text>
                      </g>
                    );
                  })}
                  {path ? <path d={path} fill="none" stroke="#0891b2" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /> : null}
                  {points.map((point, index) => {
                    const x = xFor(index);
                    const y = yFor(point.testScore);
                    const showLabel = index % labelStep === 0 || index === points.length - 1;
                    return (
                      <g key={point.id}>
                        <circle cx={x} cy={y} r="6" fill="#ffffff" stroke="#0891b2" strokeWidth="4">
                          <title>{point.variant.title}: {point.testScore}/100</title>
                        </circle>
                        <text x={x} y={y - 14} textAnchor="middle" fontSize="12" fontWeight="700" fill="#0f172a">
                          {point.testScore}
                        </text>
                        {showLabel ? (
                          <text x={x} y={height - 22} textAnchor="middle" fontSize="11" fill="#64748b">
                            {shortDate(point.submittedAt)}
                          </text>
                        ) : null}
                      </g>
                    );
                  })}
                </svg>
              </div>
            </section>

            <section className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-end justify-between gap-4">
                <h2 className="text-2xl font-black">История попыток</h2>
                <span className="text-sm text-slate-500">Всего: {points.length}</span>
              </div>
              <div className="mt-5 space-y-3">
                {[...points].reverse().slice(0, 12).map((point) => (
                  <Link
                    key={point.id}
                    href={`/student/variants/${point.variantId}/results/${point.id}`}
                    className="grid gap-3 rounded-2xl border border-slate-200 p-4 transition hover:border-cyan-300 sm:grid-cols-[minmax(0,1fr)_140px_110px] sm:items-center"
                  >
                    <div>
                      <div className="font-black">{point.variant.title}</div>
                      <div className="mt-1 text-xs text-slate-500">{shortDate(point.submittedAt)}</div>
                    </div>
                    <div className="text-sm font-bold text-slate-600">{point.score}/{point.maxScore} первичных</div>
                    <div className="text-right text-2xl font-black text-cyan-700">{point.testScore}/100</div>
                  </Link>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
