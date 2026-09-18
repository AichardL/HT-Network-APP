// 真实数据源注册表：声明每个数据层当前是否已接入真实源。
// 沙箱默认无 key → 全部 unavailable；仅在配置对应 key 后由 adapter 把 status 翻成 real。
// 原则：绝不把 unavailable/proxy 标成 real。

import type { MarketCode } from '../scout-types';

export interface SourceSlice {
  layer: string;
  status: 'real' | 'unavailable';
  source_name: string;
  future_source: string;
  env_key?: string;
  note: string;
}

const SG: SourceSlice[] = [
  { layer: 'population', status: 'unavailable', source_name: 'SingStat / OneMap', future_source: 'SingStat Census population grid', env_key: 'GRIS_ONEMAP_TOKEN', note: '未配置 OneMap token，当前为 Demo 代理人口面' },
  { layer: 'transit', status: 'unavailable', source_name: 'LTA DataMall', future_source: 'LTA Passenger Volume by Station', env_key: 'GRIS_LTA_ACCOUNT_KEY', note: '未配置 LTA account key，站点客流为 Demo' },
  { layer: 'poi', status: 'unavailable', source_name: 'OneMap / OSM', future_source: 'OneMap POI / OSM', env_key: 'GRIS_ONEMAP_TOKEN', note: '未配置 POI 源，演示分级 POI' },
  { layer: 'competitors', status: 'unavailable', source_name: 'Google Places', future_source: 'Google Places Nearby Search', env_key: 'GOOGLE_PLACES_API_KEY', note: '未配置 GOOGLE_PLACES_API_KEY，返回 demo 竞品' },
];

const HK: SourceSlice[] = [
  { layer: 'population', status: 'unavailable', source_name: '政府统计处', future_source: '人口普查网格', note: '待接入香港官方人口网格' },
  { layer: 'transit', status: 'unavailable', source_name: 'MTR / 运输署', future_source: 'MTR ridership', note: '待接入港铁客流' },
  { layer: 'poi', status: 'unavailable', source_name: '规划署 / OSM', future_source: '规划署 POI', note: '待接入 POI' },
  { layer: 'competitors', status: 'unavailable', source_name: 'Google Places', future_source: 'Google Places Nearby Search', env_key: 'GOOGLE_PLACES_API_KEY', note: '未配置 GOOGLE_PLACES_API_KEY' },
];

export function sourceRegistry(market: MarketCode): SourceSlice[] {
  return market === 'SG' ? SG.slice() : HK.slice();
}

/** 当前已接入真实数据的层名（用于 data-status 返回与前端角标）。 */
export function liveLayers(market: MarketCode): string[] {
  return sourceRegistry(market)
    .filter((s) => s.status === 'real' || (s.env_key && process.env[s.env_key]))
    .map((s) => s.layer);
}