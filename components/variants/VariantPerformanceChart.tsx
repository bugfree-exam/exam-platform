type VariantPerformancePoint = {
  order: number;
  egeNumber: number;
  title: string;
  percent: number;
  correctAnswers: number;
};

type VariantPerformanceChartProps = {
  points: VariantPerformancePoint[];
  totalAttempts: number;
};

const CHART_HEIGHT = 360;
const PLOT_TOP = 28;
const PLOT_BOTTOM = 300;
const PLOT_LEFT = 58;
const POINT_STEP = 44;

export function VariantPerformanceChart({
  points,
  totalAttempts,
}: VariantPerformanceChartProps) {
  if (totalAttempts === 0 || points.length === 0) {
    return (
      <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
        <div className="text-sm font-black text-slate-700">График появится после первой отправленной попытки</div>
        <p className="mt-2 text-sm text-slate-500">Для каждого задания будет рассчитана доля учеников, ответивших верно.</p>
      </div>
    );
  }

  const chartWidth = Math.max(760, PLOT_LEFT + (points.length - 1) * POINT_STEP + 42);
  const x = (index: number) => PLOT_LEFT + index * POINT_STEP;
  const y = (percent: number) => PLOT_BOTTOM - (percent / 100) * (PLOT_BOTTOM - PLOT_TOP);
  const linePoints = points.map((point, index) => `${x(index)},${y(point.percent)}`).join(" ");
  const areaPoints = `${PLOT_LEFT},${PLOT_BOTTOM} ${linePoints} ${x(points.length - 1)},${PLOT_BOTTOM}`;
  const average = Math.round(points.reduce((sum, point) => sum + point.percent, 0) / points.length);
  const strongest = points.reduce((best, point) => point.percent > best.percent ? point : best);
  const weakest = points.reduce((worst, point) => point.percent < worst.percent ? point : worst);

  return (
    <div className="mt-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-cyan-50 p-4">
          <div className="text-xs font-bold text-cyan-700">Средняя успешность</div>
          <div className="mt-1 text-2xl font-black text-cyan-950">{average}%</div>
        </div>
        <div className="rounded-2xl bg-emerald-50 p-4">
          <div className="text-xs font-bold text-emerald-700">Лучше всего</div>
          <div className="mt-1 text-lg font-black text-emerald-950">Задание {strongest.order} · {strongest.percent}%</div>
        </div>
        <div className="rounded-2xl bg-rose-50 p-4">
          <div className="text-xs font-bold text-rose-700">Требует разбора</div>
          <div className="mt-1 text-lg font-black text-rose-950">Задание {weakest.order} · {weakest.percent}%</div>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-3 sm:p-5">
        <svg
          viewBox={`0 0 ${chartWidth} ${CHART_HEIGHT}`}
          className="h-auto min-w-[760px]"
          role="img"
          aria-labelledby="variant-performance-title variant-performance-description"
        >
          <title id="variant-performance-title">Средняя выполняемость заданий варианта</title>
          <desc id="variant-performance-description">Процент верных ответов всех учеников для каждого задания варианта.</desc>
          <defs>
            <linearGradient id="variant-performance-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {[0, 20, 40, 60, 80, 100].map((value) => (
            <g key={value}>
              <line x1={PLOT_LEFT} x2={chartWidth - 20} y1={y(value)} y2={y(value)} stroke="#e2e8f0" strokeWidth="1" />
              <text x={PLOT_LEFT - 12} y={y(value) + 4} textAnchor="end" fill="#94a3b8" fontSize="11" fontWeight="700">{value}%</text>
            </g>
          ))}

          <line x1={PLOT_LEFT} x2={chartWidth - 20} y1={y(average)} y2={y(average)} stroke="#f59e0b" strokeWidth="2" strokeDasharray="7 7" opacity="0.9" />
          <text x={chartWidth - 24} y={y(average) - 8} textAnchor="end" fill="#b45309" fontSize="11" fontWeight="800">Среднее {average}%</text>

          <polygon points={areaPoints} fill="url(#variant-performance-area)" />
          <polyline points={linePoints} fill="none" stroke="#0891b2" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />

          {points.map((point, index) => (
            <g key={`${point.order}-${point.egeNumber}`}>
              <line x1={x(index)} x2={x(index)} y1={PLOT_TOP} y2={PLOT_BOTTOM} stroke="#f1f5f9" strokeWidth="1" />
              <circle cx={x(index)} cy={y(point.percent)} r="5.5" fill="#ffffff" stroke="#0891b2" strokeWidth="3">
                <title>{`Задание ${point.order} (№${point.egeNumber} ЕГЭ): ${point.percent}% — ${point.correctAnswers} из ${totalAttempts} верно. ${point.title}`}</title>
              </circle>
              <text x={x(index)} y={PLOT_BOTTOM + 28} textAnchor="middle" fill="#475569" fontSize="11" fontWeight="800">{point.order}</text>
            </g>
          ))}

          <text x={(PLOT_LEFT + chartWidth - 20) / 2} y={CHART_HEIGHT - 8} textAnchor="middle" fill="#64748b" fontSize="12" fontWeight="800">Номер задания в варианте</text>
        </svg>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">Процент считается от всех отправленных попыток. Пропущенный ответ учитывается как неверный. Наведите на точку, чтобы увидеть точные значения.</p>
    </div>
  );
}
