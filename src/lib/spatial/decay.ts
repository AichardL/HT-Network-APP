// 距离衰减模型：把「点影响源（站点/商圈/网格）」摊成连续强度面。
// 统一两套衰减：高斯（生成平滑面/热力）+ 阈值核（Trade Area 圆聚合）。

import { distKm, type Point } from './geometry';

export interface InfluenceSource<T> extends Point {
  value: number;
  data?: T;
}

/** 高斯衰减权重：exp(-d²/2σ²)。σ 单位 km。 */
export function gaussianWeight(dKm: number, sigmaKm: number): number {
  return Math.exp(-(dKm * dKm) / (2 * sigmaKm * sigmaKm));
}

/** 阈值核权重：(1 - d/R)²，d>R 记 0。用于 catchment 圆聚合。 */
export function thresholdKernel(dKm: number, rKm: number): number {
  return dKm > rKm ? 0 : Math.pow(1 - dKm / rKm, 2);
}

/**
 * 对某点求所有影响源的高斯叠加（max 取最强、sum×taper 加背景），
 * 与旧 generateGrid 的「best + sum*0.2」保持等价，但剥离主题概念、纯量化。
 */
export function gaussianField<T>(
  point: Point,
  sources: InfluenceSource<T>[],
  sigmaKm: number
): { value: number; best: number; sum: number; nearest?: InfluenceSource<T> } {
  let best = 0;
  let sum = 0;
  let nearestDist = Infinity;
  let nearest: InfluenceSource<T> | undefined;
  for (const s of sources) {
    const d = distKm(point, s);
    if (d < nearestDist) {
      nearestDist = d;
      nearest = s;
    }
    const w = gaussianWeight(d, sigmaKm);
    const inf = w * s.value;
    if (inf > best) best = inf;
    sum += inf * 0.2;
  }
  return { value: best + sum, best, sum, nearest };
}

/** 把连续 [0,∞) 强度映射到 [SCORE_MIN, SCORE_MAX]。 */
export function normalizeIntensity(v: number, targetMax: number): number {
  const t = Math.min(1, v / targetMax);
  return Math.round(28 + 70 * t);
}