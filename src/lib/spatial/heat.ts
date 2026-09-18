// Street Heat：连续街道级热面。按当前视野（bbox + zoom）懒加载，带宽随 zoom 变化。
// 数据来源分层：已接入真实点源（站点/POI/客流网格）→ provider=real；
// 未接入（沙箱默认）→ 以商圈影响源做高斯扩散，provider=demo，绝不冒充 real。

import type { ComponentKey, HeatPoint, MarketCode } from '../scout-types';
import { listDistricts } from '../scout';
import { gridNodes, type GridNode } from './cells';
import { gaussianField, type InfluenceSource } from './decay';
import { type Bbox } from './geometry';

function hubValueOf(d: { active_score: number; components: Record<ComponentKey, number> }, theme: string): number {
  const comp = d.components[theme as ComponentKey];
  if (comp != null) return comp;
  return d.active_score / 100;
}

/** 从商圈构建影响源（theme 分值）。仅 Demo：真实层接入后用真实点源替换。 */
export function districtSources(market: MarketCode, theme: string): InfluenceSource<string>[] {
  return listDistricts(market).map((d) => ({
    lat: d.lat,
    lng: d.lng,
    value: hubValueOf(d, theme),
    data: d.name,
  }));
}

/** 按 zoom 决定高斯带宽：越放大 sigma 越小，街道级差异越锐利。 */
export function bandwidthForZoom(zoom: number): number {
  if (zoom <= 9) return 5.0;      // 全城
  if (zoom <= 11) return 3.0;
  if (zoom <= 13) return 1.5;
  if (zoom <= 15) return 0.8;
  return 0.4;                      // 街道级
}

/**
 * 生成当前视野的连续热面点。
 * @param bbox  当前视野
 * @param zoom  Leaflet zoom（决定带宽）
 * @param theme 主题：overall / transit / commercial / young / resident / tourism
 */
export function heatFor(
  market: MarketCode,
  bbox: Bbox,
  zoom: number,
  theme: string
): { points: HeatPoint[]; provider: 'real' | 'demo'; bandwidth: number; count: number } {
  // 真实层接入点（当前无 key → 空）
  const realSources: InfluenceSource<unknown>[] = [];
  const demoSources = districtSources(market, theme);

  const sources = realSources.length ? realSources : demoSources;
  const provider: 'real' | 'demo' = realSources.length ? 'real' : 'demo';
  const sigma = bandwidthForZoom(zoom);

  const nodes: GridNode[] = gridNodes(bbox);
  // 在视野内稀疏采样：阶段油价按 zoom 减小步长，街道级取更密采样
  const step = zoom >= 14 ? 0.0009 : zoom >= 12 ? 0.0012 : 0.0015;
  const sparse = nodes.filter((_, i) => Math.floor(i / Math.ceil(step / 0.0015)) === i);

  const points: HeatPoint[] = sparse.map((n) => {
    const f = gaussianField(n, sources, sigma);
    return {
      lat: n.lat,
      lng: n.lng,
      intensity: Math.min(1, f.value),
      provider,
    };
  });

  return { points, provider, bandwidth: sigma, count: points.length };
}