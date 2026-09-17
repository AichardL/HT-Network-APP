import { listSites, listZones, siteFlowSummary, customerByZone } from './repo';
import type { Site, Zone } from './repo';

// ---------- 商圈划定：基于人流阈值 + 密度聚类的边界划分 ----------
export interface DistrictParams {
  flowThreshold: number; // 高峰人流阈值
  minSites: number; // 最少点位数
}

export interface DistrictResult {
  name: string;
  zoneName: string;
  siteIds: number[];
  avgPeakFlow: number;
  avgAffinity: number;
  siteCount: number;
  centroidX: number;
  centroidY: number;
}

export function delineateDistricts(marketCode: string, params: DistrictParams): DistrictResult[] {
  const sites = listSites(marketCode);
  const flow = siteFlowSummary(marketCode);
  const zones = listZones(marketCode);
  const zoneOf = new Map<number, Zone>();
  for (const z of zones) zoneOf.set(z.id, z);
  const custOf = new Map<number, { tea_affinity: number }>();
  for (const c of customerByZone(zones.map((z) => z.id)))
    custOf.set(c.zone_id as number, c as unknown as { tea_affinity: number });

  // 1) 选出达标点位
  const seeds = sites.filter((s) => (flow[s.id] ?? 0) >= params.flowThreshold);

  // 2) 按空间近邻聚类（归一坐标欧氏距离），缓解同商圈重叠
  const radius = 8.5;
  const visited = new Set<number>();
  const clusters: Site[][] = [];
  for (const seed of seeds) {
    if (visited.has(seed.id)) continue;
    const stack = [seed];
    const cluster: Site[] = [];
    visited.add(seed.id);
    while (stack.length) {
      const cur = stack.pop()!;
      cluster.push(cur);
      for (const other of seeds) {
        if (visited.has(other.id)) continue;
        const dx = cur.x - other.x;
        const dy = cur.y - other.y;
        if (dx * dx + dy * dy <= radius * radius) {
          visited.add(other.id);
          stack.push(other);
        }
      }
    }
    if (cluster.length >= params.minSites) clusters.push(cluster);
  }

  return clusters.map((cluster, i) => {
    const xs = cluster.reduce((a, s) => a + s.x, 0) / cluster.length;
    const ys = cluster.reduce((a, s) => a + s.y, 0) / cluster.length;
    const flows = cluster.map((s) => flow[s.id] ?? 0);
    const aa = cluster.map((s) => custOf.get(s.zone_id)?.tea_affinity ?? 0.4);
    const zone = cluster.length ? zoneOf.get(cluster[0].zone_id) : undefined;
    return {
      name: `商圈${String(i + 1).padStart(2, '0')} · ${zone?.name_zh ?? marketCode}`,
      zoneName: zone?.name_zh ?? '',
      siteIds: cluster.map((s) => s.id),
      avgPeakFlow: Math.round(flows.reduce((a, b) => a + b, 0) / flows.length),
      avgAffinity: +(aa.reduce((a, b) => a + b, 0) / aa.length).toFixed(2),
      siteCount: cluster.length,
      centroidX: +xs.toFixed(2),
      centroidY: +ys.toFixed(2),
    };
  });
}

// ---------- 精准选址：多因子综合评分 ----------
export interface ScoreWeights {
  flow: number; // 人流密度
  customerFit: number; // 目标客群匹配（客群特征）
  affordability: number; // 租金可承受
  competition: number; // 竞争密度
}

export interface ScoredSite {
  id: number;
  name_zh: string;
  site_type: string;
  x: number;
  y: number;
  sqm: number;
  monthly_rent: number;
  competitor_count: number;
  peak_flow: number;
  tea_affinity: number;
  income_high: number;
  score: number;
  role: string;
  reasons: string[];
}

function norm(arr: number[]): number[] {
  const mx = Math.max(...arr, 1e-6);
  const mn = Math.min(...arr);
  const span = mx - mn || 1;
  return arr.map((v) => (v - mn) / span);
}

