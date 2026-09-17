'use client';

import { useMemo } from 'react';

export interface CanvasSite {
  id: number;
  name_zh: string;
  site_type: string;
  x: number;
  y: number;
  peak_flow: number;
  tea_affinity: number;
  score?: number;
  role?: string;
  selected?: boolean;
}

export interface DistrictBlob {
  name: string;
  siteIds: number[];
  centroidX: number;
  centroidY: number;
}

function convexHull(pts: { x: number; y: number }[]): { x: number; y: number }[] {
  if (pts.length <= 2) return pts;
  const sorted = [...pts].sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (o: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower: typeof sorted = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: typeof sorted = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

function flowColor(v: number, max: number): string {
  const t = max ? Math.max(0, Math.min(1, v / max)) : 0.3;
  // 琥珀色由浅到深：低 Al(低) → 高 E0A458(深琥珀)
  const r = Math.round(224);
  const alpha = (0.22 + t * 0.78).toFixed(2);
  return `rgba(224,164,88,${alpha})`;
}

interface Props {
  sites: CanvasSite[];
  districts?: DistrictBlob[];
  mode?: 'flow' | 'score';
  height?: number;
}

export function PlanCanvas({ sites, districts = [], mode = 'flow', height = 480 }: Props) {
  const maxFlow = useMemo(() => Math.max(...sites.map((s) => s.peak_flow), 1), [sites]);
  const polygons = useMemo(() => {
    return districts
      .map((d) => {
        const pts = sites.filter((s) => d.siteIds.includes(s.id)).map((s) => ({ x: s.x, y: s.y }));
        if (pts.length < 3) return null;
        return { name: d.name, hull: convexHull(pts) };
      })
      .filter((x): x is { name: string; hull: { x: number; y: number }[] } => x !== null);
  }, [districts, sites]);

  return (
    <svg
      viewBox="0 0 100 100"
      className="gris-canvas w-full rounded-lg border border-border"
      style={{ height }}
      preserveAspectRatio="xMidYMid meet"
    >
      {/* 商圈边界多边形 */}
      {polygons.map((p, i) => (
        <g key={i}>
          <polygon
            points={p.hull.map((h) => `${h.x},${h.y}`).join(' ')}
            fill="rgba(224,164,88,0.12)"
            stroke="#e0a458"
            strokeWidth="0.35"
            strokeDasharray="1.4 1"
          />
          <text x={p.hull[0].x} y={p.hull[0].y - 1.5} fill="#e0a458" fontSize="2.2">
            {p.name}
          </text>
        </g>
      ))}

      {/* 点位 */}
      {sites.map((s) => {
        const metric = mode === 'score' ? s.score ?? s.peak_flow : s.peak_flow;
        const scaled = mode === 'score' ? (s.score ?? 0) / 100 : metric / maxFlow;
        const r = 0.6 + scaled * 1.7;
        const fill = mode === 'score' ? '#93b27b' : flowColor(metric, maxFlow);
        const stroke = s.selected ? '#f2efe8' : s.role ? '#f2efe8' : 'rgba(16,16,20,0.6)';
        const sw = s.selected || s.role ? 0.7 : 0.3;
        return (
          <g key={s.id}>
            <circle cx={s.x} cy={s.y} r={r + (s.selected ? 0.8 : 0)} fill="none" stroke="#e0a458" strokeWidth={s.selected ? 0.5 : 0} />
            <circle cx={s.x} cy={s.y} r={r} fill={fill} stroke={stroke} strokeWidth={sw} />
            {s.role && (
              <text x={s.x} y={s.y - r - 0.8} textAnchor="middle" fill="#f2efe8" fontSize="2">
                {s.role === 'FLAGSHIP' ? '旗舰' : s.role === 'PREMIUM' ? '优选' : '标准'}
              </text>
            )}
            {s.selected && (
              <text x={s.x} y={s.y + r + 2.4} textAnchor="middle" fill="#a7a29a" fontSize="1.8">
                {s.name_zh}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}