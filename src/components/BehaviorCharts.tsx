import React, { useMemo, useState } from 'react';
import type { BehaviorRecord, PublicStudent } from '../types.ts';

interface BehaviorChartsProps {
  records: BehaviorRecord[];
  students: PublicStudent[];
}

export const BehaviorTrendChart: React.FC<{ records: BehaviorRecord[] }> = ({ records }) => {
  const [granularity, setGranularity] = useState<'monthly' | 'weekly'>('monthly');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const series = useMemo(() => {
    if (granularity === 'monthly') {
      const buckets = [
        { key: '2026-09', label: 'Sep 2026' },
        { key: '2026-10', label: 'Okt 2026' },
        { key: '2026-11', label: 'Nov 2026' },
      ];
      return buckets.map((b) => {
        const monthRecs = records.filter((r) => r.occurredAt.startsWith(b.key));
        const violation = monthRecs
          .filter((r) => r.type === 'violation')
          .reduce((s, r) => s + r.points, 0);
        const achievement = monthRecs
          .filter((r) => r.type === 'achievement')
          .reduce((s, r) => s + r.points, 0);
        const count = monthRecs.length;
        return { ...b, violation, achievement, count };
      });
    }

    const weekRanges = [
      { key: 'W1', label: '1-15 Okt', start: '2026-10-01', end: '2026-10-15' },
      { key: 'W2', label: '16-31 Okt', start: '2026-10-16', end: '2026-10-31' },
      { key: 'W3', label: '1-10 Nov', start: '2026-11-01', end: '2026-11-10' },
      { key: 'W4', label: '11-20 Nov', start: '2026-11-11', end: '2026-11-20' },
      { key: 'W5', label: '21-30 Nov', start: '2026-11-21', end: '2026-11-30' },
    ];
    return weekRanges.map((w) => {
      const wRecs = records.filter(
        (r) => r.occurredAt >= w.start && r.occurredAt <= w.end
      );
      const violation = wRecs
        .filter((r) => r.type === 'violation')
        .reduce((s, r) => s + r.points, 0);
      const achievement = wRecs
        .filter((r) => r.type === 'achievement')
        .reduce((s, r) => s + r.points, 0);
      return { key: w.key, label: w.label, violation, achievement, count: wRecs.length };
    });
  }, [records, granularity]);

  const maxValue = useMemo(() => {
    const vals = series.flatMap((d) => [d.violation, d.achievement]);
    return Math.max(40, ...vals) * 1.15;
  }, [series]);

  const width = 620;
  const height = 230;
  const padLeft = 42;
  const padRight = 24;
  const padTop = 20;
  const padBottom = 34;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const getX = (idx: number) => {
    if (series.length <= 1) return padLeft + plotW / 2;
    return padLeft + (idx / (series.length - 1)) * plotW;
  };
  const getY = (val: number) => padTop + plotH - (val / maxValue) * plotH;

  const violationPath = series
    .map((d, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(idx)} ${getY(d.violation)}`)
    .join(' ');

  const achievementPath = series
    .map((d, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(idx)} ${getY(d.achievement)}`)
    .join(' ');

  const violationArea = `${violationPath} L ${getX(series.length - 1)} ${padTop + plotH} L ${getX(0)} ${padTop + plotH} Z`;
  const achievementArea = `${achievementPath} L ${getX(series.length - 1)} ${padTop + plotH} L ${getX(0)} ${padTop + plotH} Z`;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(maxValue * t));

  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="font-display font-semibold text-neutral-900 text-base">
            Grafik Perkembangan Perilaku Siswa
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Perbandingan akumulasi poin pelanggaran dan poin prestasi secara berkala
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-neutral-100 rounded-lg">
          <button
            type="button"
            onClick={() => setGranularity('monthly')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              granularity === 'monthly'
                ? 'bg-white text-neutral-900 shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Bulanan
          </button>
          <button
            type="button"
            onClick={() => setGranularity('weekly')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              granularity === 'weekly'
                ? 'bg-white text-neutral-900 shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Periodik Mingguan
          </button>
        </div>
      </div>

      <div className="flex items-center gap-5 text-xs text-neutral-600 mb-3">
        <span className="flex items-center gap-2">
          <span className="w-3 h-0.5 bg-orange-600 inline-block" />
          Poin Pelanggaran
        </span>
        <span className="flex items-center gap-2">
          <span className="w-3 h-0.5 bg-emerald-600 inline-block" />
          Poin Prestasi
        </span>
      </div>

      <div className="relative w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full min-w-[460px] h-auto"
          role="img"
          aria-label="Grafik perkembangan poin pelanggaran dan prestasi siswa"
        >
          {yTicks.map((tick) => {
            const y = getY(tick);
            return (
              <g key={tick}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke="#E5E5E5"
                  strokeDasharray="3 3"
                />
                <text
                  x={padLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-neutral-400 text-[10px] font-mono tabular-nums"
                >
                  {tick}
                </text>
              </g>
            );
          })}

          <path d={achievementArea} fill="#059669" fillOpacity="0.07" />
          <path d={violationArea} fill="#EA580C" fillOpacity="0.09" />

          <path
            d={achievementPath}
            fill="none"
            stroke="#059669"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={violationPath}
            fill="none"
            stroke="#EA580C"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {series.map((d, idx) => {
            const cx = getX(idx);
            const vy = getY(d.violation);
            const ay = getY(d.achievement);
            const isHovered = hoveredIdx === idx;
            return (
              <g
                key={d.key}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="cursor-pointer"
              >
                {isHovered && (
                  <line
                    x1={cx}
                    y1={padTop}
                    x2={cx}
                    y2={padTop + plotH}
                    stroke="#A3A3A3"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                )}
                <circle
                  cx={cx}
                  cy={vy}
                  r={isHovered ? 5.5 : 4}
                  fill="#FFFFFF"
                  stroke="#EA580C"
                  strokeWidth="2.5"
                />
                <circle
                  cx={cx}
                  cy={ay}
                  r={isHovered ? 5.5 : 4}
                  fill="#FFFFFF"
                  stroke="#059669"
                  strokeWidth="2.5"
                />
                <text
                  x={cx}
                  y={height - 10}
                  textAnchor="middle"
                  className="fill-neutral-500 text-[11px] font-medium"
                >
                  {d.label}
                </text>
                <rect
                  x={cx - 32}
                  y={padTop}
                  width="64"
                  height={plotH}
                  fill="transparent"
                />
              </g>
            );
          })}
        </svg>

        {hoveredIdx !== null && series[hoveredIdx] && (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-xs">
            <span className="font-semibold text-neutral-900">
              Periode {series[hoveredIdx].label}
            </span>
            <div className="flex items-center gap-4 font-mono tabular-nums">
              <span className="text-orange-700 font-medium">
                Pelanggaran: +{series[hoveredIdx].violation} poin
              </span>
              <span className="text-emerald-700 font-medium">
                Prestasi: +{series[hoveredIdx].achievement} poin
              </span>
              <span className="text-neutral-500">
                ({series[hoveredIdx].count} catatan)
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const ClassBehaviorChart: React.FC<BehaviorChartsProps> = ({ students, records }) => {
  const classSummary = useMemo(() => {
    const map = new Map<
      string,
      { className: string; avgIndex: number; violationPts: number; achievementPts: number; count: number }
    >();

    for (const s of students) {
      const current = map.get(s.className) || {
        className: s.className,
        avgIndex: 0,
        violationPts: 0,
        achievementPts: 0,
        count: 0,
      };
      current.avgIndex += s.behaviorIndex;
      current.violationPts += s.violationPoints;
      current.achievementPts += s.achievementPoints;
      current.count += 1;
      map.set(s.className, current);
    }

    return Array.from(map.values())
      .map((c) => ({
        ...c,
        avgIndex: Math.round(c.avgIndex / c.count),
      }))
      .sort((a, b) => a.avgIndex - b.avgIndex);
  }, [students]);

  const categoryBreakdown = useMemo(() => {
    const counts = new Map<string, { category: string; points: number; type: 'violation' | 'achievement' }>();
    for (const r of records) {
      const key = `${r.type}:${r.category}`;
      const prev = counts.get(key) || { category: r.category, points: 0, type: r.type };
      prev.points += r.points;
      counts.set(key, prev);
    }
    return Array.from(counts.values())
      .sort((a, b) => b.points - a.points)
      .slice(0, 5);
  }, [records]);

  const maxCatPts = Math.max(20, ...categoryBreakdown.map((c) => c.points));

  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-5 flex flex-col justify-between gap-6">
      <div>
        <h2 className="font-display font-semibold text-neutral-900 text-base">
          Indeks Disiplin per Kelas
        </h2>
        <p className="text-xs text-neutral-500 mt-0.5">
          Rata-rata indeks perilaku (skala 0–120) & distribusi kategori poin
        </p>

        <div className="mt-4 space-y-3">
          {classSummary.map((cls) => (
            <div key={cls.className} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-neutral-800">{cls.className}</span>
                <span className="font-mono tabular-nums text-neutral-600">
                  Indeks {cls.avgIndex} · Pelanggaran {cls.violationPts} · Prestasi {cls.achievementPts}
                </span>
              </div>
              <div className="h-2 w-full bg-neutral-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    cls.avgIndex < 70
                      ? 'bg-rose-600'
                      : cls.avgIndex < 90
                        ? 'bg-orange-500'
                        : 'bg-emerald-600'
                  }`}
                  style={{ width: `${Math.min(100, Math.round((cls.avgIndex / 120) * 100))}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-4 border-t border-neutral-100">
        <h3 className="text-xs font-semibold text-neutral-700 mb-3">
          Kategori Poin Terbanyak
        </h3>
        <div className="space-y-2.5">
          {categoryBreakdown.map((cat) => (
            <div key={`${cat.type}-${cat.category}`} className="flex items-center gap-3 text-xs">
              <span className="w-36 truncate text-neutral-600 shrink-0" title={cat.category}>
                {cat.category}
              </span>
              <div className="flex-1 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    cat.type === 'violation' ? 'bg-orange-600' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.round((cat.points / maxCatPts) * 100)}%` }}
                />
              </div>
              <span
                className={`font-mono tabular-nums font-medium w-14 text-right ${
                  cat.type === 'violation' ? 'text-orange-700' : 'text-emerald-700'
                }`}
              >
                {cat.type === 'violation' ? '-' : '+'}
                {cat.points}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
