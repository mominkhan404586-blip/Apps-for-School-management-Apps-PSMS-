import React from 'react';

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

export const AttendanceDonutChart: React.FC<{
  segments: DonutSegment[];
  centerValue: string;
  centerLabel: string;
}> = ({ segments, centerValue, centerLabel }) => {
  const total = segments.reduce((acc, s) => acc + s.value, 0) || 1;
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  let accumulated = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
        <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90" aria-label={centerLabel}>
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="16"
            className="text-slate-100 dark:text-slate-800"
          />
          {segments.map((seg) => {
            const pct = seg.value / total;
            const dash = pct * circumference;
            const offset = -accumulated * circumference;
            accumulated += pct;
            return (
              <circle
                key={seg.label}
                cx="70"
                cy="70"
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth="16"
                strokeDasharray={`${dash} ${circumference}`}
                strokeDashoffset={offset}
                strokeLinecap="butt"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-xl font-bold tabular-nums text-slate-900 dark:text-white">
            {centerValue}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">{centerLabel}</span>
        </div>
      </div>

      <div className="flex-1 w-full space-y-2.5">
        {segments.map((seg) => {
          const pct = Math.round((seg.value / total) * 1000) / 10;
          return (
            <div key={seg.label} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2.5">
                <span
                  className="w-2.5 h-2.5 rounded-sm shrink-0"
                  style={{ backgroundColor: seg.color }}
                  aria-hidden="true"
                />
                <span className="text-slate-700 dark:text-slate-300">{seg.label}</span>
              </div>
              <div className="flex items-center gap-2 tabular-nums">
                <span className="font-semibold text-slate-900 dark:text-slate-100">{seg.value}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">({pct}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const ClassBarChart: React.FC<{
  data: { label: string; value: number }[];
  unitLabel: string;
}> = ({ data, unitLabel }) => {
  const maxVal = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="space-y-3">
      <div className="h-44 flex items-end gap-3 pt-4 border-b border-slate-200 dark:border-slate-800 pb-2">
        {data.map((item) => {
          const heightPct = Math.max(12, Math.round((item.value / maxVal) * 100));
          return (
            <div key={item.label} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
              <span className="text-xs font-semibold tabular-nums text-slate-700 dark:text-slate-300">
                {item.value}
              </span>
              <div
                className="w-full max-w-[42px] rounded-t-md bg-blue-700 dark:bg-blue-500 transition-transform hover:scale-y-105 origin-bottom"
                style={{ height: `${heightPct}%` }}
                title={`${item.label}: ${item.value} ${unitLabel}`}
              />
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-3">
        {data.map((item) => (
          <div
            key={item.label}
            className="flex-1 text-center text-xs font-medium text-slate-600 dark:text-slate-400 truncate"
          >
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
};

export const ProgressMeter: React.FC<{
  label: string;
  value: number;
  max?: number;
  detailText?: string;
  barColorClass?: string;
}> = ({ label, value, max = 100, detailText, barColorClass = 'bg-blue-700 dark:bg-blue-500' }) => {
  const pct = Math.min(100, Math.max(0, Math.round((value / max) * 100)));
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700 dark:text-slate-200">{label}</span>
        <span className="text-xs tabular-nums font-medium text-slate-500 dark:text-slate-400">
          {detailText ?? `${pct}%`}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColorClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

export const TrendLineChart: React.FC<{
  points: { label: string; value: number }[];
  unit?: string;
}> = ({ points, unit = '%' }) => {
  const width = 420;
  const height = 130;
  const padX = 28;
  const padY = 18;
  const maxV = Math.max(...points.map((p) => p.value), 100);
  const minV = Math.min(...points.map((p) => p.value), 50);
  const span = Math.max(1, maxV - minV);

  const coords = points.map((pt, i) => {
    const x = padX + (i / Math.max(1, points.length - 1)) * (width - padX * 2);
    const y = height - padY - ((pt.value - minV) / span) * (height - padY * 2);
    return { ...pt, x, y };
  });

  const pathD = coords.map((c, idx) => `${idx === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height + 24}`} className="w-full h-40 overflow-visible">
        {[0, 0.5, 1].map((t) => {
          const y = padY + t * (height - padY * 2);
          return (
            <line
              key={t}
              x1={padX}
              x2={width - padX}
              y1={y}
              y2={y}
              stroke="currentColor"
              strokeDasharray="3 3"
              className="text-slate-200 dark:text-slate-800"
            />
          );
        })}
        <path
          d={pathD}
          fill="none"
          stroke="#1D4ED8"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {coords.map((c) => (
          <g key={c.label}>
            <circle cx={c.x} cy={c.y} r="4.5" className="fill-blue-700 dark:fill-blue-400 stroke-white dark:stroke-slate-900" strokeWidth="2" />
            <text
              x={c.x}
              y={c.y - 9}
              textAnchor="middle"
              className="text-[10px] font-semibold fill-slate-700 dark:fill-slate-300 tabular-nums"
            >
              {c.value}
              {unit}
            </text>
            <text
              x={c.x}
              y={height + 16}
              textAnchor="middle"
              className="text-[10px] fill-slate-500 dark:fill-slate-400"
            >
              {c.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
};