export function scoreSites(
  marketCode: string,
  w: ScoreWeights,
  flowThreshold = 0,
): ScoredSite[] {
  const sites = listSites(marketCode);
  const flow = siteFlowSummary(marketCode);
  const zones = listZones(marketCode);
  const zoneIds = zones.map((z) => z.id);
  const custOf = new Map<number, { tea_affinity: number; income_high_share: number }>();
  for (const c of customerByZone(zoneIds))
    custOf.set(c.zone_id as number, c as unknown as { tea_affinity: number; income_high_share: number });

  const peak = sites.map((s) => flow[s.id] ?? 0);
  const rents = sites.map((s) => s.monthly_rent);
  const comp = sites.map((s) => s.competitor_count);
  const aff = sites.map((s) => custOf.get(s.zone_id)?.tea_affinity ?? 0.4);
  const inc = sites.map((s) => custOf.get(s.zone_id)?.income_high_share ?? 0.3);
  const nPeak = norm(peak);
  const nRentInv = norm(rents.map((v) => -v));
  const nCompInv = norm(comp.map((v) => -v));
  const nFit = norm(aff.map((a, i) => (a + inc[i]) / 2));

  const wSum = Math.max(w.flow + w.customerFit + w.affordability + w.competition, 1e-6);
  const out: ScoredSite[] = [];
  sites.forEach((s, i) => {
    const score =
      (w.flow * nPeak[i] + w.customerFit * nFit[i] + w.affordability * nRentInv[i] + w.competition * nCompInv[i]) /
      wSum;
    if (score * 1000 < flowThreshold) return;
    out.push({
      id: s.id,
      name_zh: s.name_zh,
      site_type: s.site_type,
      x: s.x,
      y: s.y,
      sqm: s.sqm,
      monthly_rent: s.monthly_rent,
      competitor_count: s.competitor_count,
      peak_flow: peak[i],
      tea_affinity: +(aff[i]).toFixed(2),
      income_high: +(inc[i]).toFixed(2),
      score: +(score * 100).toFixed(1),
      role: '',
      reasons: buildReasons(s, peak[i], aff[i], inc[i], nPeak[i], nFit[i], nRentInv[i], nCompInv[i]),
    });
  });
  out.sort((a, b) => b.score - a.score);
  return out;
}

function buildReasons(
  s: Site,
  peak: number,
  aff: number,
  inc: number,
  nPeak: number,
  nFit: number,
  nRent: number,
  nComp: number,
): string[] {
  const r: string[] = [];
  if (nPeak >= 0.7) r.push('高峰人流位居前列');
  if (aff >= 0.65) r.push('客群茶饮偏好强');
  if (inc >= 0.55) r.push('高消费客群占比高');
  if (nRent >= 0.7) r.push('租金性价比优');
  if (nComp <= 0.3) r.push('周边竞争密度低');
  if (s.site_type === 'MALL' || s.site_type === 'MTR') r.push(`${s.site_type} 导流强劲`);
  if (r.length === 0) r.push('核心指标均衡');
  void peak;
  return r.slice(0, 4);
}

// ---------- 项目规划：带最小间距约束的网络布点 ----------
export interface PlanParams {
  targetStores: number;
  strategy: 'EXPANSION' | 'PENETRATION' | 'PREMIUM';
  minSpacing: number; // 归一坐标下的最小间距
}

export interface PlanOutput {
  projectName: string;
  strategy: string;
  targetStores: number;
  chosen: (ScoredSite & { role: string; rank: number })[];
  rejected: ScoredSite[];
  coverage: number;
}

export function planNetwork(
  marketCode: string,
  p: PlanParams,
): PlanOutput {
  const w: ScoreWeights =
    p.strategy === 'PREMIUM'
      ? { flow: 0.3, customerFit: 0.45, affordability: 0.15, competition: 0.1 }
      : p.strategy === 'PENETRATION'
        ? { flow: 0.4, customerFit: 0.3, affordability: 0.2, competition: 0.1 }
        : { flow: 0.45, customerFit: 0.25, affordability: 0.2, competition: 0.1 };

  const ranked = scoreSites(marketCode, w);
  const chosen: PlanOutput['chosen'] = [];
  const rejected: ScoredSite[] = [];
  const spacing = p.minSpacing;
  for (const site of ranked) {
    if (chosen.length >= p.targetStores) break;
    const tooClose = chosen.some((c) => {
      const dx = c.x - site.x;
      const dy = c.y - site.y;
      return dx * dx + dy * dy < spacing * spacing;
    });
    if (tooClose) {
      rejected.push(site);
      continue;
    }
    chosen.push({ ...site, role: assignRole(chosen.length, p.strategy, site), rank: chosen.length + 1 });
  }
  const coverage = chosen.length / Math.max(p.targetStores, 1);
  const projectName =
    marketCode === 'HK' ? '香港门店网络规划' : '新加坡门店网络规划';
  return { projectName, strategy: p.strategy, targetStores: p.targetStores, chosen, rejected, coverage: +coverage.toFixed(2) };
}

function assignRole(index: number, strategy: string, site: ScoredSite): string {
  if (index === 0) return 'FLAGSHIP';
  if (strategy === 'PREMIUM' && site.tea_affinity >= 0.6) return 'FLAGSHIP';
  if (index < 3) return 'PREMIUM';
  return 'STANDARD';
}