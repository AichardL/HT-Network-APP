// Opportunity Index 评分权重与模型版本（唯一事实来源，供前端与后端共用）。
// 权重来自方案原文；调整时递增 model_version，并把变更记录到 AGENTS.md。

import type { ComponentKey } from '../scout-types';

export const OPPORTUNITY_WEIGHTS: Record<ComponentKey, number> = {
  transit: 0.35,
  commercial: 0.25,
  young: 0.15,
  resident: 0.15,
  tourism: 0.1,
};

export const MODEL_VERSION = 'gris-oi-v1';

export const SCORE_MIN = 28;
export const SCORE_MAX = 98;

/** 综合机会指数 = Σ(分量 × 权重) × 100，与方案 composeScore 同构。 */
export function opportunityIndex(components: Record<ComponentKey, number>): number {
  return Math.round(
    (OPPORTUNITY_WEIGHTS.transit * components.transit +
      OPPORTUNITY_WEIGHTS.commercial * components.commercial +
      OPPORTUNITY_WEIGHTS.young * components.young +
      OPPORTUNITY_WEIGHTS.resident * components.resident +
      OPPORTUNITY_WEIGHTS.tourism * components.tourism) *
      100
  );
}