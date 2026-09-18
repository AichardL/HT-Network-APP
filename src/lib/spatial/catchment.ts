// Catchment（Trade Area）真实空间聚合的诚实实现。
// 底层单位是固定网格（cells）+ 商圈影响点；圆 × 单元做面积交叠估计。
// 未接入真实 grid/POI 时用 Demo 影响面并如实标注 proxy，绝不线性乘法。

import type { ComponentKey, MarketCode, TradeAreaStats } from '../scout-types';
import { listDistricts } from '../scout';
import { gridNodes, nodeCell } from './cells';
import { thresholdKernel } from './decay';
import { distKm, overlapSamples, type Point } from './geometry';
import { proxyProvenance } from '../scoring/provenance';

const KEYS: ComponentKey[] = ['transit', 'commercial', 'young', 'resident', 'tourism'];

export interface CatchmentResult extends TradeAreaStats {
  market: MarketCode;
  lat: number;
  lng: number;
  cells: { id: string; lat: number; lng: number; popShare: number }[];
  availability: { layer: ComponentKey; status: string; note: string }[];
}

/**
 * 以任意点 (lat,lng) 为圆心、radiusKm 内的 catchment。
 * - population/traffic/commercial：以商圈影响点为源的核密度聚合（demo 面），
 *   未来接入口碑网格/POI 后替换为 real 层（格×圆交叠 + 计数）。
 * - 返回被覆盖网格单元（cells）供前端高亮，sampledCells = 网格单元数。
 */
export function catchment(market: MarketCode, pt: Point, radiusKm: number): CatchmentResult {
  const districts = listDistricts(market);
  let pop = 0, trf = 0, comp0 = 0, comm = 0;
  let covered = 0;
  for (const d of districts) {
    const dkm = distKm(pt, d);
    if (dkm > radiusKm) continue;
    const w = thresholdKernel(dkm, radiusKm);
    pop += d.metrics.population * w;
    trf += d.metrics.traffic * w;
    comp0 += d.metrics.competitors * w;
    comm += d.metrics.commercial * w;
    covered += w;
  }

  // 圆内网格单元（Demo 影响面承载，供前端高亮与「圆×格交叠」演示）
  const span = Math.max(0.05, radiusKm / 111);
  const bbox = {
    minLat: pt.lat - span,
    maxLat: pt.lat + span,
    minLng: pt.lng - span,
    maxLng: pt.lng + span,
  };
  const nodes = gridNodes(bbox);
  const cells = nodes
    .map((n) => ({ n, share: overlapSamples(pt, radiusKm, nodeCell(n)) }))
    .filter((c) => c.share > 0)
    .map((c) => ({ id: c.n.id, lat: c.n.lat, lng: c.n.lng, popShare: Math.round(c.share * 100) }));

  const onlyFew = districts.length <= 30;
  const method = onlyFew
    ? `以任意点(${pt.lat.toFixed(4)},${pt.lng.toFixed(4)})为圆心、${radiusKm}km 圆×${cells.length}个网格单元=${span.toFixed(2)}°边盖；当前基于 ${districts.length} 个商圈影响点的 Demo 面聚合，接入真实 grid/POI 后改为 real 层交叠`
    : `圆×网格交叠聚合 (radius=${radiusKm}km)`;

  return {
    market,
    lat: pt.lat,
    lng: pt.lng,
    radius: radiusKm,
    population: Math.round(pop),
    traffic: +(trf).toFixed(1),
    competitors: Math.round(comp0),
    commercial: Math.round(comm),
    method,
    sampledDistricts: districts.length,
    coveredRate: +Math.min(1, covered).toFixed(2),
    sampledCells: cells.length,
    proxy: true,
    cells,
    availability: KEYS.map((k) => {
      const p = proxyProvenance(k, market);
      return { layer: k, status: p.status, note: p.missing_note ?? '' };
    }),
  };
}