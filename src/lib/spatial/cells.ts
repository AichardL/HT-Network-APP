// 统一空间单元：固定经纬网格（后台 spatial index，H3 之前的诚实替代）。
// 当前无真实 H3 数据，用固定方格承载“圆×网格交叠”“bbox 懒加载”等几何流程；
// 接入 H3/真实数据后将单元换成 res9，接口不变（单元几何与 id 来源解耦）。

import { inPoly, type Bbox } from './geometry';

export interface GridNode {
  id: string;
  lat: number;
  lng: number;
}

/** 新加坡陆地包围盒（放大一点以容纳海岸线热面）。 */
export const SG_BBOX: Bbox = {
  minLat: 1.16,
  maxLat: 1.49,
  minLng: 103.58,
  maxLng: 104.1,
};
const SG_POLY: [number, number][] = [
  [1.47, 103.615], [1.455, 103.715], [1.466, 103.82], [1.44, 103.91],
  [1.36, 104.0], [1.31, 104.03], [1.25, 104.0], [1.21, 103.92],
  [1.19, 103.82], [1.21, 103.7], [1.25, 103.62], [1.32, 103.59],
  [1.42, 103.59],
];

/**
 * 在 bbox 内生成固定可见网格（仅在陆地内）。step 为经纬度步长（概略 0.0015°≈150m）。
 * 仅生成与当前视野相交的节点，避免一次性全城网格。
 */
export function gridNodes(bbox: Bbox, step = 0.0015, landOnly = true): GridNode[] {
  const nodes: GridNode[] = [];
  for (let la = bbox.minLat; la <= bbox.maxLat; la += step) {
    for (let lo = bbox.minLng; lo <= bbox.maxLng; lo += step) {
      if (landOnly && !inPoly({ lat: la, lng: lo }, SG_POLY)) continue;
      nodes.push({
        id: `${la.toFixed(4)}_${lo.toFixed(4)}`,
        lat: +la.toFixed(4),
        lng: +lo.toFixed(4),
      });
    }
  }
  return nodes;
}

/** 网格单元矩形（用于圆×单元交叠采样）。 */
export function nodeCell(node: GridNode, step = 0.0015) {
  return {
    minLat: node.lat - step / 2,
    maxLat: node.lat + step / 2,
    minLng: node.lng - step / 2,
    maxLng: node.lng + step / 2,
  };
}