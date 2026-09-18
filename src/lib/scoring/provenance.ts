// 数据血缘（Data Provenance）与 DATA_MODE。
// 诚实优先：沙箱无真实 key 时，所有层 status=unavailable/proxy（DEMO 模式），
// 绝不把「商圈类型预设值 + 确定性扰动」标成官方统计。真实 key 接入后翻转 status=real。

import type { ComponentKey, DataProvenance, DataStatus, MarketCode } from '../scout-types';
import { MODEL_VERSION } from './config';

export type DataMode = 'truth' | 'demo';

const DEMO_MODE = (process.env.DATA_MODE ?? 'demo') === 'truth' ? 'truth' : 'demo';

export function dataMode(): DataMode {
  return DEMO_MODE;
}

/** 某一层是否已接入真实数据（由对应 adapter 的 enabled() 决定）。 */
export type LayerStatus =
  | 'real'
  | 'unavailable'
  | 'proxy';

export interface LayerAvailability {
  key: ComponentKey | 'population' | 'poi' | 'competitors' | 'transit';
  status: LayerStatus;
  source_name: string;
  /** 当前沙箱未配置 key 时的诚实缺失说明 */
  missing_note?: string;
}

const LAYER_PLANS: Record<
  string,
  { source_name: string; futureSource: string; plan: string }
> = {
  SG_transit: { source_name: 'LTA DataMall', futureSource: 'LTA Passenger Volume by Station', plan: 'MRT 站点进出口客流接入后再按站衰减' },
  SG_population: { source_name: 'SingStat / OneMap', futureSource: 'SingStat Census population grid', plan: '人口网格（grid×圆交叠）' },
  SG_poi: { source_name: 'OneMap / OSM', futureSource: 'OneMap POI / OSM', plan: 'POI 落点聚合' },
  SG_competitors: { source_name: 'Google Places', futureSource: 'Google Places Nearby Search', plan: '茶饮/咖啡/烘焙/轻餐竞品' },
  HK_transit: { source_name: 'MTR / 运输署', futureSource: 'MTR ridership', plan: '港铁站客流' },
  HK_population: { source_name: '政府统计处', futureSource: '人口普查网格', plan: '人口网格' },
  HK_poi: { source_name: '规划署 / OSM', futureSource: '规划署 POI', plan: 'POI 落点聚合' },
  HK_competitors: { source_name: 'Google Places', futureSource: 'Google Places Nearby Search', plan: '茶饮等竞品' },
};

/** 当前沙箱可运行（无网络 key 也能构造诚实分层状态）。 */
export function layerAvailability(market: MarketCode): LayerAvailability[] {
  const sg = market === 'SG';
  const transitKey = sg ? 'LTA DataMall' : 'MTR / 运输署';
  return [
    {
      key: 'transit',
      status: 'unavailable',
      source_name: transitKey,
      missing_note: `未配置数据源 key：本层当前为 unavailable，仅按商圈类型预设值生成 Demo 代理面`,
    },
    {
      key: 'population',
      status: 'unavailable',
      source_name: sg ? 'SingStat / OneMap' : '政府统计处',
      missing_note: '未配置人口网格数据源，当前为 Demo 代理',
    },
    {
      key: 'poi',
      status: 'unavailable',
      source_name: sg ? 'OneMap / OSM' : '规划署 / OSM',
      missing_note: '未配置 POI 数据源，当前为演示分级 POI',
    },
    {
      key: 'competitors',
      status: 'unavailable',
      source_name: 'Google Places',
      missing_note: '未配置 GOOGLE_PLACES_API_KEY，当前返回 demo 分级竞品（real:false）',
    },
  ];
}

/** 构造某一 component 的诚实 Provenance。 */
export function proxyProvenance(
  key: ComponentKey,
  market: MarketCode,
  extra?: Partial<DataProvenance>
): DataProvenance {
  const sg = market === 'SG';
  const plan = LAYER_PLANS[`${sg ? 'SG' : 'HK'}_${key}`] ?? LAYER_PLANS[sg ? 'SG_poi' : 'HK_poi'];
  return {
    status: 'proxy',
    source_name: plan.source_name,
    source_date: '',
    data_version: MODEL_VERSION,
    method: '商圈类型预设值 + 确定性扰动（Demo）',
    spatial_granularity: '商圈中心点',
    confidence_score: 0.3,
    confidence_reason: '演示/代理成效层，无官方统计支撑，不可据此投资',
    missing_note: `未接入 ${plan.futureSource}；接入后把 status 改为 real 并填 actualSource`,
    ...extra,
  };
}