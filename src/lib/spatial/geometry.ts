// 空间几何工具：经纬度距离、bbox、点在多边形内、圆×网格交叠。

export interface Point {
  lat: number;
  lng: number;
}
export type Bbox = { minLat: number; minLng: number; maxLat: number; maxLng: number };

/** 近似平面距离（km）：经度 ×104km/度，纬度 ×111km/度（新加坡/香港尺度够用）。 */
export function distKm(a: Point, b: Point): number {
  const dx = (b.lng - a.lng) * 104;
  const dy = (b.lat - a.lat) * 111;
  return Math.hypot(dx, dy);
}

/** 某点是否在圆内（半径 km）。 */
export function inCircle(center: Point, rKm: number, p: Point): boolean {
  return distKm(center, p) <= rKm;
}

/** 点在多边形内（射线法，用于 SG 陆地裁剪）。 */
export function inPoly(p: Point, poly: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][1], yi = poly[i][0];
    const xj = poly[j][1], yj = poly[j][0];
    const intersect =
      yi > p.lat !== yj > p.lat && p.lng < ((xj - xi) * (p.lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

// ---- 圆 与 矩形网格单元 交叠（用于 population grid × 圆 面积聚合） ----
// 用单元内稀疏采样估计交叠比例，避免圆/矩形解析交叠的复杂度与不稳定。

const SAMPLE_STEP = 0.0009; // ≈100m，采样点间距

/** 返回矩形单元内落在圆中的估计采样点数量（用于面积比例）。 */
export function overlapSamples(
  center: Point,
  rKm: number,
  cell: { minLat: number; maxLat: number; minLng: number; maxLng: number }
): number {
  const latStep = SAMPLE_STEP;
  const lngStep = SAMPLE_STEP;
  let inside = 0;
  let total = 0;
  for (let la = cell.minLat; la <= cell.maxLat; la += latStep) {
    for (let lo = cell.minLng; lo <= cell.maxLng; lo += lngStep) {
      total++;
      if (distKm(center, { lat: la, lng: lo }) <= rKm) inside++;
    }
  }
  return total === 0 ? 0 : inside / total;
}

export function bboxOf(points: { lat: number; lng: number }[], pad = 0): Bbox {
  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
  for (const p of points) {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lng < minLng) minLng = p.lng;
    if (p.lng > maxLng) maxLng = p.lng;
  }
  return { minLat: minLat - pad, maxLat: maxLat + pad, minLng: minLng - pad, maxLng: maxLng + pad };
}