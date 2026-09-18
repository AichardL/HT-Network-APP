import { getDb } from './db';
import type { District, GridCell, Market, Candidate } from './scout-types';

// scout 服务层：新加坡（主力，可扩展 HK/BKK/KUL）选址考察的数据访问与网格/评分计算。

const THEMES = ['overall', 'transit', 'commercial', 'young', 'resident', 'tourism'] as const;
export type Theme = (typeof THEMES)[number];
export type { District, GridCell, Market, Candidate };

export function listMarkets(): Market[] {
  return getDb().prepare('SELECT * FROM markets ORDER BY code').all() as unknown as Market[];
}

export function listDistricts(market: string): District[] {
  const rows = getDb()
    .prepare(
      'SELECT * FROM scout_districts WHERE market_code=? ORDER BY rank'
    )
    .all(market) as unknown as Record<string, unknown>[];
  return rows.map(parseRow);
}

export function getDistrict(market: string, key: string): District | null {
  const row = getDb()
    .prepare('SELECT * FROM scout_districts WHERE market_code=? AND area_key=?')
    .get(market, key) as Record<string, unknown> | undefined;
  return row ? parseRow(row) : null;
}

function parseRow(r: Record<string, unknown>): District {
  return {
    area_key: r.area_key as string,
    name: r.name as string,
    district_type: r.district_type as string,
    region: r.region as string,
    lat: r.lat as number,
    lng: r.lng as number,
    components: JSON.parse(r.components as string),
    metrics: JSON.parse(r.metrics as string),
    audience: JSON.parse(r.audience as string),
    confidence: r.confidence as string,
    sources: JSON.parse(r.sources as string),
    evidence: JSON.parse(r.evidence as string),
    rank: r.rank as number,
    active_score: r.active_score as number,
  };
}

// ---------------- 网格生成（数据网格 / 热力底） ----------------
// 用商圈自身指标作为影响源，做高斯平滑，得到全城连续得分面；
// 返回经纬度 + 主题打分。SG 按真实陆地多边形裁剪，HK 用包围盒。

interface Hub {
  lat: number;
  lng: number;
  values: Record<Theme, number>;
}

function districtAsHub(d: District): Hub {
  const values: Record<Theme, number> = {
    overall: d.active_score / 100,
    transit: d.components.transit,
    commercial: d.components.commercial,
    young: d.components.young,
    resident: d.components.resident,
    tourism: d.components.tourism,
  };
  return { lat: d.lat, lng: d.lng, values };
}

const SG_POLY: [number, number][] = [
  [1.47, 103.615], [1.455, 103.715], [1.466, 103.82], [1.44, 103.91],
  [1.39, 104.02], [1.315, 104.03], [1.25, 103.96], [1.22, 103.85],
  [1.246, 103.748], [1.31, 103.63],
];

function inPoly(lat: number, lng: number, poly: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const yi = poly[i][0], xi = poly[i][1], yj = poly[j][0], xj = poly[j][1];
    const hit = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (hit) inside = !inside;
  }
  return inside;
}

const THEME_LABEL: Record<Theme, string> = {
  overall: '综合活跃度',
  transit: '交通人流',
  commercial: '商业密度',
  young: '年轻客群',
  resident: '社区消费',
  tourism: '游客潜力',
};

export function generateGrid(market: string, theme: Theme): GridCell[] {
  const districts = listDistricts(market);
  const hubs = districts.map(districtAsHub);
  if (!hubs.length) return [];

  const isSG = market === 'SG';
  const step = isSG ? 0.011 : 0.02;
  const lngStep = isSG ? 0.012 : 0.02;
  const latMin = isSG ? 1.22 : 22.2;
  const latMax = isSG ? 1.47 : 22.55;
  const lngMin = isSG ? 103.615 : 113.85;
  const lngMax = isSG ? 104.025 : 114.35;

  const cells: GridCell[] = [];
  let row = 0;
  for (let lat = latMin; lat <= latMax; lat += step, row++) {
    const lngStart = lngMin + (row % 2 ? lngStep / 2 : 0);
    for (let lng = lngStart; lng <= lngMax; lng += lngStep) {
      if (isSG && !inPoly(lat, lng, SG_POLY)) continue;
      let best = 0;
      let sum = 0;
      let nearDist = Infinity;
      let near = '';
      for (let hi = 0; hi < hubs.length; hi++) {
        const h = hubs[hi];
        const dx = (lng - h.lng) * 104;
        const dy = (lat - h.lat) * 111;
        const d = Math.hypot(dx, dy);
        const influence = Math.exp(-(d * d) / (2 * 5 * 5)) * h.values[theme];
        if (influence > best) best = influence;
        sum += influence * 0.2;
        if (d < nearDist) {
          nearDist = d;
          near = districts[hi].area_key;
        }
      }
      if (best < 0.05 && sum < 0.03) continue;
      const val = Math.round(Math.max(28, Math.min(98, 30 + 62 * Math.min(1, best + sum))));
      cells.push({ lat: +lat.toFixed(4), lng: +lng.toFixed(4), val, near });
    }
  }
  return cells;
}

// ---------------- 候选点工作流 ----------------
export function listCandidates(market: string): Candidate[] {
  return getDb()
    .prepare('SELECT * FROM candidates WHERE market_code=? ORDER BY saved_at DESC')
    .all(market) as unknown as Candidate[];
}

export function saveCandidate(inp: {
  market_code: string;
  area_key: string;
  name: string;
  lat: number;
  lng: number;
  note: string;
  created_by: string;
}): Candidate {
  const saved_at = Date.now();
  const info = getDb()
    .prepare(
      'INSERT INTO candidates (market_code,area_key,name,lat,lng,note,created_by,saved_at) VALUES (?,?,?,?,?,?,?,?)'
    )
    .run(inp.market_code, inp.area_key, inp.name, inp.lat, inp.lng, inp.note, inp.created_by, saved_at);
  return { id: Number(info.lastInsertRowid), ...inp, saved_at };
}

export function deleteCandidate(id: number): void {
  getDb().prepare('DELETE FROM candidates WHERE id=?').run(id);
}

export function themeLabel(t: Theme): string {
  return THEME_LABEL[t] || t;
}

// 打分公式（方案原文）
export function composeScore(c: Record<string, number>): number {
  return Math.round((0.35 * c.transit + 0.25 * c.commercial + 0.15 * c.young + 0.15 * c.resident + 0.1 * c.tourism) * 100);
}